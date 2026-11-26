# Implementation plan for the whole application from the PRD and ADRs (Codex + OpenCode)

Create a reviewable implementation plan to implement the whole application (PoC or MVP) defined by the approved PRD and ADRs. One plan contains every phase and detail needed to deliver it fully, so a capable agent can implement it autonomously with good specs and answers to its questions. Do not implement it or launch agents yet. Follow the applicable AGENTS.md and use the approved PRD, ADRs and design guidance in this application's repository. Ask for their paths only when they are missing or ambiguous; teaching examples in course-materials are not project requirements.

Inspect the current code, working-tree status, entry points and tests. Report what actually exists, the commands you verified and any baseline failure. Use the existing application scaffold or approved legacy checkout; do not replace it with a fresh application. Resolve consequential gaps with targeted questions, without a minimum question count. Keep unrelated work intact.

Save the draft in docs/plans/<plan-name>-implementation-plan.md. In a read-only Plan mode, return the complete draft and destination first, then save it when writing is permitted. Mark it as draft awaiting my review. Link exact PRD criteria, ADR sections and design guidance instead of copying their contents. Missing architecture belongs in a proposed ADR, not an invented plan assumption. Before saving, check the plan, PRD, ADRs and AGENTS.md against each other and list every contradiction or ambiguity that could stop an agent or leave it unsure what to do.

Use small verified phases and one authoritative dependency matrix:

| Task | Observable outcome | PRD/ADR links | Prerequisites | Owner/model | Editable files | Verification and handoff | Status |
|---|---|---|---|---|---|---|---|

Give each row a bounded deliverable, acceptance evidence and commit boundary, and define a Definition of Done for the whole plan. Plan a failing behavioral test before implementation, integration checks after dependent components, manual runtime verification, an independent review and a pull request for each finished phase or for the whole application, as the repository's policy prefers. End-to-end and manual tests use the real application, its endpoints and any external, LLM or decision-model calls, never mocks. When unit or integration tests mock external endpoints or APIs, base those mocks on real recorded calls, not on documentation. Use the application's actual commands. A green build alone does not prove startup or the user flow. State the critical path, shared-file hotspots, failure/rollback handling and a smaller fallback if time, tools or model access run out. Track execution status in the plan's Status column. When the repository uses GitHub Issues, check your access during planning; after I approve the plan, create one issue per task and use the same issue ID in the plan and in your task list.

GPT-6.2 Sol in Codex (`gpt-6.2-sol`) is the orchestrator: it makes architectural decisions, resolves contradictions, prepares briefs, accepts results and decides which worker and model each row gets. Workers: Codex subagents on GPT-6 Luna (`gpt-6-luna`) or GPT-6.1 Terra (`gpt-6.1-terra`), and OpenCode in headless mode (`opencode run`) with one of OpenCode's free built-in models (for example MiMo V2.6 Flash or DeepSeek V4.1 Flash; the free list changes, so check `opencode models`). GPT-6 Luna is cheap and fast, which suits research that reads a lot of data, such as a whole repository or many web sources, split across several parallel subagents. Record per row the worker, the model and why; escalate when evidence shows the task exceeds the worker's ability. When you delegate to OpenCode, add a short note to the plan on how to run it headless: the command, the model flag, how the brief is passed, how permissions are granted and where the output is logged. Review and final acceptance stay with a capable model and the human. Every agent looks up library, framework and tool docs in Context7 (the `ctx7` CLI or MCP) and in the tool's own help (`gh --help`, `<tool> <command> --help`) first, and uses web search only as a fallback, because it loads far more tokens. Research (docs, web, reading many files) goes to subagents or CLI agents by default, and only their conclusions return to the orchestrator.

Recommend ad hoc subagents by default for a one-off task: an exact brief matters more than a new role file. Use short custom definitions only for a recurring role with reusable tool restrictions or expertise. Existing named roles may be reused after inspecting them, without assuming their model or permissions suit this task. Verify the active harness supports the requested agent mechanism; otherwise execute the same matrix sequentially with one agent. Do not manufacture custom roles merely to match a tutorial.

Parallelize only tasks with independent inputs and disjoint editable files. Tell every worker which other work is concurrent. Serialize shared contracts, lockfiles, migrations and integration. Use one checkout by default, with disjoint files/folders and a dependency plan. Request a worktree only when agents must edit the same files in parallel; follow the repository approval policy and remove it afterwards. Worktrees do not eliminate same-file merge conflicts. Only the orchestrator switches branches, stages changes, writes the Git index or creates commits in the shared checkout; workers edit only their assigned files and return a diff.

After I authorize execution, compile each task's self-contained brief just before dispatch and save it as docs/.agent-briefs/<plan-name>-<brief-name>.md (a brief without a plan is docs/.agent-briefs/<task>.md). Include the relevant source excerpts, current contracts, predecessor outputs, exact editable files, ordered steps, test inputs and expected results. Link the authoritative documents for traceability, but do not make a small worker rediscover the whole architecture. The worker reports contradictions and observed results; it cannot change the agreed scope or accept its own work. The orchestrator reads the diff and reproduces the relevant checks before integrating and committing under the repository's policy. Commit the plan and briefs while the work runs and keep worker logs out of Git. Delete the plan and briefs once the plan's Definition of Done is met (for example merge or production deploy), because leftover plans distract agents; Git history keeps them.

Finish with the saved plan link, unresolved decisions, the first bounded task and the review gate. Planning does not authorize execution, new agents, publication or merge.

---

Copy the prompt above. Use the sections below once the draft plan is ready.

## Exercise

Follow the plan corrections, the planning-skill prompt and the implementation step in the [Claude Code version](Plan-SubAgents-matrix-dependency-map.md). They work the same way in Codex (`/new`, `/goal`, `/status`).

## OpenCode in headless mode

```bash
opencode run -m opencode/mimo-v2.6-flash-free -f docs/.agent-briefs/<plan-name>-<brief-name>.md "Do the task described in the attached brief." </dev/null 2>&1 | tee .agent-logs/<plan-name>-<brief-name>.log
```

`opencode models` lists the model IDs, for example `opencode/mimo-v2.6-flash-free` or `opencode/deepseek-v4.1-flash-free` (free models change over time, so check the current list): the free `opencode/...` models work right after installation, and `openrouter/...` models appear after `/connect` with an OpenRouter key. Add `.agent-logs/` to `.gitignore`. A headless run cannot answer permission prompts, so allow the needed tools in the OpenCode configuration; `--auto` approves every permission that is not explicitly denied, so use it only in a sandbox you trust. `--format json` gives machine-readable output, and `-c` or `-s <id>` continues a session.
