// Spike S1 (A23): Jev 1.14 Decisions capture. Run (in app/):
//   LLM_MODEL=openai/gpt-6-luna node --conditions=react-server --env-file=.env.local --import tsx scripts/spikes/s1-jev.ts
// Uses the production question sets, so the captures match what the adapter sends.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

import { buildScreeningQuestions, buildStateText } from "../../src/server/ai/screening/questions";

const OUT = join(process.cwd(), "tests/fixtures/captures");
const IMG = join(process.cwd(), "../assets/example-images");
const URL_DEC = "https://openrouter.ai/api/alpha/decisions";
const MODEL = "typesafe/jev-1.14";
const key = process.env.OPENROUTER_API_KEY ?? "";
if (!key) throw new Error("OPENROUTER_API_KEY missing");

async function dataUrl(file: string): Promise<string> {
  const out = await sharp(readFileSync(join(IMG, file)))
    .rotate()
    .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

function redact(v: unknown): unknown {
  if (typeof v === "string") return v.startsWith("data:image") ? v.slice(0, 64) + "…[truncated]" : v;
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x)]));
  return v;
}

let total = 0;
async function call(name: string, body: unknown, notes: string): Promise<boolean> {
  const t0 = Date.now();
  const res = await fetch(URL_DEC, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (!["authorization", "cookie", "set-cookie"].includes(k.toLowerCase())) headers[k] = v;
  });
  let parsed: unknown;
  let isJson = true;
  try {
    parsed = JSON.parse(text);
  } catch {
    isJson = false;
  }
  writeFileSync(
    join(OUT, `s1-jev-${name}.json`),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        spike: "S1-jev",
        target: `POST ${URL_DEC}`,
        model: MODEL,
        request: redact(body),
        response: { status: res.status, headers, ...(isJson ? { body: parsed } : { rawText: text }) },
        notes: `${notes} Latency ${ms} ms.`,
      },
      null,
      2,
    ),
  );
  let cost = 0;
  if (parsed && typeof parsed === "object" && "usage" in parsed) {
    const u = parsed.usage;
    if (u && typeof u === "object") {
      if ("cost" in u && typeof u.cost === "number") cost += u.cost;
      if ("cost_details" in u && u.cost_details && typeof u.cost_details === "object" && "upstream_inference_cost" in u.cost_details && typeof u.cost_details.upstream_inference_cost === "number") cost += u.cost_details.upstream_inference_cost;
    }
  }
  total += cost;
  console.log(name, res.status, `${ms}ms`, "cost", cost);
  return res.ok && !!parsed && typeof parsed === "object" && "answers" in parsed;
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const sessionId = crypto.randomUUID();
  const jobs = [
    {
      name: "return",
      photo: await dataUrl("phone-1.jpg"),
      text: buildStateText({ caseType: "return", category: "smartphone", productName: "Galaxy S24", purchaseDate: "2026-11-23", reason: "" }),
      questions: buildScreeningQuestions("return", "smartphone").questions,
    },
    {
      name: "complaint",
      photo: await dataUrl("laptop-1.png"),
      text: buildStateText({ caseType: "complaint", category: "laptop", productName: "ThinkPad X1", purchaseDate: "2026-06-01", reason: "Zawias pękł podczas zwykłego otwierania laptopa." }),
      questions: buildScreeningQuestions("complaint", "laptop").questions,
    },
  ];
  for (const j of jobs) {
    const body = (provider?: unknown) => ({
      model: MODEL,
      state: [j.text, { type: "image_url", image_url: { url: j.photo } }],
      questions: j.questions,
      session_id: sessionId,
      ...(provider ? { provider } : {}),
    });
    const ok = await call(j.name, body({ data_collection: "deny" }), `${j.name} set, provider.data_collection=deny.`);
    if (!ok) {
      // Record the deny failure under its own name, then retry without it (only once, on the return set).
      await call(`${j.name}-nodeny`, body(), `${j.name} set WITHOUT data_collection (deny failed).`);
      break;
    }
  }
  console.log("TOTAL COST", total);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
