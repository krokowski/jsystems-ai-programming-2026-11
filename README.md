# UPDATES !!!

## Po trzecim dniu (25.11)

**Kod i repozytorium**
- `main` zostaje punktem startowym kursu; aplikację rozwijasz w swojej gałęzi `app-implementation`.
- [PR #6](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/6) w gałęzi `design-system`: design system DevPowers zrobiony skillem `create-design-system`.

**Podsumowanie i czat**
- [Podsumowanie dnia 3](course-materials/zoom-summary-chat-history/day-3-summary.md): recenzja PR przez Codex, design system, skróty Claude Code (`/btw`, `/fork`, `/rewind`, `Ctrl+G` z edytorem Micro), Spec-Driven Development, PRD, ADR i plan z `/goal`, AG-UI, OpenRouter i modele decyzyjne, prompt caching, Context7, OpenCode.
- [Historia czatu z dnia 3](course-materials/zoom-summary-chat-history/day-3-chat-history.md) ze wszystkimi linkami, poleceniami i promptami z zajęć.

**Poprawiony prompt planu**
- [Plan z subagentami i mapą zależności](course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md) planuje teraz całą aplikację z PRD i ADR, tak aby silny model mógł ją zbudować samodzielnie z `/goal`; nadal możesz realizować ją etapami. Dodaje przegląd spójności dokumentów, testy E2E i manualne bez mocków, briefy agentów w `docs/.agent-briefs/` usuwane po realizacji planu oraz delegowanie przez OpenCode w trybie headless.
- Prompt ma dwie wersje: [Claude Code](course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md) (Opus 5.5 jako orkiestrator, subagenci Sonnet 5.5 i Haiku 5.5) oraz [Codex](course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map-CODEX.md) (GPT-6.2 Sol jako orkiestrator, subagenci GPT-6 Luna i GPT-6.1 Terra). Obie delegują też tanie zadania do OpenCode. Pod promptem w wersji Claude Code są kroki poprawek planu i prompt do stworzenia własnego skilla do planowania.

**Na rano w dniu 4**
- Dokończ plan swojej aplikacji i sprawdź spójność planu, PRD, ADR i `AGENTS.md`.
- Dodaj do `AGENTS.md` regułę: dokumentację bibliotek i narzędzi agent sprawdza najpierw w Context7 (`ctx7`) i w pomocy CLI (np. `gh --help`), a wyszukiwarki używa tylko awaryjnie, bo zużywa znacznie więcej tokenów. Research domyślnie deleguje do subagentów lub agentów CLI.

## Po drugim dniu (24.11)

**Kod i repozytorium**
- `main` zostaje punktem startowym kursu: materiały, historie czatu i poprawki.
- Zrób fork (`gh repo fork --remote`) i rozwijaj aplikację w swojej gałęzi `app-implementation`, nie w `main`. Nowe materiały pobierzesz poleceniem `git pull upstream main`, a potem `git merge main` w gałęzi aplikacji.
- [PR #5](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/5) w gałęzi `research/polish-language-in-llms`: raport "polski vs angielski w LLM" (Markdown i interaktywny HTML, PL i EN), skill `evidence-research` i plik `skills-lock.json`.

**Podsumowanie i czat**
- [Podsumowanie dnia 2](course-materials/zoom-summary-chat-history/day-2-summary.md): research z subagentami, GitHub CLI i tokeny PAT, fork i tożsamość Git, Skills (tworzenie, instalacja, bezpieczeństwo), `/context`, statusline, PRD i ADR.
- [Historia czatu z dnia 2](course-materials/zoom-summary-chat-history/day-2-chat-history.md) ze wszystkimi linkami, poleceniami i promptami z zajęć.
- [Skrypt statusline](course-materials/agent-configs/claude/statusline.sh) do skopiowania do `~/.claude/`.

**Odpowiedzi na pytania grupy i nowe materiały**
- [Pytania i odpowiedzi](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/pytania.html): krótkie odpowiedzi na Wasze pytania (Azure DevOps, artefakty Claude, cache przy zmianie modelu) i inne częste pytania.
- [Azure DevOps z agentami](course-materials/cicd-headless/azure-devops/README.md): `az boards` i `az repos` zamiast `gh`/`glab`, PAT i tokeny Entra, serwer MCP Azure DevOps oraz pipeline z recenzją PR przez Claude Code.
- [Cache przy zmianie modelu i effort](course-materials/Research/prompt-caching-model-switch-and-effort-2026-11-24.md): każdy model ma własny cache, co zmiana effort robi z cache i jak sprawdzić trafienia.
- [Artefakty Claude: przechowywanie, udostępnianie i własność](course-materials/Research/claude-artifacts-retention-ownership-2026-11-24.md). Pobierz ważne artefakty przed usunięciem kont kursowych.
- [Indeks kursu](course-materials/Course%20INDEX%20-%20AI%20in%20Programming.md): badanie METR o przyspieszeniu prac nad AI w Anthropic, wykres OpenAI "Perplexity and Intelligence", dowód hipotezy Riemanna z Claude, rosnąca luka modeli open-weight i MaxxBench.
- [Menedżery agentów](course-materials/Research/agent-managers-and-remote-agents.md): Herdr z aplikacją desktopową i mobilną, GitKraken Kepler, Delta od twórców Zed.

## Po pierwszym dniu (23.11)

**Kod i repozytorium**
- `main` zostaje punktem startowym kursu (materiały, historie czatu, poprawki).
- Swoją aplikację rozwijasz na VM w gałęzi `feat/moja-aplikacja` ([instrukcja startu, slajd 9](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/Prezentacja_01_Start_kursu.html#9)). Nowe materiały pobierzesz z `main` poleceniem `git pull origin main`.

**Podsumowanie i czat**
- [Podsumowanie dnia 1](course-materials/zoom-summary-chat-history/day-1-summary.md): modele i rankingi, Vibe Coding, pierwsze kroki z Claude Code, zadania zaplanowane, tokeny.
- [Historia czatu z dnia 1](course-materials/zoom-summary-chat-history/day-1-chat-history.md) ze wszystkimi linkami z zajęć.
- [Indeks kursu](course-materials/Course%20INDEX%20-%20AI%20in%20Programming.md): pojęcia, narzędzia, dokumentacja, badania i osoby warte śledzenia.

**Na rano w dniu 2**
- Sprawdź, czy Twoje zadanie zaplanowane uruchomiło się około 6:00.
- Przygotuj wynik swojej aplikacji lub gry z Arena.ai do pokazania.

---

# AI dla programistów - od pomysłu do MVP (JSystems)

**Materiały szkoleniowe: [devpowers.com/szkolenia/jsystems/ai-programming-2026-11](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/)**

- [Zakres i wszystkie materiały](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/index.html#prezentacje)
- [Slajdy](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/index.html#prezentacje)
- [Biblioteka promptów](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/prompty.html) · [Ćwiczenia](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/cwiczenia.html) · [Checklisty](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/checklisty.html) · [Słownik AI](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/slownik-ai.html)
- [Wyniki ankiety przed szkoleniem](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/raport-przed.html) · [Odpowiedzi na pytania z kursu](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/pytania.html) (uzupełniamy po każdym dniu)


Repozytorium uczestnika szkolenia JSystems (23-27.11.2026, online, 09:00-16:00, Europe/Warsaw). Przerwy w godzinach 11:00-11:15 i 13:00-13:30; dodatkowa przerwa około 5 minut w okolicach 14:30 lub 15:00 tylko w razie potrzeby. W czasie szkolenia (5 dni) przechodzimy pełny cykl wytwarzania oprogramowania z agentami AI: od pomysłu i wymagań (PRD), przez decyzje architektoniczne (ADR), plan, implementację i testy, po code review, bezpieczeństwo i CI/CD.

Głównym agentem warsztatu jest **Claude Code**, a te same koncepcje porównujemy także w **OpenAI Codex CLI** i **GitHub Copilot**. Krótko porównujemy również Antigravity z Gemini 4 Neon. Narzędzia do porównań nie wymagają osobnej instalacji przed kursem. Możesz pracować w swoim stosie (np. Java, JavaScript / TypeScript, C# / .NET, Python); przykład prowadzącego powstaje w TypeScript.

Głównym projektem grupy jest aplikacja do obsługi zwrotów i reklamacji elektroniki, rozwijana według PRD uzgodnionego podczas zajęć. Możesz też pracować nad własnym pomysłem, stosując ten sam proces. Po PRD omów architekturę i biblioteki, zapisz decyzje w ADR, ułóż plan i zależności zadań, a potem implementuj, testuj i przeglądaj zmiany przed utworzeniem PR. Przykładowy prompt PRD w `course-materials/` nie zastępuje dokumentu poprawionego z grupą.

## Start na maszynie szkoleniowej

Połącz się z przygotowaną maszyną szkoleniową i otwórz terminal w katalogu, w którym chcesz trzymać projekt. Wykonuj kolejno po jednym poleceniu:

```text
git clone https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11.git
```

```text
cd jsystems-ai-programming-2026-11
```

```text
git switch -c feat/moja-aplikacja
```

```text
claude
```

Claude Code uruchamiasz w katalogu głównym repozytorium. Przejrzyj komunikat zaufania do projektu i zaakceptuj przygotowane repozytorium. Uprawnienia i hooki projektu są w `.claude/settings.json`, a instrukcje w `CLAUDE.md` i `AGENTS.md`. W panelu `/mcp` przejrzyj konfigurację serwerów i zatwierdź tylko te, których używasz w ćwiczeniu. Na początku `app/` zawiera wyłącznie README; wymagania i aplikację tworzymy podczas zajęć.

## Opcjonalnie: start na własnym Windows

Utwórz [własny fork na GitHubie](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/fork). W swoim forku kliknij **Code**, wybierz **HTTPS** i skopiuj adres. Jeśli kurs nie korzysta z forków, użyj adresu repozytorium kursu. Otwórz PowerShell w katalogu, w którym chcesz trzymać projekt, i wykonuj kolejno po jednym poleceniu:

```powershell
$forkUrl = Read-Host "Wklej adres HTTPS swojego forka"
```

```powershell
git clone $forkUrl jsystems-ai-programming-2026-11
```

```powershell
Set-Location jsystems-ai-programming-2026-11
```

```powershell
git switch -c feat/moja-aplikacja
```

```powershell
claude
```

Każde polecenie jest w osobnym bloku, bo Windows PowerShell 5.1 nie obsługuje `&&`, a długie polecenia łatwo uszkodzić przy wklejaniu. Claude Code uruchamiasz w katalogu głównym repozytorium. Przejrzyj komunikat zaufania do projektu i zaakceptuj przygotowane repozytorium.

Podczas opcjonalnego porównania z Codex wspólne ustawienia są w `.codex/config.toml`; domyślny profil `course-tools` pozwala edytować projekt i korzystać z sieci, w tym instalować zależności. Zarządzana polityka maszyny może dodatkowo ograniczać dostęp. Zanim dodasz prawdziwy klucz API, przeczytaj sekcję [Granice](#granice).

## Biblioteka dodatkowa

`course-materials/` zawiera szeroką bibliotekę pełnych promptów, danych syntetycznych, checklist, przykładów konfiguracji i materiałów o innych agentach. To zasób do późniejszego czytania, nie lista narzędzi wymaganych na warsztacie. [Pełne prompty historyczne](course-materials/Prompt%20examples/) zachowano bez skracania; starsze twierdzenia o produktach, licencjach i komendach wymagają ponownego sprawdzenia. Podczas pracy z wybraną aplikacją agent nie powinien sam przeszukiwać `course-materials/`: zawarte tam PRD, ADR i instrukcje są przykładami, a nie wymaganiami tego projektu. Otwórz konkretny materiał dopiero wtedy, gdy go o to poprosisz.

W bibliotece znajdują się również **archiwalne materiały z wcześniejszego kursu o Claude Code**: [notatki](course-materials/Course%20INDEX%20-%20AI%20in%20Programming.md), [quiz](course-materials/quizzes/day-1-anonymous-ai-basics-quiz.md), [przykłady konfiguracji](course-materials/agent-configs/claude/) i [słownik PDF](course-materials/AI%20dla%20Programist%C3%B3w%20-%20S%C5%82ownik%20przed%20szkoleniem.pdf). Zachowano je jako źródła do ponownego wykorzystania, **nie jako aktualną konfigurację tego warsztatu**. Przykłady ustawień i skrypty należy dostosować i sprawdzić przed użyciem.

Wybierz materiał do zadania:

- **Prompty i planowanie:** [PRD](course-materials/Prompt%20examples/PRD-electronics-returns-complains-app.md), [ADR](course-materials/Prompt%20examples/ADR-generation-typescript-vercel-ai-sdk.md), [plan implementacji](course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md), [propozycja skilla planowania](https://github.com/EdukeyTeam/agent-toolbox/pull/28) (otwarty PR).
- **Konfiguracje agentów:** [ustawienia, uprawnienia, profile i skróty Bash/PowerShell](course-materials/agent-configs/).
- **Codex na Windows:** [konfiguracja i test działania](course-materials/agent-configs/codex/WINDOWS-QUICKSTART-PL.md), [regresje sandboxa i formularzy pytań](course-materials/Research/codex-sandbox-facts-and-limitations-2026-11-06.md). Po zmianie konfiguracji zrestartuj daemon i zacznij nową sesję, zamiast wznawiać poprzednią.
- **Hooki i zgody:** [ochrona plików i przykłady hooków](course-materials/hooks-example/), [Context7](course-materials/hooks-example/context7/), [permissions a hooki](course-materials/hooks-example/context7/permissions-vs-hooks.md).
- **CI/CD i code review:** [przegląd przykładów](course-materials/cicd-headless/), [agent review dla różnych CI](course-materials/cicd-headless/agent-review/), [PR-Agent i Qodo](course-materials/cicd-headless/PR-Agent-Qodo/), [Codex i Bitbucket](course-materials/cicd-headless/codex-bitbucket/).
- **Legacy:** [oryginalny kod jFTP (Java)](https://github.com/sai-pullabhotla/jftp) w osobnym klonie poza tym repozytorium, [prezentacja Legacy](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/Prezentacja_07_Legacy.html) i skill [legacy-codebase-workflows](https://github.com/EdukeyTeam/agent-toolbox/tree/main/skills/legacy-codebase-workflows).
- **Ćwiczenia i dalsza lektura:** [dane syntetyczne](course-materials/exercise-data/), [workflow agentów i oszczędzanie tokenów](course-materials/Research/agent-workflows-and-token-budget-2026-10-24.md).

Przykłady są opcjonalne: skopiowanie repozytorium nie instaluje hooków ani profili. Przed uruchomieniem sprawdź instrukcję danego materiału, wersję narzędzia i politykę organizacji.

## Granice

Używaj wyłącznie danych syntetycznych. W Claude Code reguły `deny` w [`.claude/settings.json`](.claude/settings.json) blokują m.in. odczyt plików `.env` i katalogów `secrets/`, `sudo`, `curl`, usuwanie plików oraz `git push` z jawnie wpisaną gałęzią `main`. To dopasowanie wzorców poleceń, a nie pełna ochrona: samo `git push` na gałęzi śledzącej `main` nie zostanie zablokowane, dlatego aplikację rozwijaj na osobnej gałęzi. Polecenia wymagające `sudo` (np. instalację pakietów) uruchamiaj we własnym terminalu. Serwery MCP projektu są w [`.mcp.json`](.mcp.json). Context7 odpowiada też bez klucza, ale z niskim limitem zapytań. Klucz (zaczyna się od `ctx7sk`) wygenerujesz poleceniem `npx ctx7 setup --claude` albo w [panelu Context7](https://context7.com/dashboard). Zapisz go w zmiennej środowiskowej, np. `export CONTEXT7_API_KEY=...` w `~/.bashrc`, a nie w `.mcp.json`: plik odczyta go jako `${CONTEXT7_API_KEY:-}` i bez zmiennej połączy się bez klucza.

Przy porównaniu z Codex: `course-tools` nie blokuje odczytu .env/secrets. Przed dodaniem prawdziwego klucza API przejdź na profil ścisły i sprawdź blokadę na fałszywej wartości w dokładnie docelowym pliku według [instrukcji Windows](course-materials/agent-configs/codex/WINDOWS-QUICKSTART-PL.md#zanim-dodasz-prawdziwy-klucz-api). Serwer z prawdziwym kluczem uruchamiaj z własnego terminala. Do tego czasu używaj modelu testowego bez klucza. Przed przekazaniem kontekstu agentowi sprawdź politykę organizacji i zakres dostępu. Przejrzyj każdy diff, wynik testów i uprawnienia proponowanych narzędzi. Testów nie zmieniaj po to, by ukryć nieukończone zachowanie.

Możliwość użycia agenta chmurowego, MCP, CLI i pul AI Credits zależy od planu oraz ustawień organizacji. Agent w IDE i agent chmurowy to osobne środowiska. Funkcje edytora mogą się różnić od CLI i od innych IDE. Polecenia i ustawienia narzędzi szybko się zmieniają, więc sprawdzaj je w aktualnej dokumentacji producenta.

Trener: Łukasz Matuszewski · [LinkedIn](https://www.linkedin.com/in/lukaszmatuszewski/) · [X](https://x.com/mrLumatic)
