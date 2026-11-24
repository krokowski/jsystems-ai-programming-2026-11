# Lessons learned (first run, 2026-11-24)

Topic of the first run: "Is Polish better than English for LLMs?" 14 Haiku agents worked in 3 rounds. Each item below cost a rework step that can be avoided.

| # | What happened | Cost | Do this instead |
|---|---|---|---|
| 1 | Subagents had no `curl`, `pdftotext` or `pypdf`. PDF-only tables (appendices, LREC/ACL PDFs, heatmaps) came back as binary or summaries | Several values stayed "cannot verify"; one agent wrote its own zlib decoder | Tell agents to prefer `arxiv.org/html/<id>` and `arxiv.org/abs/<id>`, and to use WebFetch `offset` for long pages. If PDFs matter, ask the user up front to allow `pdftotext` (poppler-utils) for subagents. |
| 2 | Two agents refused to write their report files ("guidelines bar report files") | Missing scratchpad copies | Make the final message the deliverable. Writing a file is optional. |
| 3 | A Haiku agent mislabelled a table row: it gave a Haiku 4.5 score as Opus 4.5. Two agents disagreed | Needed a verifier and a correction | Expect row and column mix-ups. Verifiers must return **exact row labels with headers**. Send conflicts to a running verifier with `SendMessage`. |
| 4 | The report draft was written before the last verifier returned. New facts (Polish function-calling values, RAG subset sizes) forced edits to the TL;DR, sections, factor table, recommendations, source list and HTML in both languages | About 20 edits across 4 files | Freeze the data file first and write after verification closes. Patch in one scripted pass. |
| 5 | Comparison caveats appeared late: different question-set sizes per language, metric that penalises inflection, translation method | Re-edits and caveat additions | Have search briefs collect up front: **n per condition, metric definition, translation method (human/MT/which MT), shots/prompt, model versions**. |
| 6 | Units: "32%" was reported as "32 points"; a family average was quoted 0.680 but recomputes to 0.686 | Small corrections | Verifiers must keep the unit as printed and recompute any average or ratio they can. |
| 7 | A press figure was attributed to the wrong paper | Correction | Never take a number from a summary. Verifiers must find the sentence or table in the primary text. |
| 8 | Values that existed only in figures were requested repeatedly | Wasted fetches | After one failed attempt, mark "figure only" and move on, unless raw data (GitHub results, HF dataset) exists. |
| 9 | An earlier agent saved raw PDF text to the scratchpad. A later verifier extracted the missing values from it | That was the fix | Tell later agents which scratchpad files already exist, with paths. |
| 10 | arXiv IDs and dates looked odd (a 2608 ID with a June v1 date) and some model names were unknown to the lead | Risk of dismissing real data | Verify, do not assume fabrication. Record the anomaly in the report. |
| 11 | The HTML `<select>` with long option text widened its panel at phone width; −0.04 rendered as "−0.0" | One fix round | Use `select{max-width:100%}`, `.panel>*{min-width:0}`, and a formatter that adds a decimal for tiny non-zero values. These are already in the example asset. |
| 12 | Artifact files must not contain `<!doctype>`/`<html>`/`<head>`, but the repository copy should open standalone | Two build variants | Keep one fragment source with `__TITLE__`/`__LANG__` placeholders. Generate the artifact fragments with `sed`, and wrap the repository copies with a doctype, head and body. |
| 13 | Quotes from papers and press | Copyright limit | Paraphrase; at most one short quote per response. |
| 14 | The lead never searched itself | Good: kept context clean | Keep it that way. Lead context should hold summaries and verdicts, not raw pages. |

## Quality checklist before writing

- [ ] Each charted value has: source ID, table/section, unit, verification verdict.
- [ ] Each comparison states n, metric, translation method and whether the items are identical.
- [ ] Conflicts between agents are resolved or explicitly listed as open.
- [ ] Gap iterations done (count as requested) with national-language queries.
- [ ] Press is used only for positions or leads, never for numbers.
- [ ] Every "not found" names what was searched.
