# Polski, języki słowiańskie i angielski w LLM: co mówią dane (stan na 24.11.2026)

> Raport badawczy przygotowany na szkolenie „AI dla programistów”. Wersja angielska: [polish-vs-english-llm-evidence-2026-11-24.md](polish-vs-english-llm-evidence-2026-11-24.md).
> Wersja interaktywna (te same dane, wykresy, przełącznik PL/EN): [polish-vs-english-llm-evidence-2026-11-24-pl.html](polish-vs-english-llm-evidence-2026-11-24-pl.html) (PL) i [polish-vs-english-llm-evidence-2026-11-24.html](polish-vs-english-llm-evidence-2026-11-24.html) (EN).
> Metoda: 14 subagentów badawczych Claude Haiku w 3 rundach (6 agentów wyszukujących, 7 niezależnych weryfikatorów, 1 dodatkowa iteracja wyszukiwania). Agent prowadzący koordynował pracę i kontrolował jakość. Jako dowody służą wyłącznie źródła pierwotne: artykuły naukowe, preprinty arXiv, raporty techniczne, system cards oraz leaderboardy z opisaną metodologią. Prasę, blogi i media społecznościowe wykorzystano tylko do odnalezienia tych źródeł.

## W skrócie

1. **Artykuł cryps.pl opiera się na benchmarku OneRuler** (Kim, Russell, Karpinska, Iyyer; UMD, Microsoft, UMass; arXiv 2503.01996, COLM 2025). Liczby przytoczono poprawnie: polski 88% (1. z 26), angielski 83,9% (6.), chiński 62,1%. Interpretacja jest jednak błędna:
   - to **test wyszukiwania informacji w długim kontekście**: wyłącznie zadania typu „igła w stogu siana”, średnia z kontekstu 64K i 128K tokenów;
   - nie mierzy promptowania, rozumowania ani „rozumienia”;
   - praca nie zawiera testu istotności statystycznej, a każdy język ma inną książkę jako „stóg siana”;
   - współautorka publicznie wyjaśniła, że badanie nie dowodzi, iż polski jest najlepszym językiem do promptowania.
2. **Nowsze dane (2025–2026) nie potwierdzają, że „polski bije angielski” ogólnie.** Pokazują **lukę zależną od siły modelu**:
   - małe i średnie modele otwarte tracą po polsku 5–16 pkt względem angielskiego na tych samych pytaniach;
   - modele frontierowe (GPT-4o i nowsze, GPT-5.x, Claude 4.5/5, Gemini 2.5/3) mieszczą się w ok. 0–6 pkt od angielskiego. Czasem wypadają lepiej po polsku lub w innym języku słowiańskim, zwłaszcza przy treściach lokalnych i kulturowych.
3. **Język wpływa na rozumowanie, głównie przez trzy mechanizmy:**
   - Głównym wąskim gardłem jest zrozumienie wejścia. Tłumaczenie lub przeformułowanie pytania odzyskuje dużą część strat.
   - Modele rozumujące „myślą” głównie po angielsku. Wymuszenie rozumowania w języku użytkownika kosztuje 7–15 pkt na trudnej matematyce i naukach ścisłych.
   - Przez tokenizację polski jest ok. 1,8× droższy (tokeny na słowo), co dodatkowo skraca efektywny kontekst.
4. **Wyszukiwanie i RAG:**
   - Wyszukiwanie leksykalne (BM25) działa po polsku gorzej z powodu fleksji: niżej na wszystkich 11 zbiorach BEIR-PL.
   - W RAG lepiej działają pytania w tym samym języku co dokumenty (CUS-QA: od +3,5 do +22,8 pkt dla pytań w języku natywnym).
   - Wielojęzyczne systemy RAG preferują dokumenty w języku zapytania.
   - W jedynym porównaniu RAG PL vs EN na tych samych modelach (MKQA, modele 3–9B, podany poprawny fragment) polski jest niżej o 1–27 pkt we wszystkich warunkach.
5. **Agenci i wywoływanie narzędzi:**
   - Jedyne dane dla polskiego to **MASSIVE-Agents** (Findings EMNLP 2025, 52 języki). W wywoływaniu funkcji zero-shot polski jest 15–37 pkt za angielskim, a dla Nova Lite i Nova Pro to najsłabszy z 52 języków.
   - To modele z 2024 roku. Z jednym przykładem w prompcie polski przestaje być ostatni.
   - Dla złożonych zadań agentowych nie ma polskich danych. W pokrewnych językach zadania tłumaczone maszynowo tracą 17–30 pkt, a wersje z korektą ludzką wciąż ustępują angielskiemu o 3–16 pkt (GAIA, niemiecki i portugalski).
   - W rosyjskim function calling znak luki zmienia się zależnie od modelu i sposobu trenowania.
6. **Polskie porównania na tych samych pozycjach istnieją** dla:
   - egzaminów lekarskich;
   - rozumowania w stylu PISA;
   - kulturowego VQA (pytania o obrazy);
   - tłumaczonych benchmarków EU;
   - wyszukiwania BM25;
   - RAG na małych modelach (MKQA);
   - wywoływania funkcji zero-shot (MASSIVE-Agents).

   **Nie istnieją** dla wyszukiwania w długim kontekście (poza OneRuler), dla RAG z modelami frontierowymi ani dla wieloetapowych agentów. Szukaliśmy ich w 5 iteracjach, po polsku, czesku, ukraińsku i angielsku.

