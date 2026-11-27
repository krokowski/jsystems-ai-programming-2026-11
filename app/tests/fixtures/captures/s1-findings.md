# S1 findings: Luna Decisions (captured 2026-11-26)

Endpoint: `POST https://openrouter.ai/api/alpha/decisions`. Model requested `openai/gpt-6-luna-decisions`, resolved `model` in the response: `openai/gpt-6-luna-decisions-20261006`, `provider`: `Azure`.
Request: `state` = array `[ "<text>", { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } } ]`, `questions` map, `session_id` (UUID), `provider: { data_collection: "deny" }`. All accepted (HTTP 200). `data_collection: deny` is routable (provider Azure); no fallback call was needed. No request-side usage option is needed: `usage` is always returned.

## Response fields (exact)
- `answers.<key>.type`: `"noul" | "score" | "choice"` (documented also `"box"`, `"refusal"`).
- `noul`: `answers.k.noul` (probability of true, 2 decimals). **No `confidence` field and no `probabilities` on `noul` answers in the real responses.** (Docs example shows `confidence` on noul; real captures do not.)
- `score`: `answers.k.score` (number, 0..N-1), `answers.k.probabilities` (keys `"0".."4"`), `answers.k.confidence`, plus `answers.k.legend` (index -> criteria text).
- `choice`: `answers.k.choice` (winning key), `answers.k.probabilities` (all keys), `answers.k.confidence`.
- Refusal: `answers.k = { "type": "refusal" }` (documented; not observed, see README-S1-S6.md).
- Top level: `id`, `model`, `provider`, `answers`, `usage`.
- `usage`: `input_tokens`, `output_tokens` (0), `cost`, `is_byok`, `cost_details.{upstream_inference_cost, upstream_inference_prompt_cost, upstream_inference_completions_cost}`.

## Cost warning
The account key is BYOK: `usage.cost` is `0` and `usage.is_byok` is `true`. The real price is in `usage.cost_details.upstream_inference_cost` (return call 0.0001906, complaint call 0.0003622). Cost accounting must read `cost_details.upstream_inference_cost` when `cost` is 0 (or sum both).

## Consequence for ADR-002 §3.2 mapping
`confidence` exists only on `score` and `choice`. For `noul` areas the certainty must be derived from the probability (e.g. `max(p, 1-p)`), otherwise every `noul` area would count as "not certain". The mapping code must handle a missing `confidence` explicitly.

## Latency
Return (1 image, 1906 input tokens): 1360 ms. Complaint (1 image, 3622 tokens): 1584 ms. SDK path: 1156 ms.

## Observations (facts only)
Probabilities are rounded to 2 decimals; many answers are 0/1 extremes. On the two real photos the model answered `category_match` 0.1 (return, declared smartphone) and 0 (complaint, declared laptop), and the complaint photo gave `damage_type=screen_crack`, `damage_cause=mechanical_impact` (conf 0.95). Verify against the photos by eye before treating the screening as reliable (do not describe photos to the model); this is relevant to the escalation policy.
