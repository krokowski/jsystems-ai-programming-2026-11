# Captures of the app's own API (T45)

Recorded on 2026-11-26 against the real production build (`pnpm build`, `pnpm start --port 3010`) with real OpenRouter models (`LLM_MODEL=openai/gpt-6-luna`; screening by `typesafe/jev-1.14-20261014`). Source: `app/scripts/captures/api-capture.ts` (`pnpm exec tsx scripts/captures/api-capture.ts auto|always|invalid`). Photos: unmodified files from `assets/example-images/`. The in-memory case store lives per server process, so each server phase had its own cases.

Server phases: `auto` (default `ANALYSIS_ESCALATION`), `always` (`ANALYSIS_ESCALATION=always`), `invalid key` (the process was started with an invalid OpenRouter key; it is not recorded anywhere).

## Files

| file | target | status | captured at | notes |
|---|---|---|---|---|
| `api-analysis-200-always.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 200 | 2026-11-26T11:36:04Z | Return, phone-2.jpeg, server started with ANALYSIS_ESCALATION=always (escalated path). |
| `api-analysis-200-auto-datereject.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 200 | 2026-11-26T11:34:40Z | Return purchased today-30 (date rule R1.1), analysis step. |
| `api-analysis-200-auto.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 200 | 2026-11-26T11:34:29Z | Case 1, ANALYSIS_ESCALATION=auto (default). |
| `api-analysis-200-complaint-1.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 200 | 2026-11-26T11:34:59Z | Complaint case attempt 1, analysis step. |
| `api-analysis-200-complaint-2.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 200 | 2026-11-26T11:35:19Z | Complaint case attempt 2, analysis step. |
| `api-analysis-404.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 404 | 2026-11-26T11:34:21Z | Unknown (random UUID) case id. |
| `api-analysis-502.json` | POST http://localhost:3010/api/cases/<caseId>/analysis | 502 | 2026-11-26T11:36:15Z | Server started with an invalid OpenRouter key; OpenRouter rejects the call. |
| `api-chat-200-answer.json` | POST http://localhost:3010/api/cases/<caseId>/chat | 200 | 2026-11-26T11:34:46Z | Chat on case 1; SSE stored verbatim. |
| `api-chat-200-update-attempt1.json` | POST http://localhost:3010/api/cases/<caseId>/chat | 200 | 2026-11-26T11:35:09Z | Complaint chat attempt 1. data-decision chunk present: see rawText. |
| `api-chat-200-update-attempt2.json` | POST http://localhost:3010/api/cases/<caseId>/chat | 200 | 2026-11-26T11:35:30Z | Complaint chat attempt 2. data-decision chunk present: see rawText. |
| `api-chat-409.json` | POST http://localhost:3010/api/cases/<caseId>/chat | 409 | 2026-11-26T11:34:46Z | Second chat request (id differs) sent right after the first one's response headers arrived (request A status 2 |
| `api-create-201.json` | POST http://localhost:3010/api/cases | 201 | 2026-11-26T11:34:21Z | Valid return, Smartfon, purchase today-3 (Europe/Warsaw). |
| `api-create-413.json` | POST http://localhost:3010/api/cases | 413 | 2026-11-26T11:34:21Z | Synthetic 12 MB body with a JPEG header (over the 11 MB request limit, A17). |
| `api-create-422.json` | POST http://localhost:3010/api/cases | 422 | 2026-11-26T11:34:21Z | Several invalid fields at once: no caseType, productName 'a', purchaseDate tomorrow, photo is a text file. |
| `api-decision-200-complaint-1.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 200 | 2026-11-26T11:35:03Z | Complaint case attempt 1, decision step. |
| `api-decision-200-complaint-2.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 200 | 2026-11-26T11:35:25Z | Complaint case attempt 2, decision step. |
| `api-decision-200-date-reject.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 200 | 2026-11-26T11:34:45Z | Return purchased today-30, forced reject by the date rule. |
| `api-decision-200.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 200 | 2026-11-26T11:34:34Z | Case 1 after analysis; model decision. |
| `api-decision-409.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 409 | 2026-11-26T11:34:21Z | Decision requested on a fresh case before /analysis. |
| `api-decision-502.json` | POST http://localhost:3010/api/cases/<caseId>/decision | 409 | 2026-11-26T11:36:15Z | Decision after the failed analysis (may not reach the AI). |


Request headers are limited to content-type; multipart requests are described as fields plus photo file name and size. Response headers omit `set-cookie` and `date`. SSE bodies are stored verbatim in `rawText`.

## Observations

- `findingsSource` is `llm` in all four captured analysis responses (the schema enum is `screening | llm`; there is no `auto`/`always` value). Even in the default `auto` phase every analysis took the `escalated` path (screening confidences too low), so the `screening` (fast path) value was **not** observed.
- Decisions: case 1 (`phone-1.jpg`) `manual_review` forced by `category_mismatch`; the today-30 return `reject` forced by `date_rule`; complaint attempt 1 `manual_review` (model, no forcing); complaint attempt 2 `manual_review` forced by `category_mismatch` (model output is not deterministic).
- `updateDecision` did **not** fire in either complaint chat attempt: the SSE has no `tool-*` or `data-decision` chunk, only text. A `data-decision` chunk is therefore **not captured**.
- `api-decision-502.json` is a 409 `CASE_STATE`: after the failed analysis the case is not in the analyzed state, so the decision endpoint never reaches the AI. The 502 body is the same `AI_UNAVAILABLE` envelope as in `api-analysis-502.json`.
- `api-create-413.json`: a 12 MB request returns 413 `PAYLOAD_TOO_LARGE` with `fields.photo`.
- `api-chat-409.json`: the second concurrent request gets 409 `CASE_STATE`.
- The chat on case 1 shows two `chat` log rows because request A of the 409 test was streamed to completion after the answer capture.

## Stage log lines (server stdout; JSON lines, no secrets)



### Server phase: auto

| case | stage | model | path | forcedBy | decision | modelDecision | costCredits | status |
|---|---|---|---|---|---|---|---|---|
| 124eecd5 | screening | typesafe/jev-1.14-20261014 | None | None | None | None | 0.000140784 | ok |
| 124eecd5 | vision | openai/gpt-6-luna | escalated | None | None | None | 0.00050755 | ok |
| 124eecd5 | analysis | typesafe/jev-1.14-20261014 | escalated | None | None | None | 0.000140784 | ok |
| 124eecd5 | decision | openai/gpt-6-luna | None | category_mismatch | manual_review | manual_review | 0.00041155 | ok |
| de814e57 | screening | typesafe/jev-1.14-20261014 | None | None | None | None | 4.431e-05 | ok |
| de814e57 | vision | openai/gpt-6-luna | escalated | None | None | None | 0.000378925 | ok |
| de814e57 | analysis | typesafe/jev-1.14-20261014 | escalated | None | None | None | 4.431e-05 | ok |
| de814e57 | decision | openai/gpt-6-luna | None | date_rule | reject | reject | 0.0004228 | ok |
| 124eecd5 | chat | openai/gpt-6-luna | None | None | None | None | 0.000285175 | ok |
| 124eecd5 | chat | openai/gpt-6-luna | None | None | None | None | 6.1035e-05 | ok |
| c6fe8d3c | screening | typesafe/jev-1.14-20261014 | None | None | None | None | 0.000290766 | ok |
| c6fe8d3c | vision | openai/gpt-6-luna | escalated | None | None | None | 0.000832425 | ok |
| c6fe8d3c | analysis | typesafe/jev-1.14-20261014 | escalated | None | None | None | 0.000290766 | ok |
| c6fe8d3c | decision | openai/gpt-6-luna | None | None | manual_review | manual_review | 0.0004173 | ok |
| c6fe8d3c | chat | openai/gpt-6-luna | None | None | None | None | 0.000458315 | ok |
| f743708f | screening | typesafe/jev-1.14-20261014 | None | None | None | None | 0.000290808 | ok |
| f743708f | vision | openai/gpt-6-luna | escalated | None | None | None | 0.000774425 | ok |
| f743708f | analysis | typesafe/jev-1.14-20261014 | escalated | None | None | None | 0.000290808 | ok |
| f743708f | decision | openai/gpt-6-luna | None | category_mismatch | manual_review | manual_review | 0.00044605 | ok |
| f743708f | chat | openai/gpt-6-luna | None | None | None | None | 0.00048434 | ok |

Phase cost (screening + vision + decision + chat, `analysis` rows excluded because they repeat the screening cost): 0.006247

### Server phase: always

| case | stage | model | path | forcedBy | decision | modelDecision | costCredits | status |
|---|---|---|---|---|---|---|---|---|
| 1c2331bd | screening | typesafe/jev-1.14-20261014 | None | None | None | None | 4.3764e-05 | ok |
| 1c2331bd | vision | openai/gpt-6-luna | escalated | None | None | None | 0.000447175 | ok |
| 1c2331bd | analysis | typesafe/jev-1.14-20261014 | escalated | None | None | None | 4.3764e-05 | ok |

Phase cost (screening + vision + decision + chat, `analysis` rows excluded because they repeat the screening cost): 0.000491

### Server phase: invalid key

| case | stage | model | path | forcedBy | decision | modelDecision | costCredits | status |
|---|---|---|---|---|---|---|---|---|
| 47999fed | screening | typesafe/jev-1.14 | None | None | None | None | None | error/http |
| 47999fed | vision | openai/gpt-6-luna | escalated | None | None | None | None | error/AiUnavailableError |
| 47999fed | analysis | None | escalated | None | None | None | None | error/http |

Phase cost (screening + vision + decision + chat, `analysis` rows excluded because they repeat the screening cost): 0.000000


Total real cost over the three phases: **0.006737** credits (US$, BYOK upstream), far under the US$0.30 budget. Failed calls with the invalid key cost nothing.

## Not captured

- 504 (`AI_TIMEOUT`): cannot be produced on demand. The client treats it like the captured 502 (TR5).
- Chat SSE with `data-decision` (`updateDecision` accepted by the guard): not produced in 2 attempts (see above).
- Analysis with `findingsSource: "screening"` (fast path): never produced, the screening confidences were always below the threshold.
- 429, mid-stream error and other 5xx shapes.