---

## 1. Źródło artykułu cryps.pl

| | |
|---|---|
| Artykuł | cryps.pl, „Sztuczna inteligencja mówi po polsku – nasz język zdeklasował angielski w najnowszym rankingu” (25.10.2025) |
| Źródło pierwotne | **„One ruler to measure them all: Benchmarking multilingual long-context language models”**, Yekyung Kim, Jenna Russell, Marzena Karpinska, Mohit Iyyer. arXiv [2503.01996](https://arxiv.org/abs/2503.01996) (v1 3.03.2025, v3 30.09.2025). Kod: [github.com/mungg/OneRuler](https://github.com/mungg/OneRuler) |
| Miejsce publikacji | COLM 2025. Według źródła wtórnego taki nagłówek ma PDF; nasz weryfikator nie potwierdził tego na stronie OpenReview ani COLM. |
| Poziom dowodu | A/B (artykuł konferencyjny; czytana wersja arXiv) |

### Co mierzy OneRuler

- 26 języków; 7 zadań, z czego 5 to warianty „igły w stogu siana” (NIAH: pojedyncza igła, wiele kluczy, wiele wartości, wiele zapytań, wariant „brak odpowiedzi”), a 2 to zadania agregacji (wyszukiwanie najczęstszych słów, łatwe i trudne).
- Długości kontekstu 8K, 32K, 64K i 128K. 50 przykładów na język i konfigurację.
- Modele: Qwen2.5 7B i 72B, Llama 3.1 8B, Llama 3.3 70B, Gemini 1.5 Flash, o3-mini-high. DeepSeek-R1 uruchomiono tylko po angielsku.
- „Stogiem siana” dla każdego języka jest inna książka z domeny publicznej. Dla angielskiego to *Little Women*, dla polskiego *Noce i dnie*, t. 3.

### Tezy w mediach a treść pracy (sprawdzone niezależnie przez dwóch agentów)

| Teza w mediach | Co mówi praca | Ocena |
|---|---|---|
| Polski pierwszy z 88% | 88%, 1. miejsce z 26, **wyłącznie zadania NIAH, średnia z 64K i 128K, po modelach** (§3.1, rys. 4b) | Liczba poprawna, zakres zawyżony |
| Angielski „niespełna 84%”, 6. miejsce | 83,9%, 6. miejsce. Aneks D: przy wyrównanej treści zamiast liczby tokenów angielski jest „zwykle 8.” | Zgodne |
| Chiński 62,1% | 62,1%, 4. od końca | Zgodne |
| „Polska gramatyka zmniejsza niejednoznaczność” | Brak takiego wyjaśnienia. Autorzy uznają część wyników za niejasne i jako możliwe czynniki wskazują dostępność danych, pismo, rodzinę językową i tokenizer | Niepoparte |
| „Polski to najlepszy język do promptowania AI” | Praca nie testuje promptowania ani wykonywania poleceń | Nadinterpretacja |
| Polski jest lepszy od angielskiego | Brak testu istotności. Różnica to ok. 4 pkt, według naszego zgrubnego szacunku ok. 2 błędy standardowe. Inna książka dla każdego języka zaburza porównanie | Nie wykazano |

Pozostałe zweryfikowane liczby z pracy:
- o3-mini-high przy 128K: angielski 67%, polski 92%, ukraiński 89% (§3.1).
- Różnica trafności między językami o dużych i małych zasobach rośnie z 11% przy 8K do 34% przy 128K (§3.1).
- Dodanie opcji „odpowiedź może nie istnieć” obniża trafność angielskiego zadania S-NIAH przy 128K o 32% (§4).
- Sam język instrukcji zmienia trafność nawet o 20% (streszczenie, §4). Przykład: przy 64K spadek z 91% do 71% po przełączeniu instrukcji na koreański.

**Reakcja autorów** (prasa, użyta wyłącznie do opisu ich stanowiska): Nauka w Polsce/PAP (27.11.2025) cytuje współautorkę Marzenę Karpińską. Mówi ona, że zespół nie badał promptowania, modele radziły sobie po polsku średnio tylko nieco lepiej i nie uznano żadnego języka za lepszy. Spider's Web (12.11.2025) podaje to samo wyjaśnienie. Tytuł przypisuje je Microsoftowi, ale treść artykułu przypisuje je Karpińskiej.

**Nowsze przebiegi:** nie znaleźliśmy powtórzenia OneRuler na modelach z lat 2025–2026. Repozytorium na GitHubie nie zawiera folderu z wynikami.

---

## 2. Nowsze dane według obszarów

Poziomy dowodów: **A** recenzowana konferencja lub czasopismo · **B** preprint arXiv, raport techniczny lub system card · **C** leaderboard lub karta zbioru danych · **D** tylko trop. „Zweryfikowane” oznacza, że drugi agent ponownie odczytał tabelę w źródle pierwotnym.

### 2.1 Te same pytania po polsku i po angielsku (wiedza i rozumowanie)

**Egzaminy lekarskie: polski vs oficjalne tłumaczenie angielskie** (Grzybowski i in., Findings of EMNLP 2025, [2412.00559](https://arxiv.org/abs/2412.00559), A, zweryfikowane). Dopasowany podzbiór egzaminu LEK; wersję angielską przygotowało Centrum Egzaminów Medycznych (tłumaczenie ludzkie).

| Model | Polski | Angielski | PL − EN |
|---|---|---|---|
| Qwen2.5-7B | 51,92 | 67,73 | −15,81 |
| Llama-3.1-8B | 51,25 | 64,69 | −13,44 |
| Mistral-Large-2407 | 76,75 | 82,40 | −5,65 |
| Qwen2.5-72B | 76,87 | 81,93 | −5,06 |
| Llama-3.1-70B | 80,94 | 82,60 | −1,66 |
| GPT-4o-mini | 75,88 | 75,92 | −0,04 |
| GPT-4o | 89,96 | 88,69 | +1,27 |
| Bielik-11B-v2.2 | 62,36 | 56,98 | +5,38 |

Autorzy zauważają, że różnica między językami maleje wraz z jakością modelu. Polski Bielik radzi sobie lepiej po polsku.

**mmPISA-bench** (Sapenov i Savelka, arXiv [2606.07069](https://arxiv.org/abs/2606.07069), czerwiec 2026, B, zweryfikowane). 25 zadań PISA z matematyki i czytania w 43 językach, 5 powtórzeń na komórkę. „Claude none” to Claude Haiku 4.5; „Claude high” to Claude Opus 4.5.

| Język | Claude none | Claude high | GPT-5.1 none | GPT-5.1 high |
|---|---|---|---|---|
| angielski | 90,4 | 100,0 | 76,8 | 96,8 |
| **polski** | 87,2 | 94,4 | 78,4 | 96,0 |
| czeski | 84,8 | 96,8 | 79,2 | 94,4 |
| słowacki | 88,0 | 96,0 | 74,4 | 95,2 |
| rosyjski | 85,6 | 95,2 | 84,8 | 94,4 |
| bułgarski | 85,6 | 96,8 | 84,0 | 90,4 |
| serbski | 87,2 | 99,2 | 77,6 | 96,0 |
| chorwacki | 88,8 | 96,8 | 78,4 | 96,0 |
| słoweński | 89,6 | 95,2 | 80,0 | 96,0 |
| bośniacki | 87,2 | 99,2 | 75,2 | 96,8 |
| niemiecki | 85,6 | 96,8 | 81,6 | 100,0 |
| francuski | 91,2 | 99,2 | 79,2 | 96,8 |

Wysiłek rozumowania zmienia wynik znacznie bardziej niż język. Przy 25 zadaniach różnica 1–2 zadań to szum.

**MMLU-ProX** (Xuan i in., EMNLP 2025 main, [2503.10497](https://arxiv.org/abs/2503.10497), A; zweryfikowane z tekstem PDF). Ok. 11 800 identycznych pytań na język, 5-shot z chain-of-thought. Nie ma polskiego; są czeski, rosyjski, ukraiński i serbski.

| Model | EN | CS | RU | UK |
|---|---|---|---|---|
| Qwen3-235B (thinking) | 80,7 | 80,5 | 77,0 | 78,8 |
| DeepSeek-R1 | 79,5 | 76,8 | 76,4 | 76,8 |
| GPT-4.1 | 79,8 | 77,5 | 71,2 | 76,4 |
| o4-mini | 73,7 | 73,5 | 62,0 | 73,3 |
| Qwen3-32B (thinking) | 74,9 | 72,8 | 69,1 | 73,5 |
| Gemma3-27B | 66,5 | 62,6 | 62,5 | 61,7 |
| Phi4-14B | 71,5 | 63,2 | 65,2 | 61,3 |
| Qwen2.5-7B | 57,5 | 42,3 | 46,3 | 42,9 |
| Llama3.1-8B | 45,2 | 23,1 | 28,8 | 24,1 |

Serbski dla DeepSeek-R1 ma 80,9, czyli więcej niż angielski. Dla GPT-4o praca podaje angielski poniżej kilku języków słowiańskich (EN 59,9, RU 62,0, CS 70,1). To prawdopodobnie artefakt przebiegu angielskiego, więc pomijamy go we wnioskach. Silne modele rozumujące tracą 0–4 pkt, modele 7–8B 11–22 pkt.

**EU20: przetłumaczone benchmarki** (Thellmann i in., [2410.08928](https://arxiv.org/abs/2410.08928), październik 2024, B, zweryfikowane; tłumaczenia DeepL testów ARC, GSM8K, HellaSwag, MMLU i TruthfulQA). Średnie Llama-3.1-70B-Instruct: EN 0,79, ES 0,73, FR 0,72, CS 0,71, DE 0,71, **PL 0,70**, SK 0,69, SL 0,67, BG 0,66. Największa polska luka jest na GSM8K: 0,87 vs 0,69.

**Wiedza regionalna: pytanie w języku natywnym vs to samo pytanie po angielsku** (CUS-QA, [2507.22752](https://arxiv.org/abs/2507.22752), B, zweryfikowane). Trafność oceniana przez LLM.

| Model | CZ natywnie / EN | SK natywnie / EN | UA natywnie / EN |
|---|---|---|---|
| GPT-5 | 83,1 / 80,7 | 73,3 / 70,2 | 73,2 / 72,2 |
| Gemini 2.5 Flash | 78,0 / 75,8 | 64,2 / 61,3 | 68,9 / 63,0 |
| Llama 3.3 70B | 60,0 / 63,1 | 47,7 / 48,3 | 52,2 / 54,9 |
| Llama 3.1 8B | 29,6 / 36,5 | 19,6 / 25,6 | 25,7 / 34,1 |
| Mistral 7B v0.3 | 22,9 / 30,4 | 14,4 / 22,3 | 24,6 / 27,8 |

Silne modele lepiej odpowiadają na pytania lokalne w języku natywnym. Małe radzą sobie lepiej po angielsku.

**Polska kultura w pytaniach o obrazy** (PoVisLE, NASK, [2608.07763](https://arxiv.org/abs/2608.07763), sierpień 2026, B, zweryfikowane). 465 równoległych pytań po polsku, angielsku i niemiecku; tłumaczenie maszynowe z ręczną korektą.

| Model | PL | EN | DE |
|---|---|---|---|
| Qwen3.5-397B (thinking) | 75,16 | 68,12 | 68,15 |
| Claude Sonnet 5 | 69,94 | 66,94 | 66,03 |
| GPT-5.4 | 68,35 | 70,40 | 63,53 |
| Qwen3.5-9B | 38,75 | 47,04 | 44,83 |

**Pozostałe dane słowiańskie (zweryfikowane):**
- **Bułgarski.** Gemma-2-27B (base) uzyskuje 74,47 na angielskich benchmarkach i 60,95 na bułgarskich, przetłumaczonych przez Google Translate ([2412.10893](https://arxiv.org/abs/2412.10893), B). Część tej luki to artefakty tłumaczenia.
- **Języki południowosłowiańskie.** W klasyfikacji zero-shot różnica macro-F1 (angielski minus południowosłowiański) wynosi 0,02–0,07 dla sentymentu i 0,03–0,10 dla tematu. Zbiory nie są równoległe ([2511.07989](https://arxiv.org/abs/2511.07989), warsztat LREC 2026).
- **Błędy tłumaczenia zawyżają mierzone luki.** Po poprawieniu tłumaczenia MGSM wyniki rosyjskie wzrosły prawie do poziomu angielskiego: GPT-5 z 95,2 do 99,6 (EN 99,6), Claude Sonnet 4.5 z 95,6 do 100,0 ([2511.05162](https://arxiv.org/abs/2511.05162), „Mind the Gap… or Not?”, B).

### 2.2 Czy język wpływa na rozumowanie?

- **Wymuszenie języka rozumowania obniża trafność** (XReasoning, Qi i in., Findings of EMNLP 2025, [2505.22888](https://arxiv.org/abs/2505.22888), A, zweryfikowane z PDF):
  - Metoda wymuszania to „prompt hacking”: po tokenie myślenia wstawia się prefiks w języku docelowym.
  - Skywork-OR1-32B, średnie z 11 języków, swobodnie vs z wymuszeniem: AIME 44,8 → 29,6; GPQA 53,6 → 39,8; MGSM 75,4 → 71,9.
  - Bez wymuszenia rozumowanie tego modelu jest w języku użytkownika tylko w ok. 33% przypadków AIME i GPQA.
  - Distill-R1-32B: AIME 25,5 → 17,0; GPQA 40,3 → 33,4; MGSM 70,2 → 71,7. Na łatwej matematyce (MGSM) koszt jest mały albo żaden.
  - Spośród 11 języków jedynym słowiańskim jest rosyjski.
- **Angielski to najlepszy język rozumowania** (Yong i in., [2505.05408](https://arxiv.org/abs/2505.05408), B). s1-32B na MGSM: 91,2 dla języków o dużych zasobach (w tym rosyjskiego) wobec 80,8 dla języków o małych zasobach. Wymuszenie myślenia w języku o małych zasobach obniża wynik do 75,7. Saji i in. ([2510.20647](https://arxiv.org/abs/2510.20647)) pokazują koszt rozumowania po angielsku: dla QwQ-32B błędy tłumaczenia odpowiadają za 77% błędnych odpowiedzi w językach o małych zasobach i tylko za 30% w językach o dużych zasobach.
- **Modele myślą po angielsku nawet przy polskim wejściu** (Pihulski i Kocoń, [2510.02351](https://arxiv.org/abs/2510.02351), B, zweryfikowane). DeepSeek-R1 rozumował po angielsku przy 86% promptów i po rosyjsku przy 14%; ani razu po polsku. Qwen3-8B: 62,8% EN, 33,0% RU, 4,2% PL.
- **Wąskim gardłem jest zrozumienie wejścia** (Kang i in., Findings of ACL 2026, [2510.27269](https://arxiv.org/abs/2510.27269), A/B). Interwencja nakierowana na rozumienie podnosi średnią na PolyMath-Low z 81,1 do 91,9. Selektywne tłumaczenie ok. 19% wejść daje 88,0.
- **Małe modele tracą więcej** (MCLM, ACL 2025, [2502.17407](https://arxiv.org/abs/2502.17407), zweryfikowane z PDF). Qwen2.5-Math-1.5B na MT-MATH100: polski 54,55 vs angielski 67,68, rosyjski 59,60, czeski 44,44, ukraiński 38,38, bułgarski 39,39 (ok. 99 zadań na język, tylko orientacyjnie).
- **PluraMath** ([2607.05992](https://arxiv.org/abs/2607.05992), lipiec 2026, B) dodaje do PolyMath polski, ukraiński, czeski, serbski i słowacki i testuje 27 modeli rozumujących. To najbardziej obiecujące nowe źródło dla polskiej matematyki, ale wartości per język nie udało się zweryfikować (układ tabeli zgubił się przy ekstrakcji). Przed cytowaniem trzeba je sprawdzić.
- **Najlepsze modele rozumujące na trudnej matematyce** (PolyMath, NeurIPS 2025 Datasets & Benchmarks, poziom najwyższy). Rosyjski jest blisko angielskiego albo wyżej: Qwen3-235B-Thinking EN 40,0 vs RU 38,4; Gemini 2.5 Pro 39,2 vs 38,4; DeepSeek-R1 35,2 vs 37,6.
- **Język promptu prawie nie ma znaczenia dla kodu** (MERA Code, [2507.12284](https://arxiv.org/abs/2507.12284), B, zweryfikowane). Mediany różnic (rosyjski minus angielski) w 7 zadaniach kodowych mieszczą się w zakresie od −0,02 do +0,06.
- **Luka w transferze międzyjęzykowym maleje** („Are Multilingual Models Actually Improving?”, Findings of EMNLP 2026, [2606.21954](https://arxiv.org/abs/2606.21954), zweryfikowane). Mediana transferu skorygowanego o trudność (HAT) dla modeli wydanych po styczniu 2025 wobec wcześniejszych: 0,75 → 0,93 na MMLU-ProX-Lite i 0,90 → 0,97 na MGSMv2. Sama skala modelu nie zmniejsza luki konsekwentnie (MuBench, Findings of ACL 2026). Żaden z tych benchmarków nie obejmuje polskiego.

### 2.3 Wyszukiwanie, RAG i długi kontekst

- **BM25 na BEIR vs BEIR-PL** (LREC-COLING 2024, [2305.19840](https://arxiv.org/abs/2305.19840), A, zweryfikowane; tłumaczenie Google Translate). nDCG@10 jest niższe po polsku na wszystkich 11 zbiorach z obiema wartościami: NQ 32,6 → 20,1, HotpotQA 60,2 → 49,2, MS MARCO 47,7 → 41,9, SciFact 69,1 → 62,5. Autorzy przypisują to bogatej fleksji i morfologii.
- **Polskie leaderboardy embeddingów.** PL-MTEB ([2405.10138](https://arxiv.org/abs/2405.10138) v2, Findings ACL 2026, zweryfikowane): najlepszy polski model retrieval ma nDCG@10 61,59 (stella-pl-retrieval-8k), Qwen3-Embedding-8B 59,21. PIRB ([2402.13350](https://arxiv.org/abs/2402.13350)), 41 polskich zadań: multilingual-e5-large 57,29, BM25 41,85, wyszukiwanie hybrydowe ok. 59,2. Żaden z tych benchmarków nie ma porównania z angielskim.
- **RAG z pytaniami natywnymi vs angielskimi** (CUS-QA RAG, zbiór dev, 3 najlepsze fragmenty z FineWiki). Llama 3.3 70B: CZ 65,9 vs 59,8, SK 76,9 vs 73,4, UA 58,7 vs 51,2. Llama 3.1 8B: SK 69,8 vs 47,0, UA 44,2 vs 33,7. Wyszukiwanie działa najlepiej, gdy pytanie jest w języku dokumentów.
- **Ten sam fragment, polski vs angielski** (Qi, Fernández, Bisazza, warsztat MRL 2025, nagroda za najlepszy artykuł, [2504.00597](https://arxiv.org/abs/2504.00597), A/B, zweryfikowane). Pytania z MKQA; model dostaje jeden poprawny fragment, a nie wynik wyszukiwarki. Miara: dokładne dopasowanie podciągu, które może karać polską fleksję. Zbiory pytań różnią się liczebnością: z fragmentem w języku pytania jest 3594 pytań polskich i 5331 angielskich.

  | Model | Bez kontekstu (PL / EN) | Fragment w języku pytania | Fragment w innym języku |
  |---|---|---|---|
  | Aya-Expanse-8B | 50,1 / 58,0 | 79,2 / 87,5 | 68,0 / 69,4 |
  | Llama-3.2-3B | 35,3 / 61,8 | 60,6 / 82,4 | 51,5 / 63,9 |
  | Gemma-2-9B | 55,0 / 65,0 | 67,8 / 79,8 | 62,0 / 75,7 |
  | Qwen2.5-7B | 36,9 / 55,6 | 68,9 / 86,0 | 59,1 / 81,7 |

  Polski jest niżej we wszystkich warunkach. Niemiecki i francuski zwykle leżą między polskim a angielskim. Rosyjski jest poniżej polskiego bez kontekstu i z fragmentem w innym języku, ale z fragmentem w języku pytania nieco powyżej polskiego dla trzech z czterech modeli.
- **Wielojęzyczny RAG preferuje język zapytania.** W Faux Polyglot (NAACL 2025, [2407.05502](https://arxiv.org/abs/2407.05502)) 68% dokumentów w top-10 jest w języku pytania. Park i Lee (Findings ACL 2025, [2502.11175](https://arxiv.org/abs/2502.11175)) pokazują duże spadki, gdy język zapytania różni się od języka dokumentów. W XRAG (Findings EMNLP 2025) GPT-4o z dokumentami po angielsku osiąga 62,4 dla pytań po angielsku i 54,7–56,8 dla pytań w innych językach. Żadna z tych prac nie obejmuje polskiego.
- **Długi kontekst.** OneRuler to jedyne źródło dla języków słowiańskich. MLRBench (EACL 2026) pokazuje, że w ustawieniach wielojęzycznych efektywny kontekst to mniej niż 30% deklarowanej długości, ale nie obejmuje żadnego języka słowiańskiego.
- **Polski RAG w praktyce** (Bartanowicz i Jassem, LREC 2026, A). Bielik-11B-v2.3 wypadł lepiej niż PLLuM-12B jako generator w rzeczywistym polskim systemie RAG. Liczb z tabel nie udało się ponownie zweryfikować z PDF.

### 2.4 Tokenizacja: „podatek od polskiego”

- **Tokenizer Tax** ([2605.24718](https://arxiv.org/abs/2605.24718), maj 2026, preprint jednego autora, B, zweryfikowane). Średnia liczba tokenów na słowo na równoległym tekście SIB-200, z 6 tokenizerów: EN 1,23, ES 1,46, FR 1,52, IT 1,67, DE 1,76, **PL 2,25 (1,83× angielski)**, CS 2,28, SL 2,28, HR 2,31, BG 2,33, SK 2,45, UK 2,66.
- **Raport tokenizera Bielika v3** ([2604.10799](https://arxiv.org/abs/2604.10799), kwiecień 2026, B, zweryfikowane). Tokeny na słowo na preambule Konstytucji RP i jej oficjalnym tłumaczeniu (PL / EN): Llama 3.2 2,81 / 1,17; Qwen3 2,69 / 1,17; Mistral Small 3.1 2,36 / 1,19; Gemma3 2,20 / 1,20; EuroLLM 1,88 / 1,27; polski tokenizer APT4 1,62 / 1,98.
- **Skutek w praktyce.** Ten sam tekst po polsku zużywa ok. 1,8–2,4× więcej tokenów w popularnych tokenizerach. To wyższy koszt, większe opóźnienia i mniej treści w oknie kontekstu. To też jedna z hipotez, które autorzy OneRuler wskazują dla różnic między językami w długim kontekście.

### 2.5 Agenci i wywoływanie narzędzi

- **MASSIVE-Agents** (Kulkarni i in., Amazon, Findings of EMNLP 2025, A; zweryfikowane z tekstu PDF i zakotwiczone na tabeli 2):
  - Polecenia z MASSIVE, lokalizowane przez ludzi w 52 językach, przeformatowano do BFCL.
  - Trafność AST zero-shot na podzbiorze 10k (190 poleceń na język), polski / angielski: Nova Premier 29,47 / 57,37; Claude 3.5 Sonnet v2 18,95 / 53,68; Llama 3.1 405B 15,26 / 46,32; Nova Pro 10,53 / 47,89; Nova Lite 12,11 / 43,16; Llama 3.1 70B 13,68 / 34,21.
  - Dla Nova Lite i Nova Pro w zero-shot polski jest najsłabszy z 52 języków, ale nie przy prompcie z jednym przykładem.
  - To jedyne bezpośrednie polskie dane agentowe znalezione w 5 iteracjach wyszukiwania; dotyczą modeli z 2024 roku.
- **GAIA-v2-LILT** ([2604.24929](https://arxiv.org/abs/2604.24929), kwiecień 2026, B). Pass@1 dla EN / DE po tłumaczeniu maszynowym / DE po korekcie ludzkiej: GPT-5.4 66,7 / 47,3 / 63,6; Gemini 3.1 Pro 73,9 / 49,7 / 66,7; Claude Opus 4.6 79,4 / 49,7 / 66,7. Większość spadku powoduje maszynowe tłumaczenie zadań. Niemiecki po korekcie wciąż ustępuje angielskiemu o 3–13 pkt.
- **Rosyjski function calling: znak luki zależy od ustawień:**
  - RFCB (Proc. ISP RAS 2026), Qwen3-8B po GRPO: w trybie multi-turn RU 35,41 vs EN 28,88, ale w single-turn RU 68,25 vs EN 91,32.
  - arXiv [2609.01572](https://arxiv.org/abs/2609.01572), Qwen3-32B na podzbiorze multi-turn BFCLv3: RU 37,12 vs EN 42,88.
- **Inne benchmarki.** MAPS (Fujitsu, Cohere) raportuje do 16% słabsze wyniki agentów poza angielskim. X-WebAgentBench obejmuje bułgarski i rosyjski, ale nie ma porównywalnej angielskiej linii bazowej. Ticket-Bench (6 języków zachodnioeuropejskich) pokazuje, że angielski nie zawsze jest najlepszy.

### 2.6 Dostawcy modeli frontierowych i leaderboardy

- OpenAI (system card GPT-5, simple-evals MMMLU), Google (raport Gemini 2.5, Global-MMLU-Lite) i Qwen3 **nie publikują wyników dla polskiego**. MMMLU ma 14 języków i żadnego słowiańskiego.
- Benchmarki obejmujące polski:
  - Global-MMLU (ACL 2025): wartości per język tylko na wykresach.
  - INCLUDE: GPT-4o 5-shot ma 78,8 po polsku; brak wiersza angielskiego.
  - Global PIQA: polski 100,0 dla najlepszego modelu wobec 97,0 dla angielskiego. To nasycenie, a najlepszy model jest inny dla każdego języka.
  - Arena, polski leaderboard tekstowy: preferencje ludzi, bez angielskiej linii bazowej.

---

## 3. Odpowiedź: czy język wpływa na rozumowanie agenta LLM?

**Tak, ale słabiej, niż sugerują nagłówki, i w przewidywalny sposób.**

| Czynnik | Wpływ na polski / języki słowiańskie wobec angielskiego | Dowody |
|---|---|---|
| Siła modelu | Małe i otwarte modele tracą 5–16 pkt; modele frontierowe mieszczą się w ok. 0–6 pkt, czasem prowadzą | Grzybowski, MMLU-ProX, CUS-QA, mmPISA |
| Lokalność treści | Wiedza lokalna i kulturowa wypada lepiej w języku natywnym, jeśli model jest mocny | CUS-QA, PoVisLE |
| Język toku rozumowania | Modele myślą po angielsku; wymuszenie języka natywnego kosztuje 7–15 pkt na trudnych zadaniach | XReasoning, Pihulski |
| Jakość tłumaczenia testu | Benchmarki tłumaczone maszynowo zawyżają lukę | Mind the Gap, GAIA-LILT, BgGPT |
| Wyszukiwanie leksykalne | BM25 traci po polsku 6–12 pkt (fleksja) | BEIR-PL |
| Zgodność języka zapytania i dokumentów | W RAG najlepiej działa ten sam język | CUS-QA RAG, Park i Lee, Faux Polyglot |
| Tokenizacja | 1,8–2,4× więcej tokenów na słowo, krótszy efektywny kontekst, wyższy koszt | Tokenizer Tax, Bielik v3 |
| Długi kontekst | Polski na czele OneRuler NIAH, ale wynik jest wąski, bez testu istotności i zaburzony różnymi książkami | OneRuler |
| Agenci | Function calling zero-shot: polski 15–37 pkt za angielskim (modele z 2024 r.). Tłumaczone zadania wieloetapowe tracą 3–30 pkt w innych językach europejskich | MASSIVE-Agents, GAIA-LILT, RFCB, MAPS |

## 4. Zalecenia praktyczne (polski RAG i agenci)

1. **Modele frontierowe:** pisz prompty w języku użytkowników i danych. Nie ma dowodów, że tłumaczenie na angielski im pomaga, a przy treściach lokalnych może zaszkodzić.
2. **Małe i lokalne modele (do ~30B):** przetestuj angielski prompt systemowy albo potok „przetłumacz, potem odpowiedz” na własnym polskim zbiorze testowym. Luki rzędu 10–15 pkt są częste.
3. **Nie wymuszaj języka rozumowania.** Pozwól modelowi myśleć swobodnie i wymagaj tylko odpowiedzi końcowej po polsku.
4. **RAG:** utrzymuj język zapytania zgodny z językiem korpusu albo tłumacz zapytanie. Stosuj wyszukiwanie hybrydowe: BM25 z polską lematyzacją plus gęste embeddingi z czołówki PL-MTEB. Unikaj samego BM25.
5. **Zakładaj ok. 2× więcej tokenów** dla polskiego tekstu przy planowaniu kosztów, opóźnień i okna kontekstu. Sprawdź tokenizer wybranego modelu.
6. **Zbuduj polski zbiór testowy z prawdziwych danych pisanych przez ludzi.** Publiczne „polskie” benchmarki często są tłumaczone maszynowo, a błędy tłumaczenia zniekształcają porównanie.
7. **Agenci:** polskie polecenia mogą mocno obniżać trafność wywołań funkcji, zwłaszcza bez przykładów w prompcie. Dodaj przykłady (few-shot) i zmierz trafność wywołań narzędzi na polskich poleceniach przed wdrożeniem.

## 5. Metoda, weryfikacja i ograniczenia

**Przebieg**
- **Runda 1:** 6 równoległych agentów wyszukujących. Zakresy:
  - źródło artykułu;
  - polskie benchmarki;
  - rozumowanie;
  - wyszukiwanie, RAG i długi kontekst;
  - inne języki słowiańskie, z wyszukiwaniem po czesku, słowacku, ukraińsku, rosyjsku, słoweńsku, chorwacku, serbsku i bułgarsku;
  - karty modeli frontierowych.
- **Runda 2:** 5 niezależnych weryfikatorów ponownie odczytało tabele w źródłach pierwotnych i rozstrzygnięto sprzeczności. Przykład: wychwycono błędnie opisany wiersz mmPISA; „Opus 87,2” to w rzeczywistości Haiku 4.5 bez rozumowania.
- **Runda 3:** 2 kolejnych weryfikatorów i 5. iteracja wyszukiwania dla pozostałych polskich luk (RAG, długi kontekst, agenci). Piąta iteracja znalazła porównanie RAG na MKQA. Weryfikator potwierdził je i odczytał z tekstu PDF polskie wartości MASSIVE-Agents.

**Wyniki weryfikacji**
- Sprawdzono ok. 45 twierdzeń. Większość się potwierdziła.
- Poprawiono: jednostki („%” zamiast „pkt”), przypisania tabel, listę tokenizerów (GPT-4o nie ma w tabeli 1 Bielika) oraz średnie rodzin językowych (słowiańska 0,686 po przeliczeniu wobec 0,680 w tekście).

**Ograniczenia**
- Subagenci czytali prace przez narzędzie streszczające HTML albo dekoder surowego tekstu PDF. Tabel dostępnych tylko w PDF (RAG z LREC 2026, mapy cieplne OneRuler) nie udało się w pełni zweryfikować. Wartości per język MASSIVE-Agents opierają się na jednym mapowaniu zdekodowanego tekstu, zakotwiczonym na tabeli 2.
- Najnowsze preprinty z 2026 roku nie przeszły recenzji.
- Kilka wyników dla modeli frontierowych dotyczy tylko 2–3 modeli albo małych zbiorów zadań.

## 6. Lista źródeł

| ID | Źródło | Rok, miejsce | Poziom | Polski? | Te same pozycje co EN |
|---|---|---|---|---|---|
| OneRuler | Kim i in., arXiv 2503.01996 | 2025, COLM | A/B | tak | tak |
| MedPL | Grzybowski i in., 2412.00559 | 2025, Findings EMNLP | A | tak | tak |
| mmPISA | Sapenov i Savelka, 2606.07069 | 2026, arXiv | B | tak | tak (25 zadań) |
| PoVisLE | Kołos i in. (NASK), 2608.07763 | 2026, arXiv | B | tak | tak (MT + korekta) |
| EU20 | Thellmann i in., 2410.08928 | 2024, arXiv | B | tak | tak (DeepL) |
| BEIR-PL | Wojtasik i in., 2305.19840 | 2024, LREC-COLING | A | tak | tak (BM25) |
| Tokenizer Tax | Ovcharov, 2605.24718 | 2026, arXiv | B | tak | tak |
| Tokenizer Bielik v3 | Ociepa i in., 2604.10799 | 2026, arXiv | B | tak | tak |
| MMLU-ProX | Xuan i in., 2503.10497 | 2025, EMNLP | A | nie (CS, RU, UK, SR) | tak |
| CUS-QA | 2507.22752 | 2025, arXiv | B | nie (CS, SK, UK) | tak |
| XReasoning | Qi i in., 2505.22888 | 2025, Findings EMNLP | A | nie (RU) | tak |
| MCLM | Son i in., 2502.17407 | 2025, ACL | A | tak | tak (mała próba) |
| PolyMath | 2504.18428 | 2025, NeurIPS D&B | A | nie (RU) | tak |
| PluraMath | 2607.05992 | 2026, arXiv | B | tak | wartości niezweryfikowane |
| Yong i in. | 2505.05408 | 2025, arXiv | B | nie (RU) | tak |
| Kang i in. | 2510.27269 | 2026, Findings ACL | A | nie | tak |
| Saji i in. | 2510.20647 | 2025, arXiv | B | nie | — |
| Mind the Gap | Peter i in., 2511.05162 | 2025/26, arXiv | B | nie (RU) | tak |
| Język rozumowania | Pihulski i Kocoń, 2510.02351 | 2025, arXiv | B | tak | tylko język toku |
| Transfer HAT | Bajpai i in., 2606.21954 | 2026, Findings EMNLP | A | nie | — |
| MuBench | Han i in., 2506.19468 | 2026, Findings ACL | A | tak | tylko agregaty |
| PL-MTEB | Poświata i in., 2405.10138 | 2026, Findings ACL | A | tak | nie |
| PIRB | Dadas i in., 2402.13350 | 2024, LREC-COLING | A | tak | nie |
| PLCC | Dadas i in., 2503.00995 | 2025, arXiv | B | tak | nie |
| LLMzSzŁ | Jassem i in., 2501.02266 | 2025, arXiv | B | tak | nie |
| Polski RAG | Bartanowicz i Jassem, 2026.lrec-1.211 | 2026, LREC | A | tak | nie |
| Faux Polyglot | Sharma i in., 2407.05502 | 2025, NAACL | A | nie | — |
| Preferencje językowe RAG | Park i Lee, 2502.11175 | 2025, Findings ACL | A | nie | — |
| XRAG | 2505.10089 | 2025, Findings EMNLP | A | nie | — |
| MLRBench | Hengle i in., 2504.12845 | 2026, EACL | A | nie | — |
| BgGPT | 2412.10893 | 2024, arXiv | B | nie (BG) | tak (MT) |
| Klasyfikacja południowosłowiańska | Kuzman Pungeršek i in., 2511.07989 | 2026, warsztat LREC | A/B | nie | nie (zbiory nierównoległe) |
| MERA Code | 2507.12284 | 2025, arXiv | B | nie (RU) | język promptu |
| GAIA-v2-LILT | Kim i in., 2604.24929 | 2026, arXiv | B | nie | tak |
| RFCB | Ionov i Malykh, Proc. ISP RAS 38(3) | 2026, czasopismo | A | nie (RU) | tak |
| Korporacyjny LLM | Tsymboi i in., 2609.01572 | 2026, arXiv | B | nie (RU) | tak |
| MASSIVE-Agents | Kulkarni i in., 2025.findings-emnlp.1099 | 2025, Findings EMNLP | A | tak | tak (zero-shot) |
| MKQA mRAG | Qi, Fernández, Bisazza, 2504.00597 | 2025, warsztat MRL | A/B | tak | tak (różne podzbiory) |
| MAPS | Hofman i in., 2505.15935 | 2025, arXiv | B/C | nie (RU) | tylko wykresy |
| Global PIQA | 2510.24081 | 2025, arXiv | B | tak | tylko najlepszy model |
| INCLUDE | 2411.19799 | 2024/25, arXiv | B | tak | brak wiersza EN |
| System card GPT-5 | OpenAI, 2601.03267 | 2025/26 | B | nie | — |
| Nauka w Polsce / PAP | wywiad z autorką, 27.11.2025 | prasa | D | — | tylko stanowisko autorów |
