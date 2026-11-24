# Polish, Slavic languages and English in LLMs: what the evidence says (as of 2026-11-24)

> Research report prepared for the "AI dla programistów" course. Polish version: [polish-vs-english-llm-evidence-2026-11-24-pl.md](polish-vs-english-llm-evidence-2026-11-24-pl.md).
> Interactive version (same data, charts, PL/EN switch): [polish-vs-english-llm-evidence-2026-11-24.html](polish-vs-english-llm-evidence-2026-11-24.html) (EN) and [polish-vs-english-llm-evidence-2026-11-24-pl.html](polish-vs-english-llm-evidence-2026-11-24-pl.html) (PL).
> Method: 14 Haiku research subagents in 3 rounds (6 search agents, 7 independent verifiers, 1 extra search iteration), coordinated and quality-checked by the lead agent. Only primary sources (papers, arXiv preprints, technical reports, system cards, leaderboards with a documented method) are used as evidence. Press, blogs and social media were used only to find those sources.

## TL;DR

1. **The cryps.pl article is based on OneRuler** (Kim, Russell, Karpinska, Iyyer; UMD, Microsoft, UMass; arXiv 2503.01996, COLM 2025). Its numbers are quoted correctly: Polish 88% (1st of 26), English 83.9% (6th), Chinese 62.1%. The interpretation is wrong. This is a **long-context retrieval test** (needle-in-a-haystack tasks only, average of 64K and 128K tokens). It does not measure prompting, reasoning or "understanding". The paper reports no significance test. Each language uses a different book as the "haystack". A co-author publicly said that the study does not show Polish is the best language for prompting.
2. **Newer data (2025–2026) does not confirm that "Polish beats English" in general.** It shows a **gap that depends on model strength**:
   - small and mid-size open models lose 5–16 points in Polish compared with English on the same questions;
   - frontier models (GPT-4o and later, GPT-5.x, Claude 4.5/5, Gemini 2.5/3) score within about 0–6 points of English, and sometimes higher in Polish or another Slavic language, especially on local or cultural content.
3. **Language does affect reasoning, mainly through three mechanisms:**
   - Understanding the input is the main bottleneck. Translating or restating the input recovers much of the loss.
   - Reasoning models think mostly in English. Forcing them to reason in the user's language costs 7–15 points on hard math and science.
   - Tokenization makes Polish about 1.8x more expensive (tokens per word), which also shortens the effective context.
4. **Retrieval and RAG.** Lexical search (BM25) works worse in Polish because of inflection: lower on all 11 BEIR-PL datasets. Questions asked in the same language as the documents work better in RAG (CUS-QA: +3.5 to +22.8 points for native-language questions). Multilingual RAG systems tend to prefer documents in the query's language. In the only same-model Polish vs English RAG comparison (MKQA, 3–9B models, gold passage given), Polish is 1–27 points lower in every condition.
5. **Agents and tool use.** The only Polish data is **MASSIVE-Agents** (Findings of EMNLP 2025, 52 languages). In zero-shot function calling, Polish is 15–37 points below English; for Nova Lite and Nova Pro it is the weakest of all 52 languages. The models are from 2024; with a one-shot prompt Polish is no longer last. For complex agent tasks there is no Polish data. In related languages, machine-translated agent tasks lose 17–30 points, and human-audited versions still trail English by 3–16 points (GAIA, German and Portuguese). For Russian function calling, the sign of the gap flips depending on the model and training setup.
6. **Polish-specific same-item comparisons exist** for medical exams, PISA-style reasoning, cultural visual question answering, translated EU benchmarks, BM25 retrieval, small-model RAG (MKQA) and zero-shot function calling (MASSIVE-Agents). They do **not** exist for long-context retrieval (other than OneRuler), RAG with frontier models, or multi-step agents. We searched for them in 5 iterations, in Polish, Czech, Ukrainian and English.

---

## 1. Source of the cryps.pl article

