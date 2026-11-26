# S1 findings: Jev 1.14 on the Decisions API (captured 2026-11-26, ADR-005 A23)

Script: `app/scripts/spikes/s1-jev.ts` (production question sets and state text via `src/server/ai/screening/questions.ts`; photos `phone-1.jpg` and `laptop-1.png` resized to 1568 px JPEG q80). Captures: `s1-jev-return.json`, `s1-jev-complaint.json`. No `*-nodeny` / `s1-jev-deny-error.json` file: the deny call succeeded.

## Verdicts
- Requested `typesafe/jev-1.14`, resolved `model`: `typesafe/jev-1.14-20261014`, `provider`: `TypeSafe`. HTTP 200 for both calls.
- **`provider.data_collection: "deny"` is routable** for Jev. No fallback needed; the adapter keeps sending it.
- **`noul` answers carry NO `confidence`** (only `noul`, the probability of true, 2 decimals). Same as Luna: the A22 fallback `max(p, 1 - p)` is what applies in practice. The adapter uses an API `confidence` if one ever appears (docs show one; not observed).
- **`score` is fractional**, not an integer bucket: `answers.condition.score` = 3.95 / 3.96 (expected bucket index). Adapter rounds it (`Math.round`) to the bucket index; `probabilities` keys `"0".."4"` and `confidence` (0.98) are returned as with Luna, plus `legend`.
- `choice`: `choice`, `probabilities` (all keys), `confidence`, as with Luna.
- Cost: BYOK again, `usage.cost` = 0, `usage.is_byok` = true; real price in `usage.cost_details.upstream_inference_cost`: return 0.000140616 (3348 input tokens, 88 output), complaint 0.00029085 (6925 input, 263 output). Total spend of this capture: about US$0.00043.
- Latency: return 479 ms, complaint 283 ms (Luna: 1360 / 1584 ms).

## Answers on the two real photos (for the tests)
Return (declared smartphone): photo_usable 0.76, category_match 0.98, damage_visible 0.98, signs_of_use 0.7, condition score 3.95 (conf 0.98, "damaged").
Complaint (declared laptop): photo_usable 0.42, category_match 0.95, damage_visible 0.97, damage_type screen_crack 0.98, damage_cause mechanical_impact 0.87, description_consistent 0.12, condition score 3.96 (conf 0.98).
With the default threshold 0.8, uncertain areas: return = photo_usable, signs_of_use; complaint = photo_usable. So these real photos would escalate to the vision model.

## Additions for README-S1-S6.md (orchestrator merges)
| File | Request | Result |
|---|---|---|
| `s1-jev-return.json` | Decisions, `typesafe/jev-1.14`, return set, phone-1.jpg 1568 px, deny | 200, see above |
| `s1-jev-complaint.json` | Decisions, `typesafe/jev-1.14`, complaint set, laptop-1.png 1568 px, deny | 200, see above |
Not captured for Jev: refusal answer, 4xx/5xx, a photo below 256 px (documented to fail; the stage escalates to vision).
