# Implementation plan for the whole application from the PRD and ADRs (Claude Code + OpenCode)

Create a reviewable implementation plan to implement the whole application (PoC or MVP) defined by the approved PRD and ADRs. One plan contains every phase and detail needed to deliver it fully, so a capable agent can implement it autonomously with good specs and answers to its questions. Do not implement it or launch agents yet. Follow the applicable AGENTS.md and use the approved PRD, ADRs and design guidance in this application's repository. Ask for their paths only when they are missing or ambiguous; teaching examples in course-materials are not project requirements.

Inspect the current code, working-tree status, entry points and tests. Report what actually exists, the commands you verified and any baseline failure. Use the existing application scaffold or approved legacy checkout; do not replace it with a fresh application. Resolve consequential gaps with targeted questions, without a minimum question count. Keep unrelated work intact.

Save the draft in docs/plans/<plan-name>-implementation-plan.md. In a read-only Plan mode, return the complete draft and destination first, then save it when writing is permitted. Mark it as draft awaiting my review. Link exact PRD criteria, ADR sections and design guidance instead of copying their contents. Missing architecture belongs in a proposed ADR, not an invented plan assumption. Before saving, check the plan, PRD, ADRs and AGENTS.md against each other and list every contradiction or ambiguity that could stop an agent or leave it unsure what to do.

Use small verified phases and one authoritative dependency matrix:

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff | Status |
|---|---|---|---|---|---|---|---|

Give each row a bounded deliverable, acceptance evidence and commit boundary, and define a Definition of Done for the whole plan. Plan a failing behavioral test before implementation, integration checks after dependent components, manual runtime verification, an independent review and a pull request for each finished phase or for the whole application, as the repository's policy prefers. End-to-end and manual tests use the real application, its endpoints and any external, LLM or decision-model calls, never mocks. When unit or integration tests mock external endpoints or APIs, base those mocks on real recorded calls, not on documentation. Use the application's actual commands. A green build alone does not prove startup or the user flow. State the critical path, shared-file hotspots, failure/rollback handling and a smaller fallback if time, tools or model access run out. Track execution status in the plan's Status column. When the repository uses GitHub Issues, check your access during planning; after I approve the plan, create one issue per task and use the same issue ID in the plan and in your task list.

Claude Opus 5.5 is the orchestrator: it makes architectural decisions, resolves contradictions, prepares briefs, accepts results and decides which worker and model each row gets. Workers: Claude Code subagents on Sonnet 5.5 or Haiku 5.5, and OpenCode in headless mode (`opencode run`) with GPT-6 Luna through OpenRouter (`openrouter/openai/gpt-6-luna`) or one of OpenCode's free built-in models (for example MiMo V2.6 Flash or DeepSeek V4.1 Flash; the free list changes, so check `opencode models`). GPT-6 Luna is cheap and fast, which suits research that reads a lot of data, such as a whole repository or many web sources, split across several parallel workers. Record per row the worker, the model and why; escalate when evidence shows the task exceeds the worker's ability. When you delegate to OpenCode, add a short note to the plan on how to run it headless: the command, the model flag, how the brief is passed, how permissions are granted and where the output is logged. Review and final acceptance stay with a capable model and the human. Every agent looks up library, framework and tool docs in Context7 (the `ctx7` CLI or MCP) and in the tool's own help (`gh --help`, `<tool> <command> --help`) first, and uses web search only as a fallback, because it loads far more tokens. Research (docs, web, reading many files) goes to subagents or CLI agents by default, and only their conclusions return to the orchestrator.

Recommend ad hoc subagents by default for a one-off task: an exact brief matters more than a new role file. Use short custom definitions only for a recurring role with reusable tool restrictions or expertise. Existing named roles may be reused after inspecting them, without assuming their model or permissions suit this task. Verify the active harness supports the requested agent mechanism; otherwise execute the same matrix sequentially with one agent. Do not manufacture custom roles merely to match a tutorial.

Parallelize only tasks with independent inputs and disjoint editable files. Tell every worker which other work is concurrent. Serialize shared contracts, lockfiles, migrations and integration. Use one checkout by default, with disjoint files/folders and a dependency plan. Request a worktree only when agents must edit the same files in parallel; follow the repository approval policy and remove it afterwards. Worktrees do not eliminate same-file merge conflicts. Only the orchestrator switches branches, stages changes, writes the Git index or creates commits in the shared checkout; workers edit only their assigned files and return a diff.

After I authorize execution, compile each task's self-contained brief just before dispatch and save it as docs/.agent-briefs/<plan-name>-<brief-name>.md (a brief without a plan is docs/.agent-briefs/<task>.md). Include the relevant source excerpts, current contracts, predecessor outputs, exact editable files, ordered steps, test inputs and expected results. Link the authoritative documents for traceability, but do not make a small worker rediscover the whole architecture. The worker reports contradictions and observed results; it cannot change the agreed scope or accept its own work. The orchestrator reads the diff and reproduces the relevant checks before integrating and committing under the repository's policy. Commit the plan and briefs while the work runs and keep worker logs out of Git. Delete the plan and briefs once the plan's Definition of Done is met (for example merge or production deploy), because leftover plans distract agents; Git history keeps them.

