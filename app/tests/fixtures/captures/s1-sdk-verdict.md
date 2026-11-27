# S1 SDK verdict

decisionModel(): unusable (does not exist: `createOpenRouter(...).decisionModel` is `undefined` in @openrouter/ai-sdk-provider 3.1; the method is `evaluationModel()`)
evaluationModel(): usable

Call: `experimental_evaluate` from `ai` 7.0.181 with `createOpenRouter({ apiKey }).evaluationModel("openai/gpt-6-luna-decisions", { provider: { data_collection: "deny" } })`. HTTP success in 1156 ms (raw output: `s1-sdk-raw.txt`; the SDK call hides raw HTTP, so no JSON capture).
- `state` as an array with an `image_url` object part passed through and the image was accepted.
- Question type is `boolean` (mapped to `noul`), `choice`, `score` with `criteria` as array.
- Result: `result.answers.k` = `{type:"boolean", probability}` | `{type:"score", score, probabilities}` | `{type:"choice", choice, probabilities}`.
- `confidence` and `legend` are NOT in `answers`; they are under `result.providerMetadata.openrouter.answers[key]`. `providerMetadata.openrouter.provider` = "Azure"; `providerMetadata.openrouter.usage.cost` = 0 (BYOK, real price is not exposed there).
- No refusal type in the SDK answer union (boolean/score/choice only); a refused question's behaviour through the SDK was not observed.
Recommendation: raw `fetch` gives more fields (`cost_details`, `legend`, refusal) and a stable capture; the SDK path works but loses `cost_details`.
