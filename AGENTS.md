# Repository Guidelines

## Project

This is a **course project** for the "AI dla programistów - od pomysłu do MVP" training organized by JSystems, 5 days (23-27.11.2026), remote on cloud VMs. The primary taught agent is Claude Code, with OpenAI Codex CLI and GitHub Copilot as covered alternatives. The group selects the actual application and change. Greenfield work starts from the empty scaffold and defines the product live; legacy work uses a separate clone of the original application. Its domain, stack and architecture come from the real task and inspected sources, not historical course examples: research → application or feature PRD → ADR → implementation with agents.

This is only the **base starting repository** for the course; concrete decisions are made live with the group.

Chat in Polish unless the user asks for another language. Repository documentation uses English unless another project language is agreed. The trainer chooses the teaching language separately. This is a greenfield scaffold, not an agreed product specification. For a legacy-led course, keep materials separate and work in the original application clone; adapt these instructions to its actual stack and verification commands.

**Course chat publication exception:** when the trainer publishes reviewed meeting chat archives or summaries (for example Zoom chats in `course-materials/zoom-summary-chat-history/`), they are authorized. They are prepared with the trainer's `zoom-notes` privacy workflow: private messages are excluded and only cleared text and images enter Git. Participant abbreviations are pseudonymisation, not anonymity. This exception covers only those archives; it does not authorize publishing other participant data, and application code, tests and exercises stay synthetic-only.

**Key docs** (created during the course — load only when in doubt):
- `docs/PRD.md` — product requirements and acceptance criteria
- `docs/ADR/` — Architecture Decision Records
- `docs/design-guidelines.md` — design system and tokens

---

## Repository Layout

```
app/                 Application built during the course (start: empty scaffold)
assets/              Design tokens, logo, favicon
docs/                PRD, ADR, design system
course-materials/    Notes, scripts, examples, research
```

**Do not read `course-materials/` on your own.** It holds teaching examples from this and earlier courses: sample PRDs, ADRs, prompts and agent instructions. They are not requirements or conventions for this app. Do not browse, search or index it during normal work; open a file there only when the user names it or asks for course material.

---

**`README.md` is the participant entry page.** Do not add an update-notes section, changelog or "what's new" list to its top before the course has started. During the course the trainer adds update notes there; add them only when the trainer asks.

---

## Agent Workflow

### When implementing new or refactoring functionality
1. Read the relevant PRD and ADR files for the affected area.
2. Define the expected behavior from the specification before writing or changing any code.
3. Confirm the actual application checkout and inspect source, build descriptors, call sites and dependencies before proposing commands or APIs. Identify build, test and startup commands from that project, using its wrapper when available; do not assume a framework, build tool or runtime version.
4. Establish missing or ambiguous requirements with the user and record agreed application scope in its PRD before implementation. Routine course-document changes do not need an application PRD or ADR.
5. Use the project's selected package manager and the actual shell (Bash on Linux or PowerShell on Windows, as applicable). Inspect `package.json` or the build descriptor before choosing commands. Do not scaffold a finished application before the PRD and ADR exercise.

### Looking up tool and library facts
1. For CLI syntax (`gh`, `glab`, `codex`, build tools), run the tool's built-in help first: `<tool> --help` or `<tool> <command> --help`.
2. For library and framework APIs, use current documentation through Context7 (`resolve-library-id`, then `query-docs`) and match it to the installed package version in the lockfile; major versions differ.
3. Search the web last, and prefer the vendor's official pages.

### TDD Rules
For every feature and bug fix:
1. Start from the specification, not the existing implementation.
2. Write or extend tests **before** production code.
3. Run the new tests and confirm they fail for the expected reason.
4. Implement the minimum code needed to make them pass.
5. Run the full verification suite for the changed scope.
6. Refactor only while tests stay green.
7. **Manually validate the running application** (see Manual QA below). Automated tests — especially E2E — can produce false passes; a task is not done until the real app has been exercised by hand.

If the area has no suitable test infrastructure yet, add it as part of the task — do not silently skip tests.

Before creating or refreshing a unit/integration mock of an endpoint or database, make a fresh real request/query in an authorized local/test environment using synthetic data. Save the complete response verbatim (HTTP status, headers and body, or database result rows and type/schema information) and derive the mock from that capture, not from documentation that may be stale. Use a response containing no secrets; record its date, target, request/query and relevant service version without credentials. If a safe capture cannot be obtained, report the missing prerequisite instead of inventing a response shape.

For behavior-preserving legacy refactoring, write characterization tests against the original code and get them green before changing it. Assert observable inputs, outputs, state changes and errors rather than private methods or the current class layout. Demonstrate that critical assertions detect a controlled behavioral mutation, then revert that mutation. Existing tests may protect a pure refactor; a new behavior or bug fix still requires Red -> Green -> Refactor.

