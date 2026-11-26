// Spike S6: real OpenRouter error captures. Run (in app/):
//   LLM_MODEL=openai/gpt-6-luna node --env-file=.env.local --import tsx scripts/spikes/s6-errors.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(process.cwd(), "tests/fixtures/captures");
const URL_DEC = "https://openrouter.ai/api/alpha/decisions";
const URL_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const DEC_MODEL = process.env.DECISIONS_MODEL ?? "openai/gpt-6-luna-decisions";
const key = process.env.OPENROUTER_API_KEY ?? "";
if (!key) throw new Error("OPENROUTER_API_KEY missing");

function redact(v: unknown): unknown {
  if (typeof v === "string") return v.startsWith("data:image") ? v.slice(0, 64) + "…[truncated]" : v;
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, redact(x)]));
  return v;
}

async function call(name: string, url: string, token: string, model: string, body: unknown, notes: string): Promise<void> {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (!["authorization", "cookie", "set-cookie"].includes(k.toLowerCase())) headers[k] = v;
  });
  let resp: unknown;
  try {
    resp = { status: res.status, headers, body: JSON.parse(text) };
  } catch {
    resp = { status: res.status, headers, rawText: text };
  }
  writeFileSync(
    join(OUT, `s6-${name}.json`),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        spike: "S6",
        target: `POST ${url}`,
        model,
        request: redact(body),
        response: resp,
        notes: `${notes} Latency ${ms} ms.`,
      },
      null,
      2,
    ),
  );
  console.log(name, res.status, `${ms}ms`);
}

const noulQ = { x: { type: "noul", instructions: "The text is a greeting." } };
const chatBody = (model: string) => ({
  model,
  messages: [{ role: "user", content: "Say hello." }],
  max_tokens: 5,
});

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const bad = "sk-or-invalid-key";
  await call("decisions-401", URL_DEC, bad, DEC_MODEL, { model: DEC_MODEL, state: "hello", questions: noulQ }, "Invalid bearer token.");
  await call("chat-401", URL_CHAT, bad, "openai/gpt-6-luna", chatBody("openai/gpt-6-luna"), "Invalid bearer token.");
  await call("chat-400-unknown-model", URL_CHAT, key, "openai/does-not-exist-model", chatBody("openai/does-not-exist-model"), "Unknown model id.");
  await call(
    "decisions-400-unknown-model",
    URL_DEC,
    key,
    "openai/does-not-exist-decisions",
    { model: "openai/does-not-exist-decisions", state: "hello", questions: noulQ },
    "Unknown model id.",
  );
  await call(
    "decisions-400-bad-question",
    URL_DEC,
    key,
    DEC_MODEL,
    { model: DEC_MODEL, state: "hello", questions: { x: { type: "score", instructions: "Rate.", criteria: [] } } },
    "Invalid question spec (score with empty criteria).",
  );

  // Refusal attempt (single): identity question on a real photo.
  const buf = readFileSync(join(process.cwd(), "../assets/example-images/phone-3.jpeg"));
  const jpg = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  const url = `data:image/jpeg;base64,${jpg.toString("base64")}`;
  await call(
    "decisions-refusal-attempt",
    URL_DEC,
    key,
    DEC_MODEL,
    {
      model: DEC_MODEL,
      state: ["The person who owns this device is named Jan.", { type: "image_url", image_url: { url } }],
      questions: {
        owner_identity: { type: "noul", instructions: "The photo confirms the identity of the device owner named Jan." },
        photo_usable: { type: "noul", instructions: "The photo is sharp and shows the product fully." },
      },
      provider: { data_collection: "deny" },
    },
    "Single refusal attempt: identity question on phone-3.jpeg.",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
