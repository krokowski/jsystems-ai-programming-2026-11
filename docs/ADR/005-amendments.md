# ADR-005: Amendments to ADR-000 – ADR-004 after the consistency review

**Date:** 2026-11-26
**Status:** Accepted (2026-11-26, by the product owner). This ADR takes precedence over ADR-000 – ADR-004 wherever they differ.
**Relates to:** [`000-main-architecture.md`](000-main-architecture.md), [`001-project-setup.md`](001-project-setup.md), [`002-ai-pipeline.md`](002-ai-pipeline.md), [`003-backend-api.md`](003-backend-api.md), [`004-frontend.md`](004-frontend.md), [`../PRD.md`](../PRD.md)

---

## 1. Scope

On 2026-11-26 a consistency review compared the PRD, the ADR set, `AGENTS.md` and the implementation plan. It found contradictions and gaps that would leave an implementing agent unsure what to do.

This ADR records each resolution as an amendment (A1–A21). A22 was added after spike S1 (gate G2); A23 records the switch of the screening model to Jev 1.14. The amended ADRs are not rewritten, so the original decisions stay traceable. Each amended ADR has a header note pointing here.

Rule for agents: **when an ADR-000 – ADR-004 statement conflicts with an amendment below, follow the amendment.**

---

## 2. Amendments

### A1. First assistant message: five parts (resolves ADR-000 §8.6 vs ADR-002 §4.4)
**Amends:** ADR-000 §8.6.
**Decision:**
- The first assistant message is built exactly as in ADR-002 §4.4: five parts, and part 2 is a `data-decision` part with `origin: "initial"`.
- The ADR-000 §8.6 sentence "renders the first assistant message as one Markdown text part" no longer applies.
- Message metadata still carries `{ decision, origin, citedRules }`.
- The structured-output field is named `greeting` (ADR-002 §4.3). `greetingLine` in ADR-000 §8.6 is the same field.

### A2. Return-window boundary (closes the ADR-000 §11 open question)
**Amends:** ADR-000 §11, ADR-002 §4.5.
**Decision:**
- `withinPeriod = referenceDate − purchaseDate ≤ 14` calendar days. The purchase day is day 0, so a purchase on 1 Nov can be returned until 15 Nov inclusive.
- This matches Return Policy R1.2 ("day 15 or later" counted from day 1 = the day after purchase).
- Decided by the product owner on 2026-11-26.

### A3. Precedence between forced outcomes (aligns with the PRD AC-22 note)
**Amends:** ADR-000 §8.5, ADR-002 §3.4.
**Decision:**
- Forced outcomes apply in this order: **period rule (AC-20/AC-21) → unusable photo → category mismatch.**
- An out-of-period case is rejected even when the photo is unusable, because the period rule does not depend on the photo.
- The PRD states this exception in AC-22.

### A4. Fast-path findings must satisfy PRD AC-13 – AC-15
**Amends:** ADR-002 §3.3 (escalation table and `FindingsFromScreening`), §4.2, TAC-002-04.
**Context:**
- Screening has no question for the type of usability issue (AC-15 needs a reason) and no question for the damage location (AC-14 needs a location).
- The complaint question set has no `signs_of_use`, but `ImageFindings.signsOfUse` was a required boolean.

**Decision:**
- Escalate to `VisionAnalysis` in two more cases, even when every area is certain:
  - `photo_usable` = false. The vision model must supply `usabilityIssue`.
  - Complaint with `damage_visible` = true. The vision model must supply `damageLocation`.
- So the fast path (no vision call) applies only to:
  - returns with a usable photo
  - complaints with a usable photo and no visible damage. There `damageLocation = null` is correct.
- `ImageFindings.signsOfUse` becomes `boolean | null`. It is `null` for complaints on the fast path.
- `ImageFindings.usabilityIssue` must be non-null whenever `photoUsable = false`.
- New escalation table, evaluated top to bottom:

| Condition | Result |
|---|---|
| `ANALYSIS_ESCALATION=always` | escalate with signals |
| Screening error / timeout | escalate without signals |
| Any area not certain | escalate with signals, uncertain areas flagged |
| `photo_usable` = false | escalate with signals (reason needed) |
| Complaint and `damage_visible` = true | escalate with signals (location needed) |
| Otherwise | skip, findings from screening |

- TAC-002-04 now reads: "When the table above returns `skip`, the vision model is called 0 times. Otherwise it is called exactly once (plus at most one transport retry)."

