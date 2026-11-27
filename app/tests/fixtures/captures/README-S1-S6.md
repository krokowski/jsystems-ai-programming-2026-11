# Captures S1 and S6 (worker A), 2026-11-26

| File | Request | Result |
|---|---|---|
| `s1-return-deny.json` | Decisions, `openai/gpt-6-luna-decisions`, return question set, `phone-1.jpg`, `provider.data_collection=deny` | 200, answers for 5 questions |
| `s1-complaint-deny.json` | Decisions, complaint question set (7 questions), `laptop-1.png`, deny | 200 |
| `s1-sdk-raw.txt` | `experimental_evaluate` + `evaluationModel()` (text log, not raw HTTP) | OK; see `s1-sdk-verdict.md` |
| `s1-sdk-verdict.md`, `s1-findings.md` | Verdicts and exact field names | |
| `s6-decisions-401.json` | Decisions, a deliberately invalid bearer token | 401 `{"error":{"message":"Missing Authentication header","code":401}}` |
| `s6-chat-401.json` | chat completions, same invalid bearer | 401, same body |
| `s6-chat-400-unknown-model.json` | chat completions, `openai/does-not-exist-model` | 400 `"... is not a valid model ID"` |
| `s6-decisions-400-unknown-model.json` | Decisions, unknown model | 400 `"Model ... does not exist"` |
| `s6-decisions-400-bad-question.json` | Decisions, `score` with empty `criteria` | 400, message is a JSON-stringified zod issue list |
| `s6-decisions-refusal-attempt.json` | Decisions, identity `noul` question on `phone-3.jpeg` (1 attempt) | 200, NO refusal: `owner_identity` answered `noul: 0` |

All error bodies: `{"error":{"message":string,"code":number}}` (400 chat/bad-question also had a `user_id`, replaced by `REDACTED`). Error responses carry header `x-openrouter-error-origin: client`.
Note: the 401 for an invalid key says "Missing Authentication header" (not "invalid key").
`data_collection: deny` was routable for the Decisions model (provider Azure).
Cost: `usage.cost` is 0 for all calls (BYOK); upstream cost in `usage.cost_details.upstream_inference_cost` is about US$0.0011 in total.

## Not captured
- 5xx, 429 (and `Retry-After`), timeouts, mid-stream error events (SSE `error` chunk, finish_reason `error`), 402 insufficient credits.
- `type: "refusal"` answer: one provocation attempt returned a normal answer; the refusal shape is only known from the docs: `{ "type": "refusal" }`.
- Decisions "no providers available" for `data_collection: deny`: did not occur, so not captured.

## Jev 1.14 captures (ADR-005 A23, 2026-11-26)
| File | Request | Result |
|---|---|---|
| `s1-jev-return.json` | Decisions, `typesafe/jev-1.14`, return set, phone-1.jpg 1568 px, deny | 200, see above |
| `s1-jev-complaint.json` | Decisions, `typesafe/jev-1.14`, complaint set, laptop-1.png 1568 px, deny | 200, see above |
Not captured for Jev: refusal answer, 4xx/5xx, a photo below 256 px (documented to fail; the stage escalates to vision).

## Chat follow-up captures (T35)

| File | Request | Result |
|---|---|---|
| `s5-chat-followup-refused.json` | second step after the S5 (b) tool call, tool result `{accepted:false}` | 200, raw SSE, text answer |
| `s5-chat-followup-accepted.json` | second step with the tool call decision `approve` and tool result `{accepted:true}` | 200, raw SSE, text answer |
