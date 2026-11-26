// Spike S2: vision input + structured output (raw fetch to OpenRouter chat completions).
// Run in app/: LLM_MODEL=openai/gpt-6-luna node --env-file=.env.local --import tsx scripts/spikes/s2-vision.ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { imageFindingsSchema } from "../../src/lib/schemas/domain";

const URL_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const OUT = path.resolve("tests/fixtures/captures");
const key = process.env.OPENROUTER_API_KEY;
const model = process.env.LLM_MODEL;
if (!key || !model) throw new Error("OPENROUTER_API_KEY and LLM_MODEL required");

let totalCost = 0;

function truncate(v: unknown): unknown {
  if (typeof v === "string") return v.startsWith("data:") ? v.slice(0, 64) + "…[truncated]" : v;
  if (Array.isArray(v)) return v.map(truncate);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, truncate(x)]));
  return v;
}

async function call(name: string, body: Record<string, unknown>, notes: string) {
  const t0 = Date.now();
  const res = await fetch(URL_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (!["authorization", "cookie", "set-cookie"].includes(k.toLowerCase())) headers[k] = v;
  });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { parsed = undefined; }
  const capture = {
    capturedAt: new Date().toISOString(),
    spike: "S2",
    target: `POST ${URL_CHAT}`,
    model,
    request: truncate(body),
    response: { status: res.status, headers, ...(parsed !== undefined ? { body: parsed } : { rawText: text }) },
    notes: `${notes} (latency ${Date.now() - t0} ms)`,
  };
  await mkdir(OUT, { recursive: true });
  await writeFile(path.join(OUT, `${name}.json`), JSON.stringify(capture, null, 2) + "\n");
  const cost = z.object({ usage: z.object({ cost: z.number() }) }).safeParse(parsed);
  if (cost.success) totalCost += cost.data.usage.cost;
  console.log(name, "status", res.status, "ms", Date.now() - t0, "cost", cost.success ? cost.data.usage.cost : "n/a");
  return { status: res.status, parsed, text };
}

async function main(): Promise<void> {
const photo = await sharp(await readFile("../assets/example-images/phone-1.jpg"))
  .rotate()
  .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 80 })
  .toBuffer();
const dataUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;

const baseProvider = { data_collection: "deny", require_parameters: true };

// 1. image input
const describeBody = (provider: Record<string, unknown>) => ({
  model,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "Describe only what is visible on the product in 2 sentences." },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ],
  provider,
  usage: { include: true },
});
let r1Provider: Record<string, unknown> = baseProvider;
let r1 = await call("s2-image-describe", describeBody(baseProvider), "image_url part with data_collection=deny, require_parameters=true");
if (r1.status !== 200 && /endpoint|provider/i.test(r1.text)) {
  r1Provider = { require_parameters: true };
  r1 = await call("s2-image-describe-no-deny", describeBody({ require_parameters: true }), "retry WITHOUT data_collection deny (first call failed)");
}
if (r1.status !== 200) {
  console.log("Vision failed; stopping (U6: user must choose VISION_MODEL). total cost", totalCost);
  return;
}

// 2. structured output
const { $schema: _omit, ...schema } = z.toJSONSchema(imageFindingsSchema, { io: "output" });
void _omit;
const instruction =
  "You analyse a customer photo for a product RETURN. Declared category: smartphone (Galaxy S24). " +
  "Fill every field. source must be \"llm\". notes: 2-5 English sentences describing only what is visible. " +
  "damageLocation is free text or null. resellable is true/false for a return. descriptionConsistent is null for a return. " +
  "screeningDisagreements is an empty array. conditionScore 0 = like new .. 4 = heavily worn.";
const structBody = (provider: Record<string, unknown>) => ({
  model,
  messages: [
    { role: "system", content: instruction },
    { role: "user", content: [{ type: "text", text: "Analyse the attached photo." }, { type: "image_url", image_url: { url: dataUrl } }] },
  ],
  response_format: { type: "json_schema", json_schema: { name: "image_findings", strict: true, schema } },
  provider,
  usage: { include: true },
});
const usedProvider = r1Provider;
const r2 = await call("s2-image-findings", structBody(usedProvider), `json_schema strict from z.toJSONSchema(imageFindingsSchema); provider=${JSON.stringify(usedProvider)}`);

const msg = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1) }).safeParse(r2.parsed);
if (!msg.success || msg.data.choices[0]?.message.content == null) {
  console.log("no content in response; schema verdict: not honoured");
} else {
  const content = msg.data.choices[0].message.content;
  let json: unknown;
  try { json = JSON.parse(content); } catch { json = undefined; }
  const v = json === undefined ? null : imageFindingsSchema.safeParse(json);
  console.log("JSON.parse ok:", json !== undefined, "| zod safeParse:", v ? v.success : "n/a");
  if (v && !v.success) console.log(JSON.stringify(v.error.issues));
}
console.log("S2 total cost", totalCost);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