### A5. Layout of an updated-decision message (resolves ADR-004 §3.5 vs PRD §8 and §11)
**Amends:** ADR-004 §3.5, ADR-000 §8.7, ADR-002 §3.5.
**Context:** the PRD says every updated decision **ends with** the disclaimer and begins with "Zaktualizowana decyzja: …" (AC-30).
**Decision:**
- An assistant message with a `data-decision` part where `origin=chat_update` is rendered in this order:
  1. `DecisionUpdateBlock`: heading "Zaktualizowana decyzja: {label}" and the reason
  2. the text parts
  3. the disclaimer in italics, as the **last** element of the message
- The disclaimer text comes from `lib/i18n-pl` and is added by the UI. The `data-decision` part has **no** disclaimer flag: its fields are `{ decision, label, origin, reason? }`. The ADR-000 §8.7 "disclaimer flag" is dropped.

### A6. Single-flight execution of `/analysis` and `/decision`
**Amends:** ADR-003 §3.1, §4.1, §5.2, §5.3; ADR-004 §3.3.
**Context:**
- React StrictMode runs effects twice in development, so the processing screen sends `/analysis` twice.
- The `Case` model has no "analysis running" flag, and two concurrent `/decision` calls would pay for two model calls.

**Decision:**
- `CaseService` keeps an in-memory map `inFlight: Map<"<caseId>:<stage>", Promise<StageResult>>`, on `globalThis` next to the case store.
- A second request for a stage that is already running **awaits the same promise** and gets the same result or the same error. It never gets 409, and no second AI call is made.
- The entry is removed when the promise settles. Aborting a client request does not cancel the server work.
- `409 CASE_STATE` stays only for out-of-order calls (`/decision` while `status=created`).
- Chat keeps `chatBusy` and 409, because `useChat` does not send in parallel.
- On the client, the processing screen treats an unexpected 409 like 502: it shows the AC-34 message.
- New test: two concurrent `/analysis` calls → both 200, AI mock called once.

### A7. Time zone is a shared constant, not an environment variable
**Amends:** ADR-000 §7, ADR-003 §4.4, ADR-002 §4.5, ADR-001 §3.9.
**Context:** the shared zod schema in `lib/` validates "not after today", but `APP_TIME_ZONE` was a server-only environment variable that the browser cannot read.
**Decision:**
- Remove `APP_TIME_ZONE` from the environment variables.
- `src/lib/time.ts` exports `APP_TIME_ZONE = "Europe/Warsaw"` and `todayInAppZone(now: Date): string` (ISO `YYYY-MM-DD`).
- The shared schema is a factory: `createCaseFormSchema({ today })`. The client calls it with `todayInAppZone(new Date())`, and so does the server per request.
- `DateRules` takes `referenceDate` as a parameter. It does not depend on `server/config`.

### A8. API response shapes: ADR-003 §5 is authoritative
**Amends:** ADR-000 §6.
**Decision:** the ADR-000 §6 table is an overview only.
- `POST /api/cases` returns `201 { caseId, summary }`, with `thumbnailDataUrl` **inside** `summary` (ADR-003 §4.2, §5.1).
- `/analysis` returns `{ status, findingsSource, photoUsable }`.
- `/decision` returns `{ status, decision, decisionLabel, citedRules, firstMessage }`.

### A9. `DecisionRecord` is a union by origin
**Amends:** ADR-000 §5, ADR-002 §4.3.
**Decision:**
- `DecisionRecord` is a zod discriminated union on `origin`. Common fields: `decision`, `citedRules` (min 1), `forcedBy`, `createdAt`.
  - `origin: "initial"` adds `greeting`, `justification`, `nextSteps` and `modelDecision`.
  - `origin: "chat_update"` adds `reason` (required).
- `justification` and `nextSteps` do not exist on chat updates.

### A10. Date facts for complaints (Complaint Policy C2.3)
**Amends:** ADR-002 §4.5, §3.4 step 3.
**Context:** C2.3 covers cosmetic defects reported within 14 days of purchase. ADR-000 §8.5 says LLM date arithmetic is unreliable.
**Decision:**
- `DateRuleResult.daysSincePurchase` is computed for **both** case types.
- For complaints, `withinCosmeticWindow = daysSincePurchase ≤ 14` is added.
- Both values go into the decision and chat prompts as facts.
- C2.3 is **not** a forced guard, because whether a defect is cosmetic is a judgment for the model.

### A11. Client-side photo format check by content
**Amends:** ADR-004 §3.2 (Photo row).
**Context:** PRD AC-08 requires detection from content. The browser `File.type` is derived from the extension.
**Decision:**
- The client reads the first 12 bytes of the file (`file.slice(0, 12).arrayBuffer()`) and accepts only these signatures:
  - JPEG `FF D8 FF`
  - PNG `89 50 4E 47 0D 0A 1A 0A`
  - WebP `RIFF????WEBP`