Finish with the saved plan link, unresolved decisions, the first bounded task and the review gate. Planning does not authorize execution, new agents, publication or merge.

---

Copy the prompt above. Use the sections below once the draft plan is ready.

## Exercise: correct the plan, create a planning skill, then implement

The same steps apply to the [Codex version](Plan-SubAgents-matrix-dependency-map-CODEX.md) of this prompt.

Work through these steps in order, in the same session that wrote the plan.

1. **Plan size.** Check that the plan covers the whole application from the PRD in phases. Current top models such as Opus 5.5 can implement a much bigger application autonomously with `/goal` than a year ago, when the specs, the plan and the answers to their questions are good. Runs of several days with a check once or twice a day are realistic: a software factory. It is a choice, not a rule: you can still implement phase by phase with more manual control.
2. **Consistency review.** Ask the agent to check every document before implementation:

   ```text
   Check the correctness of all documents created for implementing this plan: the plan itself, the PRD, the ADRs and the agent instructions (AGENTS.md). Check that they are correct and consistent, and identify any contradictions or elements that could prevent the plan from being implemented properly or leave the agent unsure what to do.
   ```

3. **Real tests.** Make sure the plan does not mock end-to-end or manual tests:

   ```text
   Check that all end-to-end and manual tests use the real application: every endpoint, LLM call and decision-making method must be exercised for real, without mocks. Where unit and integration tests mock external endpoints, the mocks must be based on real recorded calls, not on documentation. Correct the plan where it does not.
   ```

4. **What the documents should say.** Check together whether the PRD, ADRs and plan state the problem the application solves, its users, its scale (small company, internal app, PoC, enterprise, global startup), the company's specifics (for example a regulated sector: government, finance, military, medical) and diagrams such as UML in Mermaid.
5. **Briefs and plan lifecycle.** Check that the plan tells the orchestrator to save every brief as `docs/.agent-briefs/<plan-name>-<brief-name>.md`, to commit plans and briefs during the work, and to delete them after the Definition of Done.
6. **Tracking.** Check that status lives in the plan's Status column. Optionally the same tasks become GitHub Issues after you approve the plan, and the plan and the agent's task list use their IDs.
7. **Tools.** Check that delegation uses agents you actually have. OpenCode is always available: its free models (for example MiMo V2.6 Flash or DeepSeek V4.1 Flash; check `opencode models` for today's list) work right after installation, and `/connect` adds a provider such as OpenRouter. If pnpm is missing, npm is fine. Check that the plan tells every agent to use Context7 and the tools' `--help` before web search, and to delegate research to subagents or CLI agents.
8. **Instructions.** Check which `AGENTS.md` levels apply: organization, user in the cloud, local user, project root, modules and folders.
9. **Planning skill.** Turn this session into a skill, so the next plan starts right:

   ```text
   Create a reusable planning skill from this session. Read the whole session history: the plan prompt, every correction and decision I gave, every mistake you made or had to fix, and the final plan. Turn them into rules so the next plan is right the first time. The skill must: plan the whole application from the PRD and ADRs by default (parts only on request); review the plan, PRD, ADRs and AGENTS.md for contradictions before saving; forbid mocks in end-to-end and manual tests and base mocks of external endpoints in unit/integration tests on real recorded calls; keep one dependency matrix with a Status column and a Definition of Done, plus GitHub Issue IDs after approval; choose workers from the agents actually available (OpenCode headless as the always-available option) and document the headless command; make agents use Context7 and CLI `--help` before web search and delegate research to subagents or CLI agents; save briefs in docs/.agent-briefs/, commit them during the work and delete the plan and briefs after the Definition of Done; stop for my review before execution. Keep it generic: no domain, client names or decisions from this application. Save it as a project skill and show it to me for review.
   ```

   After your review, test the skill on a second small feature: does it find the real sources, ask only missing questions, avoid overlapping files and stop before implementation? Refine it from the observed result.
10. **Implementation.** Start a new session (`/new`) and run `/goal implement this plan: @<path-to-plan>.md`. `/goal` keeps the agent working until the plan's Definition of Done is met, without a prompt from you at every step. `/status` shows when the usage limit resets, and a monitor can resume the work after the limit.

Optional external example for comparison: [write-implementation-plan, public PR #28](https://github.com/EdukeyTeam/agent-toolbox/pull/28). It is a pending proposal, not a required installation or an approved dependency of this exercise. Inspect its current state and compare its plan/brief separation with your own skill.

## OpenCode in headless mode

```bash
opencode run -m openrouter/openai/gpt-6-luna -f docs/.agent-briefs/<plan-name>-<brief-name>.md "Do the task described in the attached brief." </dev/null 2>&1 | tee .agent-logs/<plan-name>-<brief-name>.log
```

`opencode models` lists the model IDs, for example `opencode/mimo-v2.6-flash-free` or `opencode/deepseek-v4.1-flash-free` (free models change over time, so check the current list): `openrouter/...` models appear after `/connect` with an OpenRouter key, and the free `opencode/...` models work right after installation. Add `.agent-logs/` to `.gitignore`. A headless run cannot answer permission prompts, so allow the needed tools in the OpenCode configuration; `--auto` approves every permission that is not explicitly denied, so use it only in a sandbox you trust. `--format json` gives machine-readable output, and `-c` or `-s <id>` continues a session.