| | |
|---|---|
| Article | cryps.pl, "Sztuczna inteligencja mówi po polsku – nasz język zdeklasował angielski w najnowszym rankingu" (25 Oct 2025) |
| Primary source | **"One ruler to measure them all: Benchmarking multilingual long-context language models"**, Yekyung Kim, Jenna Russell, Marzena Karpinska, Mohit Iyyer. arXiv [2503.01996](https://arxiv.org/abs/2503.01996) (v1 3 Mar 2025, v3 30 Sep 2025). Code: [github.com/mungg/OneRuler](https://github.com/mungg/OneRuler) |
| Venue | COLM 2025. A secondary source says the PDF header carries this label; our verifier could not confirm it on an OpenReview or COLM page. |
| Evidence level | A/B (conference paper; arXiv version read) |

### What OneRuler measures

- 26 languages; 7 tasks, of which 5 are needle-in-a-haystack (NIAH) variants (single, multi-key, multi-value, multi-query, "none") and 2 are aggregation tasks (common-word extraction, easy and hard).
- Context lengths 8K, 32K, 64K, 128K. 50 examples per language per configuration.
- Models: Qwen2.5 7B and 72B, Llama 3.1 8B, Llama 3.3 70B, Gemini 1.5 Flash, o3-mini-high. DeepSeek-R1 was run in English only.
- Each language's "haystack" is a different public-domain book. English uses *Little Women*; Polish uses *Noce i dnie*, vol. 3.

### Claims vs paper (verified by two agents independently)

| Claim in the press | What the paper says | Verdict |
|---|---|---|
| Polish first with 88% | 88%, rank 1 of 26, **NIAH tasks only, average of 64K and 128K, across models** (§3.1, Fig. 4b) | Number correct, scope overstated |
| English "under 84%", 6th place | 83.9%, 6th. Appendix D: with equal content instead of equal token counts, English is "typically 8th" | Correct |
| Chinese 62.1% | 62.1%, 4th worst | Correct |
| "Polish grammar reduces ambiguity" | No such explanation. Authors call some results unclear and mention data availability, script, language family and tokenizer as possible factors | Not supported |
| "Polish is the best language for prompting AI" | The paper tests no prompting and no instruction following | Misreading |
| Polish is better than English | No significance test in the paper. The gap is about 4 points, roughly 2 standard errors by our rough estimate. Different book per language is a confound | Not shown |

Other verified numbers from the paper:
- o3-mini-high at 128K: English 67%, Polish 92%, Ukrainian 89% (§3.1).
- The accuracy gap between high- and low-resource languages grows from 11% at 8K to 34% at 128K (§3.1).
- Adding the option "the answer may not exist" drops English single-NIAH accuracy at 128K by 32% (§4).
- The language of the instructions alone shifts accuracy by up to 20% (abstract, §4). Example: 91% to 71% at 64K when instructions switch to Korean.

**Authors' reaction** (press, used only to describe their position): Science in Poland/PAP (27 Nov 2025) quotes co-author Marzena Karpińska. She says the team did not study prompting, models did only slightly better on average in Polish, and no language was concluded to be superior. Spider's Web (12 Nov 2025) reports the same clarification. Its headline attributes it to Microsoft, but the text attributes it to Karpińska.

**Newer runs:** we found no re-run of OneRuler on 2025–2026 models. The GitHub repository has no results folder.

---

## 2. Newer evidence by area

Evidence levels: **A** peer-reviewed venue · **B** arXiv preprint, technical report or system card · **C** leaderboard or dataset card · **D** lead only. "Verified" means a second agent re-read the primary table.

### 2.1 Same questions in Polish and English (knowledge and reasoning)

**Medical exams, Polish vs official English translation** (Grzybowski et al., Findings of EMNLP 2025, [2412.00559](https://arxiv.org/abs/2412.00559), A, verified). Matched subset of the LEK exam; the English version was prepared by the Medical Examination Center (human translation).

| Model | Polish | English | PL − EN |
|---|---|---|---|
| Qwen2.5-7B | 51.92 | 67.73 | −15.81 |
| Llama-3.1-8B | 51.25 | 64.69 | −13.44 |
| Mistral-Large-2407 | 76.75 | 82.40 | −5.65 |
| Qwen2.5-72B | 76.87 | 81.93 | −5.06 |
| Llama-3.1-70B | 80.94 | 82.60 | −1.66 |
| GPT-4o-mini | 75.88 | 75.92 | −0.04 |
| GPT-4o | 89.96 | 88.69 | +1.27 |
| Bielik-11B-v2.2 | 62.36 | 56.98 | +5.38 |

The authors note that the gap between languages narrows as model quality improves. The Polish-tuned Bielik does better in Polish.

**mmPISA-bench** (Sapenov & Savelka, arXiv [2606.07069](https://arxiv.org/abs/2606.07069), June 2026, B, verified). 25 PISA math and reading items in 43 languages, 5 repetitions per cell. "Claude none" is Claude Haiku 4.5; "Claude high" is Claude Opus 4.5.

| Language | Claude none | Claude high | GPT-5.1 none | GPT-5.1 high |
|---|---|---|---|---|
| English | 90.4 | 100.0 | 76.8 | 96.8 |
| **Polish** | 87.2 | 94.4 | 78.4 | 96.0 |
| Czech | 84.8 | 96.8 | 79.2 | 94.4 |
| Slovak | 88.0 | 96.0 | 74.4 | 95.2 |
| Russian | 85.6 | 95.2 | 84.8 | 94.4 |
| Bulgarian | 85.6 | 96.8 | 84.0 | 90.4 |
| Serbian | 87.2 | 99.2 | 77.6 | 96.0 |
| Croatian | 88.8 | 96.8 | 78.4 | 96.0 |
| Slovenian | 89.6 | 95.2 | 80.0 | 96.0 |
| Bosnian | 87.2 | 99.2 | 75.2 | 96.8 |
| German | 85.6 | 96.8 | 81.6 | 100.0 |
| French | 91.2 | 99.2 | 79.2 | 96.8 |

Reasoning effort changes the score much more than language does. With only 25 items, a 1–2 item difference is noise.

**MMLU-ProX** (Xuan et al., EMNLP 2025 main, [2503.10497](https://arxiv.org/abs/2503.10497), A; verified against the PDF text). About 11,800 identical questions per language, 5-shot chain-of-thought. Polish is not included; Czech, Russian, Ukrainian and Serbian are.

| Model | EN | CS | RU | UK |
|---|---|---|---|---|
| Qwen3-235B (thinking) | 80.7 | 80.5 | 77.0 | 78.8 |
| DeepSeek-R1 | 79.5 | 76.8 | 76.4 | 76.8 |
| GPT-4.1 | 79.8 | 77.5 | 71.2 | 76.4 |
| o4-mini | 73.7 | 73.5 | 62.0 | 73.3 |
| Qwen3-32B (thinking) | 74.9 | 72.8 | 69.1 | 73.5 |
| Gemma3-27B | 66.5 | 62.6 | 62.5 | 61.7 |
| Phi4-14B | 71.5 | 63.2 | 65.2 | 61.3 |
| Qwen2.5-7B | 57.5 | 42.3 | 46.3 | 42.9 |
| Llama3.1-8B | 45.2 | 23.1 | 28.8 | 24.1 |

Serbian for DeepSeek-R1 is 80.9, above English. The paper prints GPT-4o values with English below several Slavic languages (EN 59.9, RU 62.0, CS 70.1). This is probably an artifact of the English run, so we exclude it from the conclusions. Strong reasoning models lose 0–4 points; 7–8B models lose 11–22 points.

**EU20 translated benchmarks** (Thellmann et al., [2410.08928](https://arxiv.org/abs/2410.08928), Oct 2024, B, verified; DeepL translations of ARC, GSM8K, HellaSwag, MMLU and TruthfulQA). Llama-3.1-70B-Instruct averages: EN 0.79, ES 0.73, FR 0.72, CS 0.71, DE 0.71, **PL 0.70**, SK 0.69, SL 0.67, BG 0.66. The largest Polish gap is on GSM8K: 0.87 vs 0.69.

**Regional knowledge, native question vs English translation of the same question** (CUS-QA, [2507.22752](https://arxiv.org/abs/2507.22752), B, verified). LLM-judge accuracy.

| Model | CZ native / EN | SK native / EN | UA native / EN |
|---|---|---|---|
| GPT-5 | 83.1 / 80.7 | 73.3 / 70.2 | 73.2 / 72.2 |
| Gemini 2.5 Flash | 78.0 / 75.8 | 64.2 / 61.3 | 68.9 / 63.0 |
| Llama 3.3 70B | 60.0 / 63.1 | 47.7 / 48.3 | 52.2 / 54.9 |
| Llama 3.1 8B | 29.6 / 36.5 | 19.6 / 25.6 | 25.7 / 34.1 |
| Mistral 7B v0.3 | 22.9 / 30.4 | 14.4 / 22.3 | 24.6 / 27.8 |

Strong models answer local questions better in the native language. Small models do better in English.

**Polish cultural visual QA** (PoVisLE, NASK, [2608.07763](https://arxiv.org/abs/2608.07763), Aug 2026, B, verified). 465 parallel items in PL, EN and DE; machine-translated and manually reviewed.

| Model | PL | EN | DE |
|---|---|---|---|
| Qwen3.5-397B (thinking) | 75.16 | 68.12 | 68.15 |
| Claude Sonnet 5 | 69.94 | 66.94 | 66.03 |
| GPT-5.4 | 68.35 | 70.40 | 63.53 |
| Qwen3.5-9B | 38.75 | 47.04 | 44.83 |

**Other Slavic evidence (verified):**
- **Bulgarian.** Gemma-2-27B base scores 74.47 on English benchmarks and 60.95 on Bulgarian ones machine-translated with Google Translate ([2412.10893](https://arxiv.org/abs/2412.10893), B). Part of this gap is translation artifacts.
- **South Slavic.** Zero-shot classification shows English − South Slavic macro-F1 gaps of 0.02–0.07 for sentiment and 0.03–0.10 for topic. The datasets are not parallel ([2511.07989](https://arxiv.org/abs/2511.07989), LREC 2026 workshop).
- **Translation errors inflate measured gaps.** After the MGSM translation was fixed, Russian results rose to near-English levels: GPT-5 from 95.2 to 99.6 (EN 99.6), Claude Sonnet 4.5 from 95.6 to 100.0 ([2511.05162](https://arxiv.org/abs/2511.05162), "Mind the Gap… or Not?", B).

### 2.2 Does language affect reasoning?

- **Forcing the reasoning language costs accuracy** (XReasoning, Qi et al., Findings of EMNLP 2025, [2505.22888](https://arxiv.org/abs/2505.22888), A, verified against the PDF). The forcing method is "prompt hacking": a prefix in the target language is inserted after the thinking token. Averages over 11 languages for Skywork-OR1-32B, standard vs forced: AIME 44.8 → 29.6; GPQA 53.6 → 39.8; MGSM 75.4 → 71.9. Without forcing, its reasoning matches the user's language in only about 33% of AIME and GPQA cases. For Distill-R1-32B: AIME 25.5 → 17.0; GPQA 40.3 → 33.4; MGSM 70.2 → 71.7. On easy math (MGSM) the cost is small or zero. Of the 11 languages, Russian is the only Slavic one.
- **English is the best reasoning language** (Yong et al., [2505.05408](https://arxiv.org/abs/2505.05408), B). s1-32B on MGSM: 91.2 on high-resource languages (including Russian) vs 80.8 on low-resource ones. Forcing low-resource-language thinking lowers this to 75.7. Saji et al. ([2510.20647](https://arxiv.org/abs/2510.20647)) show the cost of reasoning in English: for QwQ-32B, translation errors cause 77% of wrong answers in low-resource languages but only 30% in high-resource ones.
- **Models think in English even for Polish input** (Pihulski & Kocoń, [2510.02351](https://arxiv.org/abs/2510.02351), B, verified). DeepSeek-R1 reasoned in English for 86% of prompts and in Russian for 14%; no reasoning was in Polish. Qwen3-8B: 62.8% EN, 33.0% RU, 4.2% PL.
- **The bottleneck is understanding the input** (Kang et al., Findings of ACL 2026, [2510.27269](https://arxiv.org/abs/2510.27269), A/B). An intervention that targets understanding lifts PolyMath-Low averages from 81.1 to 91.9. Translating about 19% of inputs selectively reaches 88.0.
- **Small models lose more** (MCLM, ACL 2025, [2502.17407](https://arxiv.org/abs/2502.17407), verified against the PDF). Qwen2.5-Math-1.5B on MT-MATH100: Polish 54.55 vs English 67.68, Russian 59.60, Czech 44.44, Ukrainian 38.38, Bulgarian 39.39 (about 99 items each, indicative only).
- **PluraMath** ([2607.05992](https://arxiv.org/abs/2607.05992), July 2026, B) adds Polish, Ukrainian, Czech, Serbian and Slovak to PolyMath and tests 27 reasoning models. It is the most promising new source for Polish math reasoning, but its per-language values could not be verified (table layout lost in extraction). Check it before citing.
- **Top reasoning models on hard math** (PolyMath, NeurIPS 2025 Datasets & Benchmarks, top level). Russian is near English or above it: Qwen3-235B-Thinking EN 40.0 vs RU 38.4; Gemini 2.5 Pro 39.2 vs 38.4; DeepSeek-R1 35.2 vs 37.6.
- **Prompt language barely matters for code** (MERA Code, [2507.12284](https://arxiv.org/abs/2507.12284), B, verified). Median Russian minus English differences range from −0.02 to +0.06 across 7 code tasks.
- **The gap in cross-lingual transfer is shrinking** ("Are Multilingual Models Actually Improving?", Findings of EMNLP 2026, [2606.21954](https://arxiv.org/abs/2606.21954), verified). Median hardness-adjusted transfer for models released after January 2025 vs earlier: 0.75 → 0.93 on MMLU-ProX-Lite and 0.90 → 0.97 on MGSMv2. The gap does not shrink consistently with model scale alone (MuBench, Findings of ACL 2026). Neither benchmark includes Polish.

### 2.3 Retrieval, RAG and long context

- **BM25 on BEIR vs BEIR-PL** (LREC-COLING 2024, [2305.19840](https://arxiv.org/abs/2305.19840), A, verified; Google Translate). nDCG@10 is lower in Polish on all 11 datasets with both values: NQ 32.6 → 20.1, HotpotQA 60.2 → 49.2, MS MARCO 47.7 → 41.9, SciFact 69.1 → 62.5. The authors attribute this to rich inflection and morphology.
- **Polish embedding leaderboards.** PL-MTEB ([2405.10138](https://arxiv.org/abs/2405.10138) v2, ACL Findings 2026, verified): best Polish retrieval nDCG@10 is 61.59 (stella-pl-retrieval-8k) vs 59.21 (Qwen3-Embedding-8B). PIRB ([2402.13350](https://arxiv.org/abs/2402.13350)), 41 Polish tasks: multilingual-e5-large 57.29, BM25 41.85, hybrid about 59.2. Neither benchmark has an English comparison.
- **RAG with native vs English questions** (CUS-QA RAG, dev split, top-3 FineWiki chunks). Llama 3.3 70B: CZ 65.9 vs 59.8, SK 76.9 vs 73.4, UA 58.7 vs 51.2. Llama 3.1 8B: SK 69.8 vs 47.0, UA 44.2 vs 33.7. Retrieval works best when the question is in the documents' language.
- **Same passage, Polish vs English** (Qi, Fernández, Bisazza, MRL 2025 workshop best paper, [2504.00597](https://arxiv.org/abs/2504.00597), A/B, verified). MKQA questions; the model gets one gold passage, not retriever output. Metric: strict substring match, which may penalise Polish inflection. The question sets differ in size: with an in-language passage there are 3,594 Polish vs 5,331 English questions.

  | Model | No context (PL / EN) | Passage in query language | Passage in other language |
  |---|---|---|---|
  | Aya-Expanse-8B | 50.1 / 58.0 | 79.2 / 87.5 | 68.0 / 69.4 |
  | Llama-3.2-3B | 35.3 / 61.8 | 60.6 / 82.4 | 51.5 / 63.9 |
  | Gemma-2-9B | 55.0 / 65.0 | 67.8 / 79.8 | 62.0 / 75.7 |
  | Qwen2.5-7B | 36.9 / 55.6 | 68.9 / 86.0 | 59.1 / 81.7 |

  Polish is lower in every condition. German and French mostly sit between Polish and English. Russian is below Polish without context and with a passage in another language, but slightly above it with an in-language passage for three of the four models.
- **Multilingual RAG prefers the query language.** In Faux Polyglot (NAACL 2025, [2407.05502](https://arxiv.org/abs/2407.05502)), 68% of the top-10 retrieved documents are in the query language. Park & Lee (ACL Findings 2025, [2502.11175](https://arxiv.org/abs/2502.11175)) find large drops when the query and document languages differ. XRAG (EMNLP Findings 2025): GPT-4o reaches 62.4 with English questions vs 54.7–56.8 with other languages over English documents. None of these include Polish.
- **Long context.** OneRuler is the only Slavic source. MLRBench (EACL 2026) finds effective context below 30% of the claimed length in multilingual settings, but covers no Slavic language.
- **Polish RAG in practice** (Bartanowicz & Jassem, LREC 2026, A). Bielik-11B-v2.3 outperformed PLLuM-12B as the generator in a real Polish RAG system. Per-table numbers could not be re-verified from the PDF.

### 2.4 Tokenization: the "Polish tax"

- **Tokenizer Tax** ([2605.24718](https://arxiv.org/abs/2605.24718), May 2026, single-author preprint, B, verified). Mean tokens per word on parallel SIB-200 text, averaged over 6 tokenizers: EN 1.23, ES 1.46, FR 1.52, IT 1.67, DE 1.76, **PL 2.25 (1.83× English)**, CS 2.28, SL 2.28, HR 2.31, BG 2.33, SK 2.45, UK 2.66.
- **Bielik v3 tokenizer report** ([2604.10799](https://arxiv.org/abs/2604.10799), April 2026, B, verified). Tokens per word on the preamble of the Polish Constitution and its official English translation (PL / EN): Llama 3.2 2.81 / 1.17; Qwen3 2.69 / 1.17; Mistral Small 3.1 2.36 / 1.19; Gemma3 2.20 / 1.20; EuroLLM 1.88 / 1.27; Polish APT4 tokenizer 1.62 / 1.98.
- **Practical effect.** The same text in Polish uses about 1.8–2.4× more tokens with mainstream tokenizers. That means higher cost, higher latency and less effective context. It is one of the hypotheses the OneRuler authors mention for language differences at long context.

### 2.5 Agents and tool use

- **MASSIVE-Agents** (Kulkarni et al., Amazon, Findings of EMNLP 2025, A; verified from the PDF text and anchored on Table 2). Human-localized MASSIVE requests in 52 languages reformatted for BFCL. Zero-shot AST accuracy on the 10k split (190 requests per language), Polish vs English: Nova Premier 29.47 / 57.37; Claude 3.5 Sonnet v2 18.95 / 53.68; Llama 3.1 405B 15.26 / 46.32; Nova Pro 10.53 / 47.89; Nova Lite 12.11 / 43.16; Llama 3.1 70B 13.68 / 34.21. Polish is the minimum of all 52 languages for Nova Lite and Nova Pro zero-shot, but not with a one-shot prompt. This is the only direct Polish agent evidence found in 5 search iterations, and it uses 2024-era models.
- **GAIA-v2-LILT** ([2604.24929](https://arxiv.org/abs/2604.24929), April 2026, B). Pass@1 for EN / DE machine-translated / DE human-audited: GPT-5.4 66.7 / 47.3 / 63.6; Gemini 3.1 Pro 73.9 / 49.7 / 66.7; Claude Opus 4.6 79.4 / 49.7 / 66.7. Machine translation of tasks causes most of the drop. Human-audited German still trails English by 3–13 points.
- **Russian function calling: the gap's sign depends on the setup.**
  - RFCB (Proc. ISP RAS 2026), Qwen3-8B after GRPO: multi-turn RU 35.41 vs EN 28.88, but single-turn RU 68.25 vs EN 91.32.
  - arXiv [2609.01572](https://arxiv.org/abs/2609.01572), Qwen3-32B on the BFCLv3 multi-turn subset: RU 37.12 vs EN 42.88.
- **Other benchmarks.** MAPS (Fujitsu, Cohere) reports up to 16% lower agent performance outside English. X-WebAgentBench includes Bulgarian and Russian but has no comparable English baseline. Ticket-Bench (6 Western European languages) shows that English is not always the best language.

### 2.6 Frontier vendors and leaderboards

- OpenAI (GPT-5 system card, simple-evals MMMLU), Google (Gemini 2.5 report, Global-MMLU-Lite) and Qwen3 publish **no Polish per-language results**. MMMLU has 14 languages and no Slavic one.
- Benchmarks that include Polish:
  - Global-MMLU (ACL 2025): per-language values only in figures.
  - INCLUDE: GPT-4o 5-shot scores 78.8 in Polish; there is no English row.
  - Global PIQA: Polish 100.0 for the best model vs English 97.0, i.e. saturated and a different best model per language.
  - Arena Polish text leaderboard: human preference, no English baseline.

---

## 3. Answer: does the language influence an LLM agent's reasoning?

**Yes, but less than the headlines suggest, and in a predictable way.**

| Factor | Effect on Polish/Slavic vs English | Evidence |
|---|---|---|
| Model strength | Small and open models lose 5–16 points; frontier models are within about 0–6 points, sometimes ahead | Grzybowski, MMLU-ProX, CUS-QA, mmPISA |
| Content locality | Local or cultural knowledge is better in the native language for strong models | CUS-QA, PoVisLE |
| Reasoning trace language | Models think in English; forcing native-language reasoning costs 7–15 points on hard tasks | XReasoning, Pihulski |
| Translation quality of the test | Machine-translated benchmarks overstate the gap | Mind the Gap, GAIA-LILT, BgGPT |
| Lexical retrieval | BM25 loses 6–12 points in Polish (inflection) | BEIR-PL |
| Query–document language match | Same language works best in RAG | CUS-QA RAG, Park & Lee, Faux Polyglot |
| Tokenization | 1.8–2.4× more tokens per word, shorter effective context, higher cost | Tokenizer Tax, Bielik v3 |
| Long context | Polish was top in OneRuler NIAH, but the result is narrow, untested for significance and confounded | OneRuler |
| Agents | Zero-shot function calling: Polish 15–37 points below English (2024 models). Translated multi-step tasks lose 3–30 points in other European languages | MASSIVE-Agents, GAIA-LILT, RFCB, MAPS |

## 4. Practical recommendations (Polish RAG and agents)

1. **Frontier models:** prompt in the language of your users and data. There is no evidence that translating to English helps them, and it can hurt on local content.
2. **Small and local models (≤ 30B):** test an English system prompt or a translate-then-answer pipeline on your own Polish evaluation set. Gaps of 10–15 points are common.
3. **Do not force the reasoning language.** Let the model think freely and ask only for the final answer in Polish.
4. **RAG:** keep the query language equal to the corpus language, or translate the query. Use hybrid retrieval: BM25 with Polish lemmatization plus dense embeddings from the PL-MTEB leaders. Avoid plain BM25.
5. **Budget about 2× tokens** for Polish text in cost, latency and context-window planning. Check the tokenizer of the model you choose.
6. **Build a Polish evaluation set from real, human-written data.** Public "Polish" benchmarks are often machine-translated, and translation errors distort the comparison.
7. **Agents:** Polish requests can sharply lower function-calling accuracy, especially without examples in the prompt. Add few-shot examples and measure tool-calling accuracy on Polish requests before going to production.

## 5. Method, verification and limitations

**Process**
- **Round 1:** 6 parallel search agents covering:
  - the article source;
  - Polish benchmarks;
  - reasoning;
  - retrieval, RAG and long context;
  - other Slavic languages, searched in Czech, Slovak, Ukrainian, Russian, Slovenian, Croatian, Serbian and Bulgarian;
  - frontier model cards.
- **Round 2:** 5 independent verifiers re-read the primary tables, and conflicts were resolved. Example: a mislabelled mmPISA row was caught; "Opus 87.2" was really Haiku 4.5 without reasoning.
- **Round 3:** 2 more verifiers and a 5th search iteration on the remaining Polish gaps (RAG, long context, agents). The 5th iteration found the MKQA RAG comparison. A verifier then confirmed it and extracted the Polish MASSIVE-Agents values from the PDF text.

**Verification verdicts**
- About 45 claims were checked. Most were confirmed.
- Corrected: units ("%" vs "points"), table attributions, a tokenizer list (GPT-4o is not in Bielik's Table 1) and family averages (Slavic 0.686 recomputed vs 0.680 stated).

**Limitations**
- Subagents read papers through an HTML-to-text summarizer or a raw PDF text decoder. PDF-only tables (LREC 2026 RAG, OneRuler heatmaps) could not be fully verified. MASSIVE-Agents per-language values rest on one decoded-text mapping anchored on Table 2.
- Very recent 2026 preprints are not peer-reviewed.
- Several "frontier" results use only 2–3 models or small item sets.

## 6. Source list

| ID | Source | Year / venue | Level | Polish? | Same-item vs EN |
|---|---|---|---|---|---|
| OneRuler | Kim et al., arXiv 2503.01996 | 2025, COLM | A/B | yes | yes |
| MedPL | Grzybowski et al., 2412.00559 | 2025, Findings EMNLP | A | yes | yes |
| mmPISA | Sapenov & Savelka, 2606.07069 | 2026, arXiv | B | yes | yes (25 items) |
| PoVisLE | Kołos et al. (NASK), 2608.07763 | 2026, arXiv | B | yes | yes (MT + review) |
| EU20 | Thellmann et al., 2410.08928 | 2024, arXiv | B | yes | yes (DeepL) |
| BEIR-PL | Wojtasik et al., 2305.19840 | 2024, LREC-COLING | A | yes | yes (BM25) |
| Tokenizer Tax | Ovcharov, 2605.24718 | 2026, arXiv | B | yes | yes |
| Bielik v3 tok. | Ociepa et al., 2604.10799 | 2026, arXiv | B | yes | yes |
| MMLU-ProX | Xuan et al., 2503.10497 | 2025, EMNLP | A | no (CS, RU, UK, SR) | yes |
| CUS-QA | 2507.22752 | 2025, arXiv | B | no (CS, SK, UK) | yes |
| XReasoning | Qi et al., 2505.22888 | 2025, Findings EMNLP | A | no (RU) | yes |
| MCLM | Son et al., 2502.17407 | 2025, ACL | A | yes | yes (small n) |
| PolyMath | 2504.18428 | 2025, NeurIPS D&B | A | no (RU) | yes |
| PluraMath | 2607.05992 | 2026, arXiv | B | yes | values unverified |
| Yong et al. | 2505.05408 | 2025, arXiv | B | no (RU) | yes |
| Kang et al. | 2510.27269 | 2026, Findings ACL | A | no | yes |
| Saji et al. | 2510.20647 | 2025, arXiv | B | no | — |
| Mind the Gap | Peter et al., 2511.05162 | 2025/26, arXiv | B | no (RU) | yes |
| Reasoning language | Pihulski & Kocoń, 2510.02351 | 2025, arXiv | B | yes | traces only |
| HAT transfer | Bajpai et al., 2606.21954 | 2026, Findings EMNLP | A | no | — |
| MuBench | Han et al., 2506.19468 | 2026, Findings ACL | A | yes | aggregates only |
| PL-MTEB | Poświata et al., 2405.10138 | 2026, Findings ACL | A | yes | no |
| PIRB | Dadas et al., 2402.13350 | 2024, LREC-COLING | A | yes | no |
| PLCC | Dadas et al., 2503.00995 | 2025, arXiv | B | yes | no |
| LLMzSzŁ | Jassem et al., 2501.02266 | 2025, arXiv | B | yes | no |
| PL RAG | Bartanowicz & Jassem, 2026.lrec-1.211 | 2026, LREC | A | yes | no |
| Faux Polyglot | Sharma et al., 2407.05502 | 2025, NAACL | A | no | — |
| Lang. pref. RAG | Park & Lee, 2502.11175 | 2025, Findings ACL | A | no | — |
| XRAG | 2505.10089 | 2025, Findings EMNLP | A | no | — |
| MLRBench | Hengle et al., 2504.12845 | 2026, EACL | A | no | — |
| BgGPT | 2412.10893 | 2024, arXiv | B | no (BG) | yes (MT) |
| South Slavic cls. | Kuzman Pungeršek et al., 2511.07989 | 2026, LREC ws. | A/B | no | no (non-parallel) |
| MERA Code | 2507.12284 | 2025, arXiv | B | no (RU) | prompt language |
| GAIA-v2-LILT | Kim et al., 2604.24929 | 2026, arXiv | B | no | yes |
| RFCB | Ionov & Malykh, Proc. ISP RAS 38(3) | 2026, journal | A | no (RU) | yes |
| Corporate LLM | Tsymboi et al., 2609.01572 | 2026, arXiv | B | no (RU) | yes |
| MASSIVE-Agents | Kulkarni et al., 2025.findings-emnlp.1099 | 2025, Findings EMNLP | A | yes | yes (zero-shot) |
| MKQA mRAG | Qi, Fernández, Bisazza, 2504.00597 | 2025, MRL workshop | A/B | yes | yes (subsets differ) |
| MAPS | Hofman et al., 2505.15935 | 2025, arXiv | B/C | no (RU) | figures only |
| Global PIQA | 2510.24081 | 2025, arXiv | B | yes | best-model only |
| INCLUDE | 2411.19799 | 2024/25, arXiv | B | yes | no EN row |
| GPT-5 system card | OpenAI, 2601.03267 | 2025/26 | B | no | — |
| Science in Poland / PAP | Author interview, 27 Nov 2025 | press | D | — | used only for authors' position |
