// Spike S5 follow-up: the second request of the chat tool loop (assistant tool call + tool result -> text).
// Builds on the S5 (b) request in tests/fixtures/captures/s5-chat-stream.json.
// Run in app/: LLM_MODEL=openai/gpt-6-luna node --env-file=.env.local --import tsx scripts/spikes/s5-chat-followup.ts
// Stores the raw SSE of two streaming calls: s5-chat-followup-refused.json and s5-chat-followup-accepted.json.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const URL_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const OUT = path.resolve("tests/fixtures/captures");
const key = process.env.OPENROUTER_API_KEY;
const model = process.env.LLM_MODEL;
if (!key || !model) throw new Error("OPENROUTER_API_KEY and LLM_MODEL required");

const captureSchema = z.object({
  request: z.object({ messages: z.array(z.record(z.string(), z.unknown())) }).catchall(z.unknown()),
  response: z.object({ rawText: z.string() }),
});

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            tool_calls: z
              .array(
                z.object({
                  id: z.string().nullish(),
                  function: z.object({ name: z.string().nullish(), arguments: z.string().nullish() }).nullish(),
                }),
              )
              .nullish(),
            content: z.string().nullish(),
            reasoning: z.string().nullish(),
          })
          .optional(),
      }),
    )
    .optional(),
  usage: z
    .object({ cost_details: z.object({ upstream_inference_cost: z.number().nullish() }).nullish() })
    .optional(),
});

function toolCallFromSse(raw: string): { id: string; name: string; args: string } {
  let id = "";
  let name = "";
  let args = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    const chunk = chunkSchema.safeParse(json);
    if (!chunk.success) continue;
    for (const choice of chunk.data.choices ?? []) {
      for (const tc of choice.delta?.tool_calls ?? []) {
        if (tc.id) id = tc.id;
        if (tc.function?.name) name = tc.function.name;
        if (tc.function?.arguments) args += tc.function.arguments;
      }
    }
  }
  return { id, name, args };
}

function sseSummary(raw: string): { text: string; reasoning: number; cost: number } {
  let text = "";
  let reasoning = 0;
  let cost = 0;
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const data = line.slice(6).trim();
    if (data === "[DONE]") continue;
    let json: unknown;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    const chunk = chunkSchema.safeParse(json);
    if (!chunk.success) continue;
    cost += chunk.data.usage?.cost_details?.upstream_inference_cost ?? 0;
    for (const choice of chunk.data.choices ?? []) {
      text += choice.delta?.content ?? "";
      if (choice.delta?.reasoning) reasoning += 1;
    }
  }
  return { text, reasoning, cost };
}

async function capture(file: string, body: Record<string, unknown>, notes: string): Promise<number> {
  const t0 = Date.now();
  const res = await fetch(URL_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (!["authorization", "cookie", "set-cookie"].includes(k.toLowerCase())) headers[k] = v;
  });
  const record = {
    capturedAt: new Date().toISOString(),
    spike: "S5",
    target: `POST ${URL_CHAT}`,
    model,
    request: body,
    response: { status: res.status, headers, rawText },
    notes: `${notes} (total ${Date.now() - t0} ms)`,
  };
  await writeFile(path.join(OUT, file), JSON.stringify(record, null, 2) + "\n");
  const s = sseSummary(rawText);
  console.log(file, "status", res.status, "text chars", s.text.length, "reasoning events", s.reasoning, "upstream cost", s.cost);
  console.log("  text:", s.text.slice(0, 300).replaceAll("\n", " "));
  return s.cost;
}

async function main(): Promise<void> {
  const base = captureSchema.parse(JSON.parse(await readFile(path.join(OUT, "s5-chat-stream.json"), "utf8")));
  const call = toolCallFromSse(base.response.rawText);
  if (call.id === "" || call.name !== "updateDecision") throw new Error("tool call not found in s5-chat-stream.json");

  function followUp(args: string, result: string): Record<string, unknown> {
    return {
      ...base.request,
      messages: [
        ...base.request.messages,
        {
          role: "assistant",
          content: null,
          tool_calls: [{ id: call.id, type: "function", function: { name: call.name, arguments: args } }],
        },
        { role: "tool", tool_call_id: call.id, content: result },
      ],
    };
  }

  let total = 0;
  total += await capture(
    "s5-chat-followup-refused.json",
    followUp(call.args, JSON.stringify({ accepted: false, why: "The decision is already manual_review; nothing to update." })),
    "second request of the tool loop: S5 (b) request + assistant tool_calls (verbatim arguments from s5-chat-stream.json, decision manual_review) + tool result accepted:false; rawText is the verbatim SSE",
  );

  // Accepted variant: the story must be coherent, so the assistant tool call proposes `approve`.
  const accepted = z.record(z.string(), z.unknown()).parse(JSON.parse(call.args));
  const approveArgs = JSON.stringify({ ...accepted, decision: "approve" });
  total += await capture(
    "s5-chat-followup-accepted.json",
    followUp(approveArgs, JSON.stringify({ accepted: true })),
    "second request of the tool loop: S5 (b) request + assistant tool_calls whose arguments have decision changed to approve (otherwise verbatim) + tool result accepted:true; rawText is the verbatim SSE",
  );
  console.log("total upstream_inference_cost:", total);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