Investigate production code and fixtures before changing a failing assertion. Do not weaken, disable or delete tests to conceal a defect. Change expected behavior only when the specification supports it, and explain why.

### Manual QA (required after every task that affects the running app)

Use the application's actual runtime and verified commands. The browser flow below applies to web applications; desktop applications need their real UI, and command-line tools need observable CLI checks.

Use **the Playwright CLI** to drive the real running app like a human tester:

1. Start the app with its verified project command and open it in the browser. Record successful startup separately from compilation and test execution.
2. Take a screenshot of every screen you touched.
3. Exercise the real flow end-to-end by hand: fill the form, upload the image, submit, follow the navigation to the chat, send a message — whatever the changed scope covers.
4. Verify the flow actually works: correct navigation, correct data displayed, no console errors, Polish UI text.
5. **Compare your screenshots against the brand reference** (`assets/homepage.png` + `docs/design-guidelines.md` tokens): colors, typography, spacing, button styles and logo placement must match the application's agreed brand reference.
6. Report what you validated (steps + screenshots) in your task summary. If anything looks or behaves wrong, fix it before committing.

### Verification (required before every commit)

Verify only the scope relevant to your change. If the change affects runtime behavior, confirm the app starts correctly.

**Test Strategy:**
| Type | Mocks | Typical owner |
|---|---|---|
| Unit | All deps | backend or frontend worker |
| Integration | Only external LLM API | backend worker |
| E2E | NOTHING (real stack) | coordinator or QA run |

The owners are responsibilities, not predefined agent roles. Assign them to ad hoc agents through task briefs (see Sub-agents).

**Verification:** For runtime changes, start the real application and finish with Manual QA. Record compilation/build, test execution and startup as separate checks, including discovery counts and skips. A successful build or E2E run alone does not establish that the app works. Documentation-only changes use diff, link and consistency checks and do not require application startup. Fix errors and warnings introduced by the change; report pre-existing failures without hiding them.

**Env Vars:** See `.env.example`. `OPENROUTER_API_KEY` and `LLM_MODEL` are required; optional variables are listed in the application's ADR. The running application reads the env file named in its ADR (for the Next.js app in `app/`, `app/.env.local`), not the repository-root `.env`.

**Test photos:** `assets/example-images/` holds real device photos for upload tests, E2E and manual QA. Follow the rules in its `README.md`.

### Sub-agents
- Prefer ad hoc subagents for one-off work. Reuse a named role only after checking its model and permissions; add a short custom definition (for example under `.claude/agents/` for Claude Code or `.codex/agents/` for Codex) only for a recurring need. The starting repository has no active custom roles.
- Delegate bounded tasks with explicit dependencies and disjoint file ownership. The coordinating agent reviews diffs and verification evidence before committing.

### Commit Rules
- Commit only after verification passes and the changed scope is in a working state.
- Keep commits focused: one logical change per commit. Inspect `git status` and stage named paths; never use blanket staging (`git add -A`, `git add .`, `git commit -a`).
- Format: `Area: short summary` (e.g. `Backend:`, `Frontend:`, `Docs:`)
- Do **not** push to remote unless the user explicitly asks.

### Git Worktrees
- Use this checkout by default. Create a worktree only when requested or needed for parallel agent work; ask first when not explicitly requested.
- Remove worktrees with `git worktree remove <path>` and run `git worktree prune` when done.

### Completion Criteria
A task is complete only when:
- Implementation matches the relevant PRD, ADR, and design guidance
- Tests were written first and pass honestly
- Verification for the changed scope passed with no errors or warnings
- Runtime changes passed Manual QA on the actual UI, CLI or API, with screenshots or command/request evidence and the application's own visual reference where applicable; documentation-only work passed its scoped checks
- The commit message is focused and the repository is in a consistent, reviewable state

## Code Review Rules

- Report newly introduced correctness or security defects with a concrete failing scenario and the affected lines; distinguish verified findings from missing evidence.
- Review the actual application against its agreed PRD/ADRs and source. Course examples are requirements only when explicitly selected; course-documentation changes need scoped checks, not an unrelated application build.
- Prioritize authorization, secret handling and streaming/error paths when the change affects them. Use synthetic data and never suggest publishing credentials or participant identifiers.
- Do not weaken tests to satisfy a finding. State which checks actually ran and review the current PR head; an old-head review or silence is not approval.
- When a PR changes `course-materials/`, review those changed teaching files within the PR scope; do not browse unrelated course-library files.
- Meeting chat archives covered by the course chat publication exception in `AGENTS.md` are authorized content: review their wording and formatting, not their existence.
