---
name: verified-research
description: Evidence-based research report built by a team of cheap subagents (e.g. Haiku) that search primary sources, then independent verifiers re-check every number before the lead writes Markdown reports (one or two languages) and an interactive HTML page with charts. Use when the user asks to find the source behind an article or claim, to collect recent data, benchmarks or studies on a topic, to "delegate research to N subagents", to fact-check, or to produce a sourced report with charts. Covers trigger phrases like "znajdź źródło raportu", "poszukaj nowszych danych", "zdeleguj research do agentów", "przygotuj raport z wykresami".
---

# Verified multi-agent research

The lead agent **manages, verifies and writes**. It does not search the web itself. Subagents search and verify. Every number in the final report must come from a primary source and must have been re-read by a second agent.

Reference files (read when you reach the step):
- `references/agent-briefs.md`: copy-ready prompts for search agents, verifiers and gap iterations.
- `references/lessons-learned.md`: mistakes from the first run and how to avoid them. **Read it before step 2.**
- `references/report-and-artifact.md`: report structure, data file, HTML page and publishing.
- `assets/example-interactive-report.html`: a finished interactive page from the first run (PL/EN switch, dumbbell, scatter, bar charts, calculator, filterable source table). Reuse its chart functions and CSS tokens, not its data.

## Step 0. Ask where to save (always, unless the prompt says it)

If the prompt does not name an output location, call **AskUserQuestion** before any other work. Ask the language question only if the prompt does not settle it.

```
questions:
  - question: "Gdzie zapisać raport (Markdown + HTML)?"
    header: "Lokalizacja"
    multiSelect: false
    options:
      - label: "course-materials/Research/ (Recommended)"
        description: "Obok innych researchy kursowych; nazwa pliku kebab-case z datą"
      - label: "docs/research/"
        description: "Dokumentacja projektu, gdy research dotyczy aplikacji"
      - label: "Tylko scratchpad + artefakt"
        description: "Nic nie trafia do repozytorium"
  - question: "W jakich językach przygotować raport?"
    header: "Języki"
    multiSelect: false
    options:
      - label: "PL + EN (Recommended)"
        description: "Dwa pliki .md, dwa pliki .html i dwa artefakty"
      - label: "Tylko PL"
        description: "Jeden zestaw plików po polsku"
      - label: "Tylko EN"
        description: "Jeden zestaw plików po angielsku"
```

Naming: `<topic-slug>-<YYYY-MM-DD>.md` for English, `<topic-slug>-<YYYY-MM-DD>-pl.md` for Polish, and the same base name with `.html` for the interactive page.

## Step 1. Plan the scopes (5–7 search agents)

Split the question into disjoint scopes so agents do not duplicate work. A proven split for "does X hold, and is there newer data":
1. **Trace the claim**: find the primary source behind the article and compare claims with the paper.
2. **Target-specific data**, for example the target language or country, searched **in that language**.
3. **Mechanism**, for example reasoning or "why".
4. **Application area A**, for example retrieval, RAG or long context.
5. **Related populations**, for example related languages, searched in each national language.
6. **Official vendor data and leaderboards.**

Write the **comparison criterion** into every brief. In the first run it was "same model, same items, both conditions", which is what makes a comparison fair. Agents must flag YES/NO for it on each source.

## Step 2. Launch search agents in parallel (one message)

- Use `Agent` with `model: "haiku"` and `subagent_type: "general-purpose"`, `run_in_background: true`, all in one message.
- Use the search-agent template from `references/agent-briefs.md`. Each brief must contain:
  - the full project context;
  - the scope;
  - example places and phrases, including national-language queries;
  - the source rules;
  - the verification procedure;
  - the output format.
- **Ask for the report in the final message.** Some subagents refuse to write `.md` files. Saving to the scratchpad is optional; the lead keeps the record.
- While agents run, prepare the output side: load design guidance (`Artifact` quickstart and the `dataviz` skill) and validate the chart palette.

## Step 3. Verify as results arrive (pipeline, not batch)

When a search agent returns, read its summary and launch a **verifier at once** with the verifier template. Do not wait for all searchers.

The verifier gets:
- a numbered list of exact claims (paper ID, table number, values);
- an instruction to be skeptical;
- the request to return verdicts as **CONFIRMED / PARTLY / WRONG / CANNOT VERIFY**, each with the correct value.

Always send these to a verifier:
- **every number you will chart or put in the TL;DR**;
- any source dated close to today or naming models you do not know (these may be real, so verify rather than dismiss);
- **any conflict between two agents**. Add it to a running verifier with `SendMessage` instead of starting a new one;
- any "values in a figure only" or "PDF unreadable" item. A later agent can often read raw text that an earlier agent saved; give it the scratchpad path.

## Step 4. Gap iterations

For each sub-question still unanswered, run another search agent with a **different strategy**:
- other languages;
- university repositories and theses as leads;
- Hugging Face dataset search;
- multilingual benchmarks that might include the target;
- "papers citing X".

List the sources already known so it does not repeat them. Do at least the number of iterations the user asked for (default 3, and 5 when the user asks for exhaustive search) before declaring "no data". In the first run, the 5th iteration found the key missing comparison. Verify what an iteration finds before using it.

## Step 5. Freeze the data, then write

1. Write **one data file** first (`scratchpad/research/data.json` or CSV). It holds every value used in the reports and charts, with its source ID, table and verification status.
2. Write the main-language Markdown report from the data file (`references/report-and-artifact.md`).
3. Build the HTML page from the same data, using one source file with a language switch.
4. Translate the second-language report **only after** the first one is final.
5. Mark anything single-sourced or unverified as such. Never drop a caveat to make a chart cleaner.

## Step 6. Check once, publish, report

- Check the HTML once in the browser pane: console errors, horizontal overflow at phone width, and one look at each chart type.
- Publish both language variants as artifacts. Save standalone copies next to the Markdown reports (see the reference for the wrapper).
- Do not commit unless asked.
- Final chat message in the user's language:
  - links to the files and artifacts;
  - 3–5 answer bullets;
  - what remained unverified;
  - one line on the process (agents, rounds, what verification caught).
