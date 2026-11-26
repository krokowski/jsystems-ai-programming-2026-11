# Captures S2 (vision + structured output) and S5 (decision + chat)

Model: `openai/gpt-6-luna` (`LLM_MODEL`), provider that served every call: Azure. All requests: raw `fetch` to `POST https://openrouter.ai/api/v1/chat/completions` with `provider: { data_collection: "deny", require_parameters: true }` and `usage: { include: true }`. Sources: `scripts/spikes/s2-vision.ts`, `scripts/spikes/s5-decision-chat.ts`. Captured 2026-11-26. The photo is `assets/example-images/phone-1.jpg` after the app's sharp pipeline (rotate, max 1600, JPEG q80); the prompts never describe it.

## Files

| File | Request | Result |
|---|---|---|
| `s2-image-describe.json` | `image_url` data-URL part + "Describe only what is visible on the product in 2 sentences." | 200, image accepted |
| `s2-image-findings.json` | system "return analysis" instruction + image, `response_format` json_schema strict from `z.toJSONSchema(imageFindingsSchema)` | 200, content is valid JSON, `imageFindingsSchema.safeParse` succeeds |
| `s5-decision.json` | non-streaming decision: system = role + full return policy + case facts + findings (the valid S2 output) + date facts; json_schema of `decisionOutputSchema`; `reasoning: { effort: "medium" }` | 200, parses with `decisionOutputSchema` |
| `s5-chat-stream.json` | streaming chat, `tools: [updateDecision]`, `reasoning: { effort: "low" }`; `response.rawText` is the verbatim SSE (copy of attempt 1) | 200, `updateDecision` tool call |
| `s5-chat-stream-attempt1.json` | same as above (the only attempt needed) | |
| `s5-chat-attempts.json` | summary of the attempts | tool called on attempt 1 of max 3 |
| `s5-sdk-stream-parts.md` | AI SDK `streamText` run, `fullStream` part types | see the file |

## Verdicts

- Image accepted by `LLM_MODEL`: yes (S2 call 1, 200, `image_url` with `data:image/jpeg;base64,...`). U6 `VISION_MODEL` can default to `LLM_MODEL`.
- `data_collection: "deny"` routable: yes, together with `require_parameters: true`, on every call (no "no endpoints" error, so no retry without it was made).
- JSON schema honoured: yes. `message.content` is a JSON string (not an object). `z.toJSONSchema(imageFindingsSchema, { io: "output" })` (drop `$schema`) was accepted by `strict: true`. Both `imageFindingsSchema` and `decisionOutputSchema` parse the output (S5 (a): `decision: "reject"` with cited rules R2.1, R4.2, R6.1, R6.2).
- Tool called in the stream: yes, `updateDecision` on attempt 1 (base wording, no firmer retry needed). Arguments arrive as `delta.tool_calls[0].function.arguments` fragments after an initial chunk with `id` and `function.name`; final chunk has `finish_reason: "tool_calls"` and carries `usage`. The model called the tool with `decision: "manual_review"` (the same as the current decision), with text content empty. `DecisionGuards.allowedChatUpdate` must therefore reject "decision equals current" (ADR-002 §3.5), and the model then answers in a second step.
- Reasoning events in the raw SSE: no. With `reasoning: { effort: "low" }` there were no `delta.reasoning` or `delta.reasoning_details` chunks (`reasoning_tokens: 0` in `usage`). The non-streaming responses with the default effort (S2) and `medium` (S5 (a)) carry `message.reasoning` (plain text, S2 findings call) and/or `message.reasoning_details` of type `reasoning.encrypted` (all non-streaming calls). Through the AI SDK no `reasoning-*` parts appeared either.
- Through the AI SDK: `streamText({ instructions, messages, tools, stopWhen: stepCountIs(3) })`. A `system` message in `messages` is rejected with `InvalidPromptError` ("System messages are not allowed ... Use the instructions option instead"). `fullStream` and `stream` both exist; `stepCountIs` is an alias of `isStepCount`. Provider routing was passed with `extraBody: { provider }` on `openrouter.chat(model, { reasoning, usage, extraBody })`.

## Cost

`usage.cost` is `0` on every call because the key is BYOK (`is_byok: true`). Real spend is `usage.cost_details.upstream_inference_cost`:
S2 describe 0.000210, S2 findings 0.000354, S5 decision 0.000245, S5 stream 0.000153, plus the SDK run (not captured, about 0.00025 by token count). Total about US$0.0012.

## Not captured

- Streaming tool call followed by the second step (text after `tool_calls` result). The raw run is a single request; the multi-step shape exists only as part types in `s5-sdk-stream-parts.md`.
- A raw SSE with reasoning events (none are emitted at effort `low`; not tried at `medium` in streaming mode).
- Error shapes: see `README-S1-S6.md` (worker A).