- `File.type` and the extension are ignored.
- The `accept` attribute stays as a picker hint only. The server check (ADR-003 §3.2) remains authoritative.

### A12. Captures are raw HTTP; new spike S5; S4 covers `regenerate()`
**Amends:** ADR-000 §8.10, §10 (Philosophy).
**Context:** `AGENTS.md` requires verbatim captures: status, headers and body. Before this amendment, captures existed only for screening (S1) and vision (S2), but mocks are also needed for the decision call and the chat stream.
**Decision:**
- Spikes S1, S2 and S5 send their requests with direct `fetch` to OpenRouter.
  - Each capture file stores the date, target URL, model, request body (with the image data URL shortened to its first 64 characters), HTTP status, response headers (without `authorization`, cookies or any key) and the verbatim body.
  - Streaming bodies are stored as the raw SSE text.
- The adapter under test may still use the provider SDK. Mocks are derived from the raw captures.
- **New spike S5:**
  - a non-streaming decision call with the `DecisionOutput` JSON schema
  - a streaming chat call where the model calls `updateDecision`
  - Results go to `app/tests/fixtures/captures/s5-*`.
- **S4 also covers:** `regenerate()` after a failed request whose last message is the user's. Record the request body, which must be `{ message: <last user message>, trigger: "regenerate-message" }`, and the client state after the retry.

### A13. E2E context check does not assert model wording
**Amends:** ADR-004 §8 (E2E happy path row).
**Decision:**
- The follow-up "Jaka była data zakupu?" passes when the reply contains the purchase date in any of these formats: ISO `YYYY-MM-DD`, `dd.MM.yyyy`, or Polish long form (e.g. "23 listopada 2026").
- Any other wording is checked in manual QA, not E2E.

### A14. Deprecated-API check runs locally in `pnpm verify`
**Amends:** ADR-000 TAC-07.
**Context:** the application has no CI pipeline.
**Decision:**
- An ESLint `no-restricted-syntax` / `no-restricted-imports` rule fails on `toUIMessageStreamResponse`, `generateObject`, `streamObject` and `type: "image"` content parts.
- It runs inside `pnpm lint`, and therefore inside `pnpm verify`.

### A15. Chat server budget leaves a margin
**Amends:** ADR-002 §3.5, §3.7.
**Decision:**
- Chat `timeout.totalMs` is **58 000**; `firstChunkMs` stays 20 000.
- The 2 s margin is the same as in the processing stages, so the server error arrives before the 60 s of PRD AC-35.

### A16. Purchase-date lower bound
**Amends:** ADR-003 §4.4.
**Decision:**
- The 1990-01-01 lower bound stays, as a guard against typing errors.
- Its message is "Podaj prawidłową datę zakupu." and it lives in `lib/i18n-pl`. The date picker disables dates before 1990-01-01.

### A17. Synthetic test files are allowed only for validation tests
**Amends:** ADR-001 §3.7 and §8, ADR-003 §8.
**Decision:**
- Tests of file validation that never reach a model may use synthetic files in `app/tests/fixtures/files/` or buffers generated in the test. This covers format, size, a corrupt or truncated file, and the sharp smoke test. Examples: a 10 485 761-byte buffer with a JPEG header, a text file named `.jpg`, a truncated JPEG.
- Anything sent to a model, and image-processing assertions on real photos, use only the unmodified files in `assets/example-images/`.
- `assets/example-images/README.md` states the same rule.

### A18. In-ear hygienic seal (Return Policy R3.1)
**Amends:** ADR-002 §3.6 (`vision-return.md`, `decision-return.md`, `chat-system.md`).
**Decision:**
- For category `audio`, the return prompts say that a hygienic seal cannot be verified from a photo (PRD §12).
- The agent must not approve by claiming the seal is intact. It asks about the seal in the chat or chooses `manual_review`.

### A19. Location of domain schemas, errors and logging
**Amends:** ADR-000 §3 (repository structure), §4.
**Context:**
- `rules` (guards) and `ai` (decision, chat) both use `ImageFindings` and `DecisionRecord`. Putting the schemas in `server/ai` would create a `rules ↔ ai` import cycle.
- ADR-002 and ADR-003 name error classes and a logger without a module.

