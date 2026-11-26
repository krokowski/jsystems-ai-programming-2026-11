# Implementation Plan — Hardware Service Decision Copilot PoC (whole application)

> **Status: Accepted** (2026-11-26, by the product owner). Execution (T01 onwards), new agents, issue creation and merge still need an explicit go-ahead from the user.

**Date:** 2026-11-26 · **Author:** orchestrator (Claude Code, Opus 5.5) · **Scope:** the whole PoC defined in [PRD] and [ADR-000]–[ADR-004]

Requirements are linked, not copied. Where a source is silent or contradicts itself, the gap is listed in [§9](#9-unresolved-decisions). It is not hidden in a plan assumption.

---

## 1. Sources used

| Source | Path | State on 2026-11-26 |
|---|---|---|
| PRD | [`docs/PRD.md`][PRD] | Committed (9e5a88a). AC-01…AC-39 |
| ADR set | [`docs/ADR/000`][ADR-000], [`001`][ADR-001], [`002`][ADR-002], [`003`][ADR-003], [`004`][ADR-004] | Status *Accepted*, but **untracked in Git** |
| ADR amendments | [`docs/ADR/005-amendments.md`][ADR-005] (A1–A21) | *Accepted* 2026-11-26 (D12). Takes precedence over 000–004 |
| Policies | [`docs/policies/return-policy.md`][RET], [`complaint-policy.md`][COMP] | Committed. Rule IDs R1.1–R6.2 and C1.1–C6.2 present (grep-verified) |
| Design | [`docs/design-guidelines.md`][DG], [`assets/design-tokens.json`][TOK], [`assets/homepage.png`][HOME] | Committed on `design-system` (PR #1, open) |
| Repo rules | [`AGENTS.md`][AGENTS] (TDD, Manual QA, commit rules) | Applies to every task |

`course-materials/` was not read. It is not a requirement source.

## 2. Baseline: what exists (inspected 2026-11-26)

| Item | Observed |
|---|---|
| Branch | `design-system`, 24 files ahead of `main`. Open PR #1 (design system → `main`) |
| Working tree | Only `?? docs/ADR/` (5 files). Nothing else modified |
| `app/` | Only `README.md`, which holds the course checklist. No `package.json`, no source, no tests, no entry points |
| Tests / build | **None exist, so no baseline test or build can run.** Baseline failures: none, because no runnable commands exist yet |
| Node / Corepack | `node v24.22.3`, `corepack 0.36.0` (both verified) |
| pnpm | **Missing.** [ADR-001] §3.2 step 1 activates it through Corepack |
| Playwright CLI | `playwright-cli 0.1.25` (verified) |
| GitHub CLI | `gh 2.105.0`. Issues are **disabled** on `krokowski/jsystems-ai-programming-2026-11`. The token cannot read Projects |
| Codex CLI | `codex-cli 0.162.1`. `-m/--model` exists. No model is pinned in `.codex/config.toml` |
| Copilot CLI | **Not installed** (`gh copilot` reports that the CLI was not found) |
| Agent mechanism | Claude Code's Agent tool supports a per-agent `model` (`haiku`/`sonnet`/`opus`) in this harness. There are no custom roles in `.claude/agents/` |
| Secrets | A root `.env` exists. It was **not read**, so whether a key is present is unverified. Next.js in `app/` reads `app/.env.local` ([ADR-001] §3.9), and that file does not exist yet |
| Briefs folder | `.agent-briefs/` is gitignored ("Private agent briefs"). It is durable on disk but not versioned. This fits sensitive briefs, and the plan relies on it |

**Commands that will exist after T01** (from [ADR-001] §3.8, all run in `app/`): `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm verify`. They are *unverified until T01's acceptance*. Until then, none is claimed to work.

## 3. Decisions taken in this planning session

| # | Decision | Source |
|---|---|---|
| D1 | Commit the ADRs and this plan on `design-system` (docs only). Then branch `feature/hsdc-poc` from it. The feature PR targets `main` after PR #1 merges, or is stacked on it | User, 2026-11-26 |
| D2 | Track execution status in **GitHub Issues**, one per matrix row. The user enables Issues first. The orchestrator creates the issues only after the plan is approved | User |
| D3 | Return window: `referenceDate − purchaseDate ≤ 14` calendar days. A purchase on 1 Nov can be returned until 15 Nov inclusive | User; recorded as [ADR-005] A2 |
| D4 | The first message follows [ADR-002] §4.4: five parts, including a `data-decision` badge part | User; recorded as [ADR-005] A1 |
| D5 | i18n is split into per-area files under `src/lib/i18n-pl/` (`common`, `form`, `processing`, `chat`, `decision`) behind one `index.ts`. Screens can then be built in parallel without editing one shared strings file | Orchestrator. Implements [ADR-004] §3.6 with no change in meaning |
| D6 | The case service has one file per stage (`create`, `analyze`, `decide`, `chat`) behind a small facade. Route tasks can then proceed without serializing on one file | Orchestrator. Implements [ADR-003] §3 `CaseService` |
| D7 | The findings of the document consistency review are resolved in [ADR-005] (A1–A20) and in direct fixes to the PRD (AC-22 exception), `AGENTS.md`, the Copilot TypeScript instructions and `assets/example-images/README.md`. Every brief cites amendment IDs where they apply | User asked for the fixes, 2026-11-26. ADR-005 still needs acceptance at G0 |
| D8 | Use the Asseco logo (`assets/logo.svg`, `logo-dark.svg`) and the Geomanist fonts (`assets/fonts/geomanist/`) in the app, as [ADR-001] §3.10 specifies. The app is run locally only and is never deployed or published. The user is an Asseco employee | User, 2026-11-26; resolves U3 and the [DG] licence notice for this PoC |
| D9 | OpenRouter spending cap: **US$5 in total** for S1, S2, S5, S6, T45, E2E and Manual QA. The orchestrator sums `usage.cost` from the captures and stage logs, records the running total in the tracker after each paid step, and stops before a step that could exceed the cap | User, 2026-11-26; resolves U5 |
| D10 | The Manual review badge ("Do weryfikacji przez pracownika") uses the Asseco blue accent `brand.accent` `#00AEE8`, plus its own icon, so colour is never the only signal. Approve uses `brand.success`, Reject uses `brand.error`, each with its own icon | User, 2026-11-26; resolves U7 |
| D11 | GitHub Issues are enabled on `krokowski/jsystems-ai-programming-2026-11` (verified with `gh repo view`, 2026-11-26) | User; prerequisite of D2 |
| D13 | Test reality rules TR1–TR5 (§5): E2E and Manual QA exercise the real app, endpoints, LLM calls and decision paths with log evidence. Unit and integration tests replace only the external OpenRouter calls, with replays of raw captures (S1, S2, S5, S6). Frontend HTTP mocks come only from captures of the real running app (T45). Uncapturable shapes are reported, never invented | User, 2026-11-26 |
| D12 | [ADR-005] accepted in full, including A21. The recommendations for U1, U8, U9 and U10 are accepted: (U1) if PR #1 is still open at T63, the feature PR targets `design-system`, otherwise `main`; (U8) Firefox and WebKit Playwright projects per A21; (U9) QA screenshots are committed under `docs/qa/`; (U10) no Prettier, marked N/A in the `app/README.md` checklist | User, 2026-11-26 |

## 4. Execution model

**Roles.**
- **Orchestrator** (this Claude Code session, Opus 5.5):
  - owns every architectural call and resolves contradictions
  - writes the briefs and reviews every diff
  - reproduces the checks
  - is the only role that runs Git writes (branch, stage, commit) in the shared checkout
- **Workers** are ad hoc subagents. No custom role files: each task is one-off, so an exact brief matters more than a role definition. Workers:
  - edit only their listed files
  - return a summary and the observed command output
  - never run `git add/commit/checkout/stash/restore`, and never change scope or accept their own work
  - report contradictions instead of resolving them
- **Human:** approves the plan, phase gates, spending, push and PR, and does the final acceptance.

**Model policy (worker lanes).**

| Lane | Model / provider | When | Budget constraint |
|---|---|---|---|
| Default worker | **Claude Code Haiku 5.5** (Agent tool `model: "haiku"`), Anthropic | Bounded implementation and test-writing with an exact brief | Max 1 retry with a corrected brief. Then escalate |
| Escalation worker | Claude Code Sonnet 5.5 (`model: "sonnet"`) | After evidence that Haiku cannot do the task (2 failed verifications, or the task needs judgment such as prompt wording) | Only for the rows marked *(S)* or after escalation |
| Alternative cheap lane | **Codex Luna** via `codex exec -m <luna-id>`, OpenAI | Only if the Claude lane is unavailable. Check the exact model ID in Codex's `/model` picker at dispatch and record it in the issue | Same brief, same file ownership |
| Copilot lane | **Not selected.** The Copilot CLI is not installed, so its model picker cannot be checked | Before using it: install the CLI, open the model picker, check current official pricing at <https://docs.github.com/en/copilot/concepts/billing/copilot-requests>, and record the model and multiplier in the issue. Do not rely on an old "0x" list | — |
| Review and acceptance | Opus 5.5 (fresh-context reviewer) + human | Every phase gate and the final PR | — |

OpenRouter spending (spikes S1/S2/S5/S6, T45 captures, E2E, Manual QA) uses real credits. The cap is US$5 in total (D9).

**Concurrency rules.**
- One checkout. No worktrees: every parallel batch below has disjoint editable files.
- Each brief names the tasks running concurrently and their files.
- `package.json`, `pnpm-lock.yaml`, `src/lib/**`, config files, `page.tsx`/`layout.tsx`, `app/AGENTS.md`, `app/README.md` and `.env.example` are **serialized** (see [§6](#6-shared-file-hotspots)).
- A worker that needs a new dependency or a contract change **stops and reports**.
- Dev servers in parallel tasks use distinct ports (3001, 3002, …).

**Briefs (after authorization).** Just before dispatch, the orchestrator writes `.agent-briefs/<task-id>.md`. Each brief contains:
- the goal and the observable outcome
- the exact editable files and the read-only context files
- the relevant source excerpts: the current contract types, predecessor outputs and capture snippets
- ordered steps: failing test → implementation → checks
- test inputs and expected results
- concurrent work, the forbidden actions (Git writes, new dependencies, scope changes) and the report format

Briefs link [PRD]/ADR sections for traceability, but inline what the worker needs. A Haiku worker must not have to rediscover the architecture.

**Acceptance loop (every row).**
1. The worker reports.
2. The orchestrator reads the diff (`git diff -- <owned files>`) and checks that no file outside ownership changed (`git status`).
3. The orchestrator re-runs the row's checks and confirms that the new test failed before the implementation:
   - the worker attaches the red run output, showing the failure reason;
   - for rows on the critical path, the orchestrator reproduces the red run itself: it temporarily stashes only the production files (`git stash push -- <production files>`), runs the new test, restores them with `git stash pop`, and re-runs it green.
4. Commit `Area: summary` with named paths only.
5. Update the issue.

## 5. Dependency matrix (authoritative)

Status lives in GitHub Issues (D2). Issue numbers are added to the *Task* cells when the issues are created. A commit boundary is **one commit per row**, unless the row says otherwise. Every commit runs `pnpm verify` (from T01 on) plus the row's checks.

**Manual QA after every row that changes the running app** ([AGENTS] Manual QA):
- **API rows (T40–T43):** start `pnpm dev`. Send the row's main request with `curl`, using an example image and synthetic fields. Record the status and body in the issue. AI-dependent requests need the key (U4).
- **UI rows:** take a Playwright CLI screenshot of the touched screen at 1280 and 360 px. T51–T53 build components that are not mounted on the page until T54, so their QA is done in T54, which covers all three screens.
- **Rows that change no runtime behaviour** (pure modules, tests, docs) need only their automated checks.

### Test reality rules (authoritative, D13)

These rules override any row below that seems to allow otherwise.

- **TR1. E2E and Manual QA use only the real application.**
  - E2E runs against `pnpm build && pnpm start`. Manual QA runs against `pnpm start` or `pnpm dev`.
  - Both use the real OpenRouter models from `app/.env.local`, the real policy files, the real case store and the unmodified photos in `assets/example-images/`.
  - Forbidden in `app/tests/e2e/` and in QA runs: network interception (`page.route`, `context.route`, `route.fulfill`), mock servers, MSW, stubbed AI flags, `NullScreening`, and any test-only code path in the app.
  - Check: `grep -rnE 'page\.route|context\.route|route\.fulfill|msw|[Mm]ock' app/tests/e2e` must be empty.
- **TR2. A skipped AI spec is not a pass.**
  - Specs may skip locally when the key is missing ([ADR-001] §5).
  - T60 is accepted only with **0 skipped and 0 `fixme`**. A missing key leaves T60 *blocked*, not green.
- **TR3. Real coverage is proven, not assumed.**
  - Between them, T60 and T61 must exercise for real:
    - every endpoint (`POST /api/cases`, `/analysis`, `/decision`, `/chat`);
    - every LLM call type (Luna Decisions screening, escalated vision, decision with structured output, streaming chat, the `updateDecision` tool);
    - every decision method in the [coverage matrix](#real-coverage-matrix-t60--t61).
  - Evidence is the server's stage log line for each call (stage, model ID, path, `forcedBy`, decision, `usage.cost` > 0), attached to the QA report next to the screenshots.
- **TR4. Mocks only at the OpenRouter boundary, only from real captures.**
  - Unit and integration tests may replace **only** the external OpenRouter HTTP calls ([AGENTS] Test Strategy).
  - Every repository, rule, guard, policy file, prompt, image step and route handler under test is the real code.
  - The replacement must replay **raw captures**: S1, S2, S5 and the error captures in S6.
  - Preferred mechanism: pass a replaying `fetch` to the OpenRouter provider and the Decisions adapter, so the real provider and adapter parsing runs. T25 verifies with Context7 that the provider accepts a custom `fetch`. If it does not, use `MockLanguageModelV4` / a `ScreeningPort` fake whose outputs come from the same captures.
  - Each fixture names its source capture.
  - A *derived* fixture may only change values inside the captured structure: a decision enum value, a confidence number, the text of a structured-output field, or removing one answer from a captured list. It may never add fields, event types or status codes that were not captured.
  - A failure that cannot be captured on demand (5xx, mid-stream error) is tested with a real non-HTTP failure: abort, timeout, or a refused connection to a closed port. Otherwise it is reported as a gap. It is never invented from documentation.
- **TR5. The app's own API is mocked only from captures of the running app.**
  - Component tests that mock `fetch` or the chat transport use responses recorded from the real running app in **T45**, not shapes copied from the ADRs.
  - T51–T53 test their screens through props and real shared code (schemas, `FirstMessageComposer`), with no HTTP mocks. All HTTP-level component tests live in T54.

#### Real coverage matrix (T60 + T61)

| What must run for real | Scenario on the real app | Evidence |
|---|---|---|
| `POST /api/cases` 201 / 422 / 413 | Valid case; invalid fields; a file over 10 MB | Network log, screenshots |
| Luna Decisions screening | Any case with `ANALYSIS_ESCALATION=auto` | `stage=analysis` line with `DECISIONS_MODEL`, confidences, cost |
| Escalated vision call | Return happy path re-run with `ANALYSIS_ESCALATION=always` (a real config of the app, not a mock) | `path=escalated` line with `VISION_MODEL`, cost |
| Fast path (no vision call) | Observed under `auto` if the screening is certain | `path=fast` line. If it never occurs in the runs, it is recorded as *not observed* |
| Model-decided decision + cited-rule validation | Return `phone-1.jpg`, purchase today − 3; complaint `laptop-1.png` with a reason, purchase today − 14 months | `stage=decision`, `forcedBy=null`, valid rule IDs |
| Forced reject by date rule | Return purchased today − 30 (R1.1); complaint purchased today − 25 months (C1.1) | `forcedBy=date_rule` |
| Forced Manual review by category mismatch | `phone-1.jpg` declared as category *Laptop* | `forcedBy=category_mismatch` if the real model reports a mismatch. Otherwise record the model's actual verdict |
| Forced Manual review by unusable photo | Needs a real unusable photo (U11) | `forcedBy=unusable_photo`, or a documented gap covered only by integration tests |
| Streaming chat with full context | Follow-up "Jaka była data zakupu?" | `stage=chat` line, date in the reply (A13) |
| `updateDecision` accepted | Complaint case; the customer adds a new fact that changes the outcome under the policy | `data-decision` in the stream, badge updated, `origin=chat_update` |
| `updateDecision` refused by a guard | Date-rejected return; the customer asks to approve anyway | Tool not called, or called and refused (`accepted:false`). Both are recorded. The decision must stay unchanged |
| AI failure path | App restarted with an invalid key | 502 with the AC-34 message, then successful retry after a restart with the valid key |

Abbreviations: *(H)* = Haiku worker, *(S)* = Sonnet worker, *(O)* = orchestrator, *(Hu)* = human.

### Phase 0 — Docs gate

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T00** Commit the approved docs, then branch | ADR-000…005 (ADR-005 already *Accepted*, D12), the PRD AC-22 exception, `AGENTS.md`, the Copilot TS instructions, the example-images README and this plan (status *Accepted*) are tracked | [ADR-005]; PRD AC-22 | Plan and ADR-005 approved at G0 | (O) | `docs/ADR/*.md`, `docs/PRD.md`, `docs/plans/hsdc-poc-implementation-plan.md`, `AGENTS.md`, `.github/instructions/TypeScript-React.instructions.md`, `assets/example-images/README.md` | Diff review, relative-link check (`grep -o '](\.\./[^)]*'` + `test -e`). As the user asked on 2026-11-26: two commits on the new branch `docs/hsdc-implementation-plan` (from `design-system`): `Docs: add ADRs and consistency amendments` and `Docs: add implementation plan`. Pushed, with a PR into `design-system`. `feature/hsdc-poc` is created from it at T01, after the user's go-ahead |

### Phase 1 — Scaffold (serial; owns lockfile and config)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T01** Scaffold the Next.js project | `pnpm verify` exits 0 on the empty app. `pnpm dev` serves `/` with HTTP 200 | [ADR-001] §3.2 steps 1–12, §3.3–3.9, TAC-001-01…06; [ADR-005] A7 (no `APP_TIME_ZONE` variable), A14 (deprecated-API lint rule), A20 (TypeScript rules in `app/AGENTS.md`) | T00 | (H), escalate to (S) | everything under `app/` created by the tools; `app/README.md` (merge the checklist back); `app/AGENTS.md` ([ADR-001] §3.11); root `.env.example` | Move `app/README.md` to an explicit path outside `app/` (e.g. `/tmp/app-README.md`), not to a session scratchpad. A lint fixture proves the A14 rule fails on `generateObject`. 1 trivial passing test per Vitest project (`unit`, `ui`); sharp resize smoke test; ESM import test for `file-type` and the provider. Record separately: the install result (`pnpm install --frozen-lockfile`), `pnpm verify` (counts), and dev startup (`curl -sI localhost:3000`). `git check-ignore app/.env.local`. Commit `App: scaffold Next.js project` |
| **T02** Brand shell | The layout has Polish `<html lang="pl">`, Geomanist fonts, the logo header and the favicon. Tokens are mapped to Tailwind `@theme` and to the shadcn variables | [ADR-001] §3.10; [DG] Colors, Typography, Header, Logo usage; PRD §9.1 header | T01; D8 (brand assets approved) | (H) | `app/src/app/globals.css`, `app/src/app/layout.tsx`, `app/src/app/fonts/*`, `app/src/app/icon.png`, `app/public/logo*.svg` | Component test: the header renders the logo with alt text and the title. Playwright CLI screenshots at 1280 and 360, compared to [HOME]. Commit `Frontend: apply brand shell` |
| **T03** E2E specs first (red) | The Playwright specs for the [ADR-004] §8 E2E rows and the smoke test exist. Before committing, they are run without markers and **fail for the expected reason** (missing UI), except the smoke test | PRD AC-01, AC-05, AC-09, AC-20, AC-24/25, AC-29, AC-32/33, AC-38; [ADR-004] §8 E2E rows; [ADR-000] §10 scenarios 1, 2; [ADR-005] A13 (date formats), A17 (synthetic files) | T01 | (H) | `app/tests/e2e/*.spec.ts`, `app/tests/fixtures/files/*` (synthetic non-image files, A17) | Red run output attached. To respect [AGENTS] "commit only after verification passes", each not-yet-implemented spec is then marked `test.fixme('pending T54: <reason>')`, so `pnpm test:e2e` is green with the fixme specs reported as skipped. T60 removes every `fixme`, and its acceptance check is `grep -r 'test.fixme' app/tests/e2e` = empty. AI specs skip with a message when there is no key ([ADR-001] §5); such a skip never counts as a pass (TR2). Specs drive only the real UI against the real server: no route interception or mocks (TR1, grep check in the row). Commit `Test: add pending E2E specs` |

### Phase 2 — Verification spikes ([ADR-000] §8.10). One-time gate; needs the OpenRouter key (U4) and credits (cap per D9)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **S1** Luna Decisions capture | A verbatim response for one return and one complaint question set: `confidence`/probabilities shape, refusal shape, `usage.cost`. Verdict: `decisionModel()` usable or the `fetch` fallback | [ADR-000] §8.3, §8.10; [ADR-002] §3.2; [ADR-005] A12 | T01, key in `app/.env.local` | (H) runs; (O) decides | `app/scripts/spikes/s1-decisions.ts`, `app/tests/fixtures/captures/s1-*.json` | The capture is **raw HTTP via direct `fetch`** (A12): date, target, model, request, status, headers without `authorization` or cookies, and the verbatim body. A second call through `decisionModel()` gives the SDK verdict. `grep -rL 'sk-or' captures/` lists every file (no key present). The orchestrator records the adapter choice in the T30 brief. If it changes the design, this is an ADR note for the user. Commit `Test: add Luna Decisions captures` |
| **S2** Vision and structured-output capture | Does `LLM_MODEL` accept a `file` image part? Does it honour a JSON schema with `require_parameters`? Is `data_collection: deny` routable? | [ADR-000] §8.10 S2, §8.11; [ADR-002] §3.7; [ADR-005] A12 | T01, key | (H) runs; (O) decides | `app/scripts/spikes/s2-vision.ts`, `app/tests/fixtures/captures/s2-*.json` | As S1 (raw HTTP). A negative outcome stops the vision tasks until the user picks `VISION_MODEL` (U6). Commit `Test: add vision model captures` |
| **S3** 10 MB upload | A 10 MB multipart upload reaches a route handler in `dev` and `start`. 10 MB + 1 byte is observable | [ADR-003] §6.1; TAC-003-02 | T01 | (H) | a temporary `app/src/app/api/spike-upload/route.ts` (deleted before the commit), `app/tests/fixtures/captures/s3-upload.md` | Run on port 3001. Record status codes. If a limit is found, (O) adds the config line to `app/AGENTS.md` in T01's file scope. Commit `Test: record upload size spike` |
| **S4** `useChat` seeding, `regenerate()` and PromptInput keys | A seeded `messages` list is not re-sent. `prepareSendMessagesRequest` sends only `{message, trigger}`. After a failed request, `regenerate()` sends `{ message: <last user message>, trigger: "regenerate-message" }`; the client state afterwards is recorded. Enter/Shift+Enter behaviour is known | [ADR-004] §3.4, §6.3; PRD AC-27, AC-35; [ADR-005] A12 | T01 | (H) | a temporary `app/src/app/spike-s4/*` (deleted), `app/tests/fixtures/captures/s4-usechat.md` | Run on port 3002. Network body captured with the Playwright CLI. Findings go into the T53 brief. Commit with S3 |
| **S5** Decision and chat captures | Raw capture of: (a) a non-streaming decision call with the `DecisionOutput` JSON schema; (b) a streaming chat call (raw SSE) where the model calls `updateDecision`, with reasoning enabled as in production (`low`), so that any reasoning events the model really sends are in the capture | [ADR-005] A12; [ADR-002] §3.4, §3.5, §4.3 | T01, key; schema draft from T10 for (a), so S5 may start once T10 is committed | (H) runs; (O) decides | `app/scripts/spikes/s5-decision-chat.ts`, `app/tests/fixtures/captures/s5-*` | As S1. If the model never calls the tool in 3 attempts, record that. T35 then mocks only the observed shapes and the risk goes to G2. Commit `Test: add decision and chat captures` |

| **S6** Real error captures | Raw captures of real OpenRouter failures for both endpoints (Chat Completions and Decisions): 401 with an invalid key; 400 with an unknown model ID; a refusal answer from Luna Decisions if one can be provoked with a real photo and a question it should refuse | TR4; [ADR-002] §3.7, §5; [ADR-003] §6.3 | T01, key | (H) runs; (O) decides | `app/scripts/spikes/s6-errors.ts`, `app/tests/fixtures/captures/s6-*` | As S1. Shapes that cannot be produced on demand (5xx, 429, mid-stream error, refusal if not provoked) are listed as *not captured* in `captures/README.md`. Tests for them follow TR4 (real non-HTTP failure, or a reported gap). Commit `Test: add OpenRouter error captures` |

S1–S4 and S6 run in parallel: disjoint files, distinct ports. S5 runs after T10, in parallel with batch A. Every capture file lists its source request and date. `app/tests/fixtures/captures/README.md` (owned by (O)) indexes them and lists the shapes that were not captured.

### Phase 3 — Shared contracts (serialized hotspot)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T10** Schemas and i18n | One zod form schema with the PRD messages. Enums for the 9 categories, the case types and the decisions. `AppUIMessage` + the `data-decision` schema. API error shape. Domain schemas in `src/lib/schemas/domain.ts`, with `DecisionRecord` as a union by origin and `signsOfUse` nullable. `src/lib/time.ts` with the time-zone constant and `todayInAppZone`. The schema factory `createCaseFormSchema({ today })`. All PRD Polish strings, split as in D5, plus the A16 message | PRD AC-01…AC-11, AC-17, AC-25, AC-30, AC-34…AC-37, §9, §11 disclaimer; [ADR-003] §4.3–4.4; [ADR-004] §3.6, §4; [ADR-002] §4; [ADR-005] A4, A5, A7, A9, A16, A19 | T01, ADR-005 accepted | (H); (O) reviews the contract line by line | `app/src/lib/schemas/**`, `app/src/lib/time.ts`, `app/src/lib/i18n-pl/**` | Red, then green, unit tests: boundaries (product name 1/2/100/101 after trim; complaint reason 9/10; return reason empty; future date relative to the injected `today`; date before 1990 → A16 message); `todayInAppZone` at 23:30 UTC returns the next day in Warsaw; the `data-decision` schema has no disclaimer field. The disclaimer string equals PRD §11 byte for byte. Category order equals AC-03. Commit `Shared: add case schemas and Polish strings` |
| **T11** Server config | Env validated with zod at first use. Missing `OPENROUTER_API_KEY` → an error naming the variable, without the value | [ADR-000] §7; [ADR-001] §3.9, §5 | T01 | (H) | `app/src/server/config.ts` (+ test) | Unit tests: missing key, defaults (threshold 0.8, TTL 120, `auto`), invalid threshold. No `APP_TIME_ZONE` variable ([ADR-005] A7). The `server-only` guard is present. Runs **in parallel with T10**. Commit `Backend: add env config` |

### Phase 4 — Server domain units (parallel batch A; disjoint folders)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T20** DateRules | Calendar-day rule per D3. 24 months clamped to the end of the month. `daysSincePurchase` for both case types and `withinCosmeticWindow` for complaints. `referenceDate` is a parameter | PRD AC-20, AC-21, §8; [ADR-002] §4.5; [ADR-002] §8 *Date rules* row; [ADR-005] A2, A7, A10 | T10 (time helpers; no dependency on T11) | (H) | `app/src/server/rules/date-rules.ts` (+ test) | Tests: today−14 within, today−15 out; complaint −24 months within, −24 months −1 day out; 2024-02-29; complaint at day 14 / 15 → cosmetic window true / false. Commit `Backend: add date rules` |
| **T21** PolicyLoader | Loads both policies from `POLICY_DIR` and parses the rule-ID sets | [ADR-002] §3.1, §5; [ADR-000] §8.5 | T11 | (H) | `app/src/server/policies/**` | Tests against the real `docs/policies/*.md`: R1.1–R6.2 and C1.1–C6.2 found. R1.1 contains "14 calendar days". C1.1 contains "24 months". A missing file throws. Commit `Backend: add policy loader` |
| **T22** ImageIntake | Size check, magic-byte detection, decode, 1600 px JPEG q80 without metadata, 320 px thumbnail | PRD AC-08, AC-09, AC-16; [ADR-003] §3.2, §6.2; [ADR-000] §10 TAC-04; [ADR-005] A17 | T10 | (H) | `app/src/server/images/**` | Real photos for the processing assertions; synthetic buffers only for the format and size errors (A17). Tests: `laptop-1.png` (JPEG bytes) is accepted, longer side 1600, no EXIF on read-back; `phone-2.jpeg` is not enlarged; a text file and a truncated JPEG → `FORMAT_NOT_ALLOWED`; 10 485 761 bytes → `FILE_TOO_LARGE`. Commit `Backend: add image intake` |
| **T23** Case repository | `InMemoryCaseRepository` on `globalThis`: TTL, a 500-case cap, lazy sweep | [ADR-003] §3, §4.1; [ADR-000] §8.4 | T10 | (H) | `app/src/server/cases/repository.ts` (+ test) | Fake-clock tests: expiry → null; the 501st case evicts the oldest. Commit `Backend: add case repository` |
| **T24** Errors and logger | `ApiError`/`Ai*Error` mapping to the 4.3 body. `StageLogger` writes one JSON line with no free text or image data | [ADR-003] §6.3, §4.3; [ADR-000] §8.11; PRD AC-36 | T10 | (H) | `app/src/server/errors.ts`, `app/src/server/logging.ts` (location per [ADR-005] A19) (+ tests) | Tests: timeout/5xx/unknown → 504/502/500 with Polish messages; the body has no "OpenRouter", status digits or stack. Commit `Backend: add error mapping and stage logger` |
| **T25** Model registry and budgets | One provider; three model handles; common provider options; budget constants | [ADR-002] §3.1, §3.7; [ADR-000] §8.11 | T11, S1, S2 | (H) | `app/src/server/ai/models.ts`, `app/src/server/ai/budgets.ts` (+ tests) | Unit tests: options include `data_collection: deny` (unless S1/S2 ruled it out), `usage.include`; budgets 20/58/58/20 s ([ADR-005] A15). The registry accepts an injectable `fetch` (TR4). Verify with Context7 that `createOpenRouter` supports it, and record the outcome in the T30–T35 briefs. Commit `Backend: add model registry` |
| **T26** Prompt files | `vision-return/complaint.md`, `decision-return/complaint.md`, `chat-system.md`, each with a version header and delimited customer-data blocks. `PromptLibrary` | PRD §11 (allowed / not allowed, tone, disclaimer), §12 (R3.1 assumption); [ADR-002] §3.3–3.6, §6.2; [ADR-005] A3, A10 (date facts), A18 (hygienic seal) | T10 | **(S)**: prompt wording is product behaviour | `app/src/server/ai/prompts/*.md`, `app/src/server/ai/prompt-library.ts` (+ test) | Tests: placeholders filled; reason text inside the delimited block; "ignore all rules" stays inside the block; every file has a version. Review by (O) against PRD §11. Commit `AI: add prompt templates` |

Batch A runs concurrently: T20, T22, T23, T24 and T26 after T10; T21 after T11; T25 after S1/S2.

### Phase 5 — AI pipeline (parallel batch B)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T30** Screening adapter | `ScreeningPort` + `LunaDecisionsScreening`. Question sets per case type. Answer mapping and `certain` flags. Never throws on API errors | PRD AC-13, AC-14, AC-15; [ADR-002] §3.2, §5, §6.1 | S1, T25 | (H) | `app/src/server/ai/screening/{port,luna-decisions,questions}.ts`, `app/src/server/ai/prompts/screening-questions.{return,complaint}.json` (+ tests) | Tests replay the raw S1/S6 captures through the real adapter (TR4): mapping; 0.79/0.80 boundary and threshold 0.9 (derived values); a missing answer → `refused` (derived by removing one captured answer); a refusal → `refused` only if S6 captured one, otherwise listed as a gap; 401/400 captures → a result with `error` set, no throw; `Inne` wording. Commit `AI: add Luna Decisions screening` |
| **T31** Escalation and fast-path findings | `EscalationPolicy` and `FindingsFromScreening` (pure functions), using the A4 escalation table | [ADR-002] §3.3; [ADR-005] A4 (replaces the escalation table and TAC-002-04) | T10 | (H) | `app/src/server/ai/screening/{escalation,findings-from-screening}.ts` (+ tests) | Tests: `auto`/`always`/error; certain `photo_usable=false` → escalate; complaint with certain `damage_visible=true` → escalate; complaint without damage → skip with `signsOfUse=null`, `damageLocation=null`; `resellable` true at condition 1, false at 2. Commit `AI: add escalation policy` |
| **T32** VisionAnalysis | Escalated analysis with a `file` part, the signals and `Output.object` → `ImageFindings` (`source=llm`) | PRD AC-13…AC-15; [ADR-002] §3.3, §3.7; [ADR-005] A4 | S2, T25, T26 | (H) | `app/src/server/ai/vision/**` (+ tests) | Replay of the raw S2 capture (TR4). Derived variants change only the structured-output text: `photoUsable=false` without `usabilityIssue` → schema error; non-JSON text → 1 retry → `AiOutputError`. The S6 401 capture → `AiUnavailableError`. A timeout through an aborted replay → `AiTimeoutError`. No-signals prompt variant. Commit `AI: add vision analysis` |
| **T33** DecisionGuards | Forced outcome (date > photo > category); cited-rule subset; allowed chat update | PRD AC-19…AC-22 (incl. the AC-22 exception); [ADR-000] §8.5; [ADR-002] §5, guards diagram; [ADR-005] A3 | T20, T21 | (H) | `app/src/server/rules/guards.ts` (+ test) | Tests from the [ADR-002] §8 rows *Forced outcomes* and *Cited rules* (`[]`, `R9.9`, `C2.1` on a return, `r1.1`). Commit `Backend: add decision guards` |
| **T34** DecisionAgent and FirstMessageComposer | Structured decision with guards and 1 retry. Five-part first message (D4) | PRD AC-17, AC-19, AC-25, §11; [ADR-002] §3.4, §4.3, §4.4; TAC-002-01/02/03/05; [ADR-005] A1, A9, A10 | T33, T25, T26, S5 | (H), escalate (S) | `app/src/server/ai/decision/**` (+ tests) | Replay of the raw S5 (a) capture (TR4). Derived values: `approve` on an out-of-period case → `reject` + R1.1/C1.1; `R9.9` cited twice → `AiUnavailableError`. Part order and the exact disclaimer text. Commit `AI: add decision agent` |
| **T35** ChatAgent and `updateDecision` | `streamText` with the system context and the tool. `data-decision` written before the text. No reasoning parts sent | PRD AC-29, AC-30, §4.5, §11; [ADR-002] §3.5, §6.3, §6.4; TAC-002-06; [ADR-005] A5 (no disclaimer flag), A9, A15 (58 s budget) | T33, T25, T26, T10, S5 | (H), escalate (S) | `app/src/server/ai/chat/**` (+ tests) | Replay of the raw S5 (b) SSE capture (TR4). Rows *Chat context* and *Chat tool accepted/rejected* in [ADR-002] §8. The rejected case uses a derived value (decision `approve` on a date-rejected case). *No reasoning leak*: if S5 (b) contains real reasoning events, assert they are absent from the client stream. If not, assert `sendReasoning: false` in the stream options and check the real stream in T61; the gap is recorded. Commit `AI: add chat agent` |

Batch B runs concurrently: T30, T31, T32 and T33 (each once its inputs are ready), then T34 and T35 in parallel.

### Phase 6 — Case service and routes (integration)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T40** Create stage and the facade | `POST /api/cases` → 201/413/422/500 | PRD AC-05, AC-08, AC-09, §4.6; [ADR-003] §5.1; TAC-06; [ADR-005] A6 (`inFlight` map in the facade), A7, A8, A17 | T20, T22, T23, T24, S3 | (H) | `app/src/server/cases/{service,create}.ts`, `app/src/app/api/cases/route.ts`, `app/tests/integration/create.test.ts` | Response `{ caseId, summary }` with the thumbnail inside `summary` (A8). Integration with real `Request` objects: the [ADR-003] §8 rows *Valid create*, *Field validation*, *Future date*, *File too large*, *Spoofed format*. 10 MB in under 1 s. The route file only parses, calls the service and maps the response (TAC-003-01). Commit `Backend: add case creation endpoint` |
| **T41** Analyze stage | `/analysis`: idempotent, single-flight for concurrent calls, 502/504 | PRD AC-15, AC-23, AC-34; [ADR-003] §5.2, §3.1; [ADR-005] A4, A6, A8 | T30, T31, T32, T40 | (H) | `app/src/server/cases/analyze.ts`, `app/src/app/api/cases/[caseId]/analysis/route.ts`, `app/tests/integration/analysis.test.ts` | OpenRouter replaced only by replays of the S1/S2/S6 captures (TR4); everything else is real. Fast path → vision 0 calls; uncertain (derived confidence 0.79) → 1 call; screening 401 capture → escalate; screening and vision both failing → 502 (S6 401 capture), and a vision timeout (aborted replay) → 504, each with the Polish message; a second call after success → 0 AI calls; two concurrent calls → both 200 and 1 AI call. Commit `Backend: add analysis endpoint` |
| **T42** Decide stage | `/decision`: 409 before analysis; idempotent; single-flight | PRD AC-17…AC-22; [ADR-003] §5.3; [ADR-005] A3, A6, A8 | T34, T41 | (H) | `app/src/server/cases/decide.ts`, `app/src/app/api/cases/[caseId]/decision/route.ts`, `app/tests/integration/decision.test.ts` | [ADR-000] §10 scenarios 2, 6, 7; TAC-003-04; out-of-period with an unusable photo → `reject` (A3); concurrent calls → 1 model call. Commit `Backend: add decision endpoint` |
| **T43** Chat stage | `/chat` stream: `chatBusy` 409, retry idempotency, 422 on `file` parts | PRD AC-27, AC-29…AC-31, AC-35; [ADR-003] §5.4 | T35, T42 | (H), escalate (S) | `app/src/server/cases/chat.ts`, `app/src/app/api/cases/[caseId]/chat/route.ts`, `app/tests/integration/chat.test.ts` | [ADR-000] §10 scenarios 9–12, with OpenRouter replaced only by the S5 (b) / S6 replays (TR4); a stale lock older than 90 s is released. Commit `Backend: add chat endpoint` |
| **T44** Pipeline integration check | One test drives create → analysis → decision → chat. Only the OpenRouter HTTP calls are replayed from captures (TR4); the route handlers, case store, image pipeline, policies, prompts and guards are real. TTL expiry → 404 on all 4 routes | [ADR-000] §10 Integration layer; TAC-003-05; TAC-02 | T40–T43 | (H); (O) reviews | `app/tests/integration/pipeline.test.ts` | Plus `pnpm build` and a grep that the client bundle has no `OPENROUTER_API_KEY` and no `server/` module (TAC-02). Deprecated v7 APIs are caught by the lint rule in `pnpm verify` ([ADR-005] A14). Commit `Test: add pipeline integration test` |

| **T45** Capture the app's own API | Raw recordings of every response the frontend handles, made against the **real running app** (`pnpm start`, real OpenRouter):<br>• `POST /api/cases` 201, 422 (several fields invalid), 413<br>• `/analysis` 200 (under `auto`, and under `always` for the escalated path), 404 (unknown case)<br>• `/decision` 200 (one model decision, one date-forced reject), 409 (called before `/analysis`)<br>• `/chat` SSE stream (plain answer; with `data-decision` if the model calls the tool), 409 (`chatBusy`)<br>• 502 (restart with an invalid key) | TR5; [ADR-003] §5; [ADR-005] A8 | T44, key, credits (D9) | (H) runs; (O) checks | `app/scripts/captures/api-capture.ts`, `app/tests/fixtures/captures/api-*` | Each capture stores the request, status, headers and body; streams are stored as raw SSE. The cost is added to the D9 total. A 504 cannot be produced on demand: its body is checked by the T24/T41 tests, and the client treats it like the captured 502 (listed in `captures/README.md`). Commit `Test: add API response captures` |

T41 and T42 are sequential (T42 depends on T34 and T41). T43 waits for T35. These tasks own disjoint files thanks to D6.

### Phase 7 — Frontend (parallel batch C; runs alongside Phases 5–6)

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T50** Flow reducer and screen contracts | The `CaseFlow` reducer for all states and transitions. Props types for the three screens | PRD AC-32, AC-33, §4.7, §4.8; [ADR-004] §3.1, §6.1, client state diagram | T10 | (H) | `app/src/components/case/flow/{reducer,types}.ts` (+ test) | Reducer tests for every transition in the [ADR-004] §3.1 table, including `expired` on 404. Commit `Frontend: add case flow reducer` |
| **T51** CaseFormScreen | All fields, validation, photo drop zone, focus on the first error, server 422 mapping | PRD AC-01…AC-12, §9.1; [ADR-004] §3.2, §6.2; [DG] Inputs; [ADR-005] A7 (schema factory), A11 (magic bytes), A16 | T50, T02 | (H) | `app/src/components/case/form/**` (+ tests) | The [ADR-004] §8 component rows from *Field order* to *Double submit*, through props and the real shared schema, with no HTTP mocks (TR5). Server field errors are passed in as a prop, in the error shape exported by T10. The *Server 422 mapping* row moves to T54 (T45 capture). Plus: a JPEG named `photo.txt` is accepted by the client; a PNG-named text file is rejected (A11). Commit `Frontend: add case form` |
| **T52** ProcessingScreen | Two steps, the `aria-live` region, retry of the failed step only, back to the form | PRD AC-23, AC-34, §9.2; [ADR-004] §3.3; [ADR-005] A6 | T50 | (H) | `app/src/components/case/processing/**` (+ tests) | Rendering of the step states and the error state from props (step, error flag), plus the retry and back callbacks, with no HTTP mocks (TR5). The fetch-driven rows (*Processing steps*, *Processing retry/back*, 409 → AC-34 state, StrictMode double mount) move to T54 and use the T45 captures. Commit `Frontend: add processing screen` |
| **T53** ChatScreen | Summary + badge + photo dialog; `useChat` with the S4 findings; `CaseMessage` part rendering; typing indicator, Ponów, new-case dialog | PRD AC-24…AC-31, AC-33, AC-35, §9.3, §9.4; [ADR-004] §3.4, §3.5, §6.3; TAC-004-02/03; [ADR-005] A5 (disclaimer last), A12 (S4 regenerate findings); D10 (badge colours) | T50, S4, T02, T34, T35 | (H), escalate (S) | `app/src/components/case/chat/**` (+ tests) | Rendering tests, with no HTTP mocks (TR5), use messages produced by real code:<br>• the first message comes from the real `FirstMessageComposer` (T34), applied to a decision derived from the S5 (a) capture<br>• the updated-decision message comes from the real `ChatAgent` (T35) run on the S5 (b) replay<br>Covered: [ADR-004] §8 rows *First message rendering*, *Decision update block*, *Input rules*, *Busy state*, *Chat error retry*, *New case dialog*, with the `useChat` state supplied as props. An updated-decision message renders the header first and the disclaimer as its last element (A5). The transport-body check (TAC-004-02) moves to T54. Commit `Frontend: add chat screen` |
| **T54** Wire the page | `page.tsx` renders `CaseFlow`, connecting the screens to the endpoints | [ADR-004] §3.1, §5; TR5 | T51, T52, T53, T45 | (H); (O) reviews | `app/src/app/page.tsx`, `app/src/components/case/flow/case-flow.tsx`, `app/tests/components/flow-http.test.tsx` | HTTP-level component tests whose `fetch` and chat transport replay **only the T45 captures of the real app**:<br>• the whole flow<br>• server 422 mapping<br>• processing steps and retry/back (502 capture)<br>• 409 → AC-34 state<br>• StrictMode double mount without an error<br>• 404 → `expired`<br>• the chat transport body has only `{message, trigger}` (TAC-004-02)<br>• `data-decision` from the captured stream updates the badge<br>Manual QA for T51–T54: start `pnpm dev`, take Playwright CLI screenshots of the form (empty, with errors), processing (including the error state) and the chat at 1280 and 360 px. Then **T03's E2E specs turn green** (see T60). Commit `Frontend: wire case flow` |

T51 and T52 run in parallel with Phases 5–6 (disjoint folders). T53 waits for T34 and T35, so it overlaps with T40–T45. T50 goes first because it fixes the props contracts. T54 waits for T45.

### Phase 8 — End-to-end proof, review and PR

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff |
|---|---|---|---|---|---|---|
| **T60** E2E green on the real stack | `pnpm test:e2e` passes against `pnpm build && pnpm start` with real OpenRouter (credits, cap per D9) | [ADR-000] §10 E2E; [ADR-004] §8 E2E rows; PRD AC-38 (browsers per [ADR-005] A21) | T54, key | (O) runs; fixes go to the owning row's files through a worker | `app/tests/e2e/*.spec.ts` (only to remove the `test.fixme` markers from T03) | Every `test.fixme` from T03 is removed (`grep -r 'test.fixme' app/tests/e2e` is empty). The TR1 grep (no interception or mocks) is empty. The run reports passed and failed counts, with **0 skipped** (TR2). The server log of the run is saved and its stage lines show real calls with model IDs and `usage.cost` > 0 for screening, decision and chat (TR3). Assert no specific visual verdict ([ADR-000] §10). Commit `Test: enable E2E specs` |
| **T61** Manual QA | Human-like Playwright CLI run: return happy path, complaint, date reject, Manual review, validation errors, AI error retry (restart with a deliberately **invalid** key, e.g. `OPENROUTER_API_KEY=sk-or-invalid pnpm start`, so OpenRouter rejects the call and the app shows the AC-34 message; a *missing* key would instead stop the app on its configuration check and show a different message), chat follow-up "Jaka była data zakupu?", decision update, new case, keyboard-only flow, 360 px | [AGENTS] Manual QA; [ADR-004] TAC-004-04/05; PRD AC-37…AC-39; [DG]; [HOME] | T60 | (O) + (Hu) | `docs/qa/2026-11-hsdc-poc/*.png` + `report.md` (committed, D12) | Every row of the [real coverage matrix](#real-coverage-matrix-t60--t61) not already proven by T60 is executed on the real app, in both `ANALYSIS_ESCALATION=auto` and `always` runs. `report.md` lists, per row, the scenario, the stage log lines (model, path, `forcedBy`, decision, cost), the screenshots and *observed / not observed*. Also required: screenshots of every screen at 1280 and 360; a console free of errors; Polish texts; brand comparison notes. Anything wrong → a fix row and a re-run. Commit `Docs: add manual QA evidence` |
| **T62** Independent review | A fresh-context reviewer gets **the diff and the PRD/ADRs, not this plan's conclusions**. Findings are verified | [AGENTS] Code Review Rules | T61 | Opus 5.5 fresh subagent (or `/code-review high`); optional second opinion with `codex review` | none (findings only) | Each finding has a failing scenario and the affected lines. Fixes go back through the owning rows. Re-verify |
| **T63** Pull request | A PR `feature/hsdc-poc` → `main` (or stacked on `design-system` if PR #1 is still open) with the summary, checks run, QA evidence and known gaps | — | T62; **user authorizes the push and the PR** | (O) | none | `gh pr create`. Merge is a human decision |

## 6. Shared-file hotspots

| File / area | Single owner | Rule |
|---|---|---|
| `app/package.json`, `app/pnpm-lock.yaml`, `pnpm-workspace.yaml` | T01 only | A later dependency need → the worker stops; (O) adds it in a separate serialized commit |
| `app/src/lib/schemas/**`, `app/src/lib/i18n-pl/index.ts` | T10 | Contract changes go through (O) between batches. Per-area i18n files (D5) can get additive string edits from the owning screen task, if the brief allows it |
| `vitest.config.*`, `playwright.config.*`, `tsconfig.json`, ESLint config, `next.config.*` | T01 | Read-only for everyone else |
| `app/src/app/{layout,page}.tsx`, `globals.css` | T02 (layout, CSS), T54 (page) | — |
| `app/src/server/ai/prompts/` | T26 (`*.md`), T30 (`*.json`) | Disjoint files in one folder |
| `app/src/server/cases/service.ts` | T40 | Stage files are owned per row (D6) |
| `app/AGENTS.md`, `app/README.md`, root `.env.example` | T01, then (O) | The checklist is ticked by (O) at phase gates |
| `app/tests/fixtures/captures/README.md` | (O) | The index of all captures and of the shapes that were not captured. Each spike or capture task reports its additions; (O) writes them |

## 7. Critical path and phase gates

**Critical path:** T00 → T01 → T10 → S5 → T34 → T42 → T43 → T44 → T45 → T54 → T60 → T61 → T62 → T63.

Off the critical path but needed on time:
- T34 also needs T25 (after S1/S2), T33 (after T20/T21) and T26.
- T43 needs T35 (after S5).
- T42 needs T41 (after S1 → T30, and S2 → T32).

The frontend (T50–T53) and the E2E specs (T03) run off the critical path. Phase 2 is the largest schedule risk: it needs a key, credits and a model capability verdict.

**Human review gates:**
- **G0**: approve this plan **and accept [ADR-005]** (accepted, D12). Decisions recorded (D8–D13). The user gives an explicit go-ahead to start.
- **G1**: after T01–T03: scaffold, brand shell, E2E specs (red run recorded, then marked `fixme`).
- **G2**: after S1–S6: spike verdicts and the list of shapes that could not be captured. A design change becomes an ADR note for approval.
- **G3**: after T44 + T54: backend and UI integrated, `pnpm verify` green.
- **G4**: after T61 + T62: QA evidence and review. Then authorize the PR.

## 8. Failure, rollback and fallback

**Rollback per row.** Each row is one commit. A rejected worker diff is discarded by (O) on the worker's owned files only (`git restore -- <owned files>`, after checking `git status` that nothing else is affected). Then (O) either re-briefs once or escalates the model. A committed row found faulty later is reverted with `git revert <sha>` rather than rewriting history.

**Known failure branches (pre-decided in the ADRs):**

| Branch | Fallback |
|---|---|
| S1: `decisionModel()` unusable | Direct `fetch` adapter ([ADR-000] §8.3) |
| S2: no image input | User picks `VISION_MODEL` (U6) |
| S2: no schema support | `response-healing` + zod |
| S3: body limit | Documented config |
| S4: behaviour differs | Adapt the props |

**Escalation evidence:**
- 2 failed verifications on one row → Sonnet.
- A Sonnet failure or a contract contradiction → (O) takes the task or asks the user.

**Smaller fallback, cut in this order.** The course ends 2026-11-27, so the cut line matters.
1. **Slice A (minimum demo):** T01–T02, T10–T11, T20–T24, T26, T31–T34, T40–T42, T50–T52, T54.
   - Analysis uses a `NullScreening` adapter, which always reports a screening error. The pipeline then escalates to vision, which the ADR already handles ([ADR-002] §3.3 *Screening threw an error* → `escalate`). No ADR change is needed.
   - This is a **scope cut, not a test double**. The QA report marks Luna Decisions screening as *not delivered*, never as tested. The vision, decision and chat calls must still run for real (TR1, TR3).
   - The chat screen shows only the first decision message, read-only.
2. **Slice B:** add T35, T43, T53 (streaming chat + `updateDecision`).
3. **Slice C:** add S1 and T30 (real Luna Decisions screening and the escalation experiment).

Slice A still needs S2, S3, S5 (a), S6, T45 and a key. Without a key, stop after the non-AI rows and report: mocks may not be invented ([AGENTS] TDD rules).

**If subagents are unavailable:** execute the same matrix sequentially in this session, in topological order, with the same per-row commits.

## 9. Unresolved decisions

| # | Question | Blocks | Recommendation |
|---|---|---|---|
| U1 | ~~PR target~~ **Resolved (D12)** | — | — |
| U2 | ~~Accept ADR-005~~ **Resolved (D12)**: accepted in full (A1–A21) | — | — |
| U3 | ~~Licence of the Geomanist fonts and the Asseco logo~~ **Resolved (D8)** | — | — |
| U4 | Provision the key in `app/.env.local`. The root `.env` was not read, and Next.js does not load it from `app/` | S1, S2, T60, T61 | The user copies the key, or runs `! cp ../.env app/.env.local` themselves |
| U5 | ~~OpenRouter credit cap~~ **Resolved (D9)** | — | — |
| U6 | `VISION_MODEL` if S2 is negative | T32 | Decide at G2 from the S2 capture |
| U7 | ~~Manual review badge colour~~ **Resolved (D10)** | — | — |
| U8 | ~~Browser coverage~~ **Resolved (D12)**: [ADR-005] A21 | — | — |
| U9 | ~~Commit QA screenshots~~ **Resolved (D12)** | — | — |
| U10 | ~~Prettier~~ **Resolved (D12)** | — | — |

| U11 | A **real unusable photo** for the forced `unusable_photo` path in the [coverage matrix](#real-coverage-matrix-t60--t61). The example images are all usable, and generating one is forbidden by `assets/example-images/README.md` | T61 (one matrix row) | The user supplies one real, badly lit or blurred photo of their own device, with no personal data, and adds it to `assets/example-images/` with a README entry. Otherwise the path is covered only by the integration tests and listed as a QA gap |

Open: U4 (the key in `app/.env.local`, needed from S1 on), U6 (decided at G2) and U11 (needed only by T61).

## 10. First bounded task and the review gate

- **Review gate G0 (now):** [ADR-005] is accepted and the decisions are recorded (D8–D12). Still needed: the user's explicit **"start execution"** (the user asked on 2026-11-26 that nothing be run yet). U4 is needed only from S1 on.
- **T00 (done through this PR):** the docs, amendments and this plan are committed on `docs/hsdc-implementation-plan`, with a PR into `design-system`. After the go-ahead, the orchestrator creates `feature/hsdc-poc` and one issue per matrix row.
- **First worker dispatch: T01** (Haiku). Its brief goes to `.agent-briefs/T01.md`, and it is the only task in flight.

<!-- Link definitions -->
[PRD]: ../PRD.md
[ADR-000]: ../ADR/000-main-architecture.md
[ADR-001]: ../ADR/001-project-setup.md
[ADR-002]: ../ADR/002-ai-pipeline.md
[ADR-003]: ../ADR/003-backend-api.md
[ADR-004]: ../ADR/004-frontend.md
[ADR-005]: ../ADR/005-amendments.md
[RET]: ../policies/return-policy.md
[COMP]: ../policies/complaint-policy.md
[DG]: ../design-guidelines.md
[TOK]: ../../assets/design-tokens.json
[HOME]: ../../assets/homepage.png
[AGENTS]: ../../AGENTS.md
