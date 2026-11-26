# Report, data file and interactive page

## Data file (write first)

`scratchpad/research/data.json`: one entry per value.
```json
{"id":"medpl-lek-gpt4o-pl","source":"2412.00559","table":"Tab. 4","model":"GPT-4o","condition":"pl","metric":"accuracy %","value":89.96,"n":null,"verdict":"CONFIRMED","verifier":"V2"}
```
Reports and charts read from this file. When a verifier corrects a value, change it here once.

## Markdown report structure

Use this structure in both languages, with the same sections, tables and numbers:

1. Title with "as of <date>"; a quote block with links to the other language, the HTML and the method in one sentence.
2. **TL;DR**: 5–6 numbered answers with the key numbers. Use sub-bullets for lists.
3. **Source of the claim**: an article/source table, then "what it measures", a "claims vs paper" table with a verdict column, other verified numbers, the authors' reaction (press as position only), and newer runs.
4. **Evidence by area**: an evidence-level legend, then one subsection per area. Each source gets authors, venue, ID link, level, "verified", n, metric and translation method, a table or values, and a one-line takeaway.
5. **Answer**: a factor table with columns factor, effect and evidence.
6. **Practical recommendations**: numbered.
7. **Method, verification, limitations**: rounds and agents, what verification caught, what stayed unverified.
8. **Source list**: columns ID, source, year/venue, level, target included?, meets comparison criterion?

Style: short sentences, no em-dash asides, units as printed. Use a decimal comma in the Polish version.

## Interactive HTML page

- Start from `assets/example-interactive-report.html`. Keep the token block (light and dark), the bilingual mechanism (`.l-pl` and `.l-en` spans, `T(pl, en)` in JS, `data-lang` on `<html>`) and the chart primitives: `dumbbell`, `bars`, `hbars`, scatter, tooltip and `niceTicks`.
- Replace the data constants and sections.
- Chart choice:
  - paired conditions per model: dumbbell plus a Δ column;
  - "gap vs strength": scatter with a zero line;
  - before/after conditions: grouped bars;
  - shares: stacked bar;
  - rankings: horizontal bars.
- Add one calculator if the topic has a cost or size lever.
- Add a filterable source table (search box, area chips, "target only" toggle).
- Palette: run `dataviz/scripts/validate_palette.js` with `--pairs all` for the scatter series. Blue `#2a78d6` / orange `#eb6834` / aqua `#1baf7a` (dark `#3987e5` / `#d95926` / `#199e70`) passed in the first run.
- The source file uses placeholders `__TITLE__` and `__LANG__`. Build it like this:

```bash
sed -e 's/__TITLE__/<PL title>/' -e 's/__LANG__/pl/' src.html > <slug>-pl.fragment.html   # publish as artifact
sed -e 's/__TITLE__/<EN title>/' -e 's/__LANG__/en/' src.html > <slug>-en.fragment.html
wrap(){ printf '<!doctype html>\n<html lang="%s" data-lang="%s">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' "$1" "$1"; cat "$2"; printf '\n</body>\n</html>\n'; }
wrap pl <slug>-pl.fragment.html > <out-dir>/<slug>-<date>-pl.html
wrap en <slug>-en.fragment.html > <out-dir>/<slug>-<date>.html
```

- Publish the fragments with `Artifact` (icon e.g. `chart`, and a one-sentence description in each language). Tell the user the artifacts are private until they share them.
- One browser check of the standalone file:
  - `read_console_messages` with errors only;
  - `document.documentElement.scrollWidth <= innerWidth`;
  - a screenshot of each chart type.