**Decision:**
- `ScreeningResult`, `ImageFindings`, `DecisionOutput`, `DecisionRecord` and `DateRuleResult` (zod schemas + inferred types) live in `src/lib/schemas/domain.ts`. They contain no secrets, and `lib` is the bottom of the dependency graph.
- `ApiError` and `Ai*Error` live in `src/server/errors.ts`. `StageLogger` lives in `src/server/logging.ts`. Both have the `server-only` guard.

### A20. TypeScript rules are the same for every agent
**Amends:** ADR-001 §3.4, §3.11.
**Decision:**
- No `any`. No type assertions (`as T`, `<T>x`), except `as const`.
- Narrow unknown data with zod parsing or type guards.
- Annotate exported function parameters and return types; local variables may use inference.
- T01 writes this rule into `app/AGENTS.md`. `.github/instructions/TypeScript-React.instructions.md` is aligned with it.

### A21. Browser coverage for PRD AC-38
**Amends:** ADR-001 §3.7.
**Context:** PRD AC-38 lists desktop Chrome, Firefox and Edge, and mobile Chrome and iOS Safari. Before this amendment, the Playwright config ran Chromium only.
**Decision:**
- Keep the Chromium desktop project and the 360×800 mobile viewport project.
- Add `firefox` and `webkit` projects for the smoke spec and the return happy-path spec only, so AI credit use stays small.
- Install the browsers with `pnpm exec playwright install chromium firefox webkit`.
- Edge is covered by Chromium. Real iOS Safari and real Android devices are not available on the course VM. WebKit at 360 px approximates iOS Safari. This is a documented residual risk.

### A22. Certainty of yes/no (`noul`) screening answers
**Amends:** ADR-002 §3.2 (answer mapping), §6.1.
**Context:** spike S1 (2026-11-26, `app/tests/fixtures/captures/s1-findings.md`) showed that the Decisions API returns `confidence` only for `score` and `choice` answers. A `noul` answer carries only the probability of true (`answers.<key>.noul`), with no `confidence` and no `probabilities`.
**Decision:**
- For a `noul` area the confidence is derived as `max(p, 1 − p)`. The area is certain when that value is `≥ SCREENING_CONFIDENCE_THRESHOLD` (default 0.8), so `p ≥ 0.8` or `p ≤ 0.2`.
- `score` and `choice` areas keep using the `confidence` returned by the API.
- The stored `ScreeningArea.confidence` holds the derived value for `noul` areas, so the stage log stays comparable across types.
- Cost accounting: when `usage.cost` is 0 because the key is BYOK, the stage log records `usage.cost_details.upstream_inference_cost` instead.
- Decided by the product owner on 2026-11-26 (gate G2).

### A23. Screening model: Jev 1.14 instead of Luna Decisions
**Amends:** ADR-000 §3 (technology stack), §7 (`DECISIONS_MODEL` default), §8.3; ADR-002 §3.2; ADR-003 §3.2 step 6; A22.
**Context:** on 2026-11-26 the product owner asked to replace `openai/gpt-6-luna-decisions` with `typesafe/jev-1.14` (https://openrouter.ai/typesafe/jev-1.14). Jev is served by the same Decisions API (`POST /api/alpha/decisions`, typed `noul`/`choice`/`score` answers with calibrated probabilities), so `ScreeningPort` and the escalation design stay.
**Decision:**
- `DECISIONS_MODEL` defaults to `typesafe/jev-1.14`. The adapter, question sets and escalation policy are unchanged in shape.
- Jev accepts only PNG/JPEG data URLs with each side between 256 and 1568 px. The AI image is therefore resized so its longer side is at most **1568 px** (was 1600 px), for every model. Photos whose shorter side falls below 256 px make the screening call fail; the stage then escalates to the vision model (ADR-002 §3.3), which is the designed fallback.
- The Jev capture (`s1-jev-findings.md`) shows `noul` answers **without** `confidence`, as with Luna, so the A22 rule `max(p, 1 − p)` applies. The adapter would use an API `confidence` if one appeared.
- Jev returns fractional `score` values (e.g. 3.95); the adapter rounds them to the nearest bucket index.
- The Luna captures (`s1-*`) stay as history; the screening tests replay new Jev captures (`s1-jev-*`).
- Decided by the product owner on 2026-11-26.

---

## 3. Consequences

- (+) Every finding from the 2026-11-26 review has a single authoritative answer.
- (+) The plan's briefs can cite one amendment ID instead of reconciling several ADRs.
- (-) Agents must read this ADR together with the amended ADRs. Mitigation: each amended ADR has a header note pointing here.

**Review trigger:** fold the amendments into ADR-000 – ADR-004 if the ADR set is rewritten after the PoC.
