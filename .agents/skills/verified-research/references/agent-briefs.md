# Agent briefs (copy, fill the `<…>` parts)

Subagents start with no context, so every brief must be complete. Write briefs in English; queries go in the target languages.

## Shared blocks (paste into every brief)

### Context block
```
You are <role> <ID> in a team coordinated by a lead researcher. Today is <YYYY-MM-DD>.
Overall project: <1–3 sentences: the question(s), what the final report must answer>.
Comparison criterion: <e.g. "same model, same items, condition A vs condition B">. Flag YES/NO for it on every source.
```

### Source rules
```
- Evidence = primary sources only: peer-reviewed papers, arXiv preprints, technical reports, official model/system cards, benchmark papers, leaderboards with documented methodology, HF/GitHub with results, official statistics.
- News, blogs, popular science, social media and forums are LEADS only. Never report a number seen only there; label it UNVERIFIED-LEAD.
- Prefer https://arxiv.org/abs/<id> (metadata) and https://arxiv.org/html/<id> (tables). PDFs usually come back binary and no PDF tools are available. WebFetch reads ~100k chars per call; use offset for long pages. Ask WebFetch for exact table rows verbatim with column headers.
- Never invent URLs, authors, numbers or titles. "Not found" and "cannot verify" are valid results.
- If WebSearch/WebFetch are not callable, load them with ToolSearch query "select:WebSearch,WebFetch".
- Keep quotes ≤15 words; paraphrase otherwise.
```

### Extraction checklist (per source)
```
1. URL resolves; title/authors match. 2. Date, version, venue.
3. Exact numbers + unit as printed + model + condition + table/figure location.
4. n per condition, metric definition, translation method (human / which MT), shots/prompt.
5. Does it meet the comparison criterion? YES/NO.
6. Authors' caveats; significance tests (yes/no).
7. Evidence level: A peer-reviewed, B arXiv/tech report/system card, C leaderboard/dataset card, D lead only.
8. Extraction confidence: high/medium/low.
```

### Output format (search agents)
```
Return the full report as your FINAL MESSAGE (writing a file is optional):
# <ID> report: <scope>
## Summary (5–10 bullets with numbers)
## Sources  (per source: fields from the extraction checklist)
## Data (CSV: source_id,model,condition_or_language,task,metric,value,setting,location_in_source)
## Search log (every query, its language, found/not found)
## Open questions / items needing cross-verification
```

## Search agent template
```
<Context block>
## YOUR SCOPE: <scope title>
<What to find, 3–6 sentences. Name candidate papers/benchmarks/institutions as "verify, names may differ". If you have a working hypothesis, say "hypothesis to VERIFY, not assume".>
Search phrases (run at least <12–18>; at least <N> in <languages>):
<list of example queries in each language, plus site: queries>
Places to look: <arXiv listing, ACL Anthology, OpenReview, Semantic Scholar "cited by", HF datasets, GitHub, national university repositories, vendor model cards>.
Already known (do not re-report): <list of IDs>.
<Source rules>
<Extraction checklist>
<Output format>
```

## Verifier template
```
You are verification subagent <ID>. Today is <date>. Another agent extracted the claims below.
INDEPENDENTLY CHECK each against the primary source. Be skeptical: look for wrong rows, swapped columns, wrong units, wrong table numbers, wrong authors/venues, papers that do not exist.
<Source rules>
## Claims
C1. <paper title, ID, table>: <exact values as claimed>. Also check: <n, metric, translation method>.
C2. ...
<If raw text was saved earlier: "Raw extracted text is at <scratchpad path>; read it with Read/Grep.">
## Output (final message)
| Claim | Verdict (CONFIRMED / PARTLY / WRONG / CANNOT VERIFY) | Evidence (URL + table/section; quote ≤15 words) | Correct value if different |
## Extra values (CSV) — include exact row labels and column headers
## URLs/files checked
Rules: keep units as printed; recompute averages/ratios where possible; for conflicts, give the exact row label of each value.
```

Add a claim to a running verifier:
```
SendMessage(to: <verifier id>, message: "Extra item for C3: agent A says <…>, agent B says <…>. Determine which is right and give exact row labels and values. Add as C3b.")
```

## Gap-iteration template
```
You are search subagent I<k> — iteration <k> on a specific gap. <k-1> earlier iterations did NOT find <precise description of the missing comparison>.
Already known (do NOT re-report): <IDs>.
Search differently than before:
1. <national-language sources: university repositories, theses, national conferences, institute blogs — as leads>
2. <dataset hubs: HF dataset search terms>
3. <multilingual/multi-population benchmarks that may include the target>
4. <other related languages' national queries for the same gap>
Run at least 15 queries (at least 7 in <language>).
<Source rules>
## Output (final message)
## Verdict per gap: FOUND / PARTLY / NOT FOUND (one paragraph each)
## Sources found (extraction checklist fields)
## CSV
## Search log
```
