# Podsumowanie — dzień 4, 26 listopada 2026

## Kontekst dnia

Czwarty dzień pięciodniowego, zdalnego kursu JSystems „AI dla programistów - od pomysłu do MVP”, prowadzonego przez Łukasza Matuszewskiego, poświęcono praktycznej pracy z agentami programistycznymi. Głównym narzędziem był Claude Code; omawiano też Codex CLI, GitHub Copilot i OpenCode jako alternatywy.

Grupa dokończyła plan PoC aplikacji **Hardware Service Decision Copilot**: PRD, ADR i plan implementacji. Następnie agenci zbudowali aplikację na podstawie planu z użyciem `/goal` (gałąź `feat/app-implementation`). Ważnym tematem stało się poprawienie podziału pracy: orchestrator (ORCH) ma koordynować zadania, monitorować postęp i dawać informację zwrotną, zamiast przejmować dużą część implementacji.

## Planowanie i koordynowanie pracy agentów

Aplikacja jest niewielka, więc plan obejmuje cały PoC naraz, a nie jeden fragment; przy większych projektach plan można dzielić na etapy. Powinien pokazywać zależności między zadaniami, wskazywać pracę możliwą do wykonania równolegle i jasno przypisywać odpowiedzialność. Omówiony plan wymagał korekty, ponieważ zbyt wiele zadań i ręcznych punktów kontrolnych przypisano do ORCH. Przydział należy sprawdzać pod kątem tego, czy agent koordynujący nie stał się głównym wykonawcą.

Zadania planu powiązano z GitHub Issues; wskazano też na użycie epika grupującego issues. Takie powiązanie może ułatwić ludziom przegląd pracy agentów i korektę zadań. Wśród omawianych rozwiązań do zarządzania zadaniami i wspólnej pamięci były Beads oraz Dolt. Przy współdzielonym zasobie, takim jak urządzenie testowe, przydatna może być kolejka zadań: agent czeka na dostęp, a w międzyczasie wykonuje inne prace.

Cel w `/goal` powinien być mierzalny i jednoznaczny. Powinien obejmować nie tylko implementację, ale też sprawdzenie, czy aplikacja działa oraz czy wymagane testy manualne rzeczywiście wykonano. Przy pracy agentów warto rozważyć Workflows i subagents; Agent Teams to osobna funkcja Claude Code. Ralph Loop omówiono jako wcześniejsze podejście, zastępowane w tym przepływie przez `/goal`, Workflows i subagents.

## Testowanie i weryfikacja

Testy należy prowadzić po każdej fazie, sprawdzając działającą aplikację, a nie tylko wyniki testów automatycznych. Wymagania dla PoC obejmowały testy manualne i E2E bez mocków na rzeczywistych endpointach, w tym wywołania LLM oraz modelu decyzyjnego przez OpenRouter. Tam, gdzie testy jednostkowe lub integracyjne wymagają mocków zewnętrznych usług, ich zachowanie powinno opierać się na rzeczywiście zarejestrowanych wywołaniach, nie wyłącznie na dokumentacji.

Do weryfikacji wizualnej można uruchomić aplikację i korzystać z niej jak użytkownik (Auto Verify), zapisywać zrzuty ekranu i sprawdzić aplikację przed uznaniem celu za zrealizowanym. Do końcowej dokumentacji i PR agent nagrywa też wideo z działania aplikacji przez ffmpeg. Wskazano używanie prawdziwych zdjęć do testów, a nie wyłącznie przykładowych atrap.

## Modele, API i dokumentacja decyzji

Model decyzyjny w PoC zmieniono z Luna Decisions na **Jev 1.14 od TypeSafe** przez OpenRouter. Agent przeanalizował dokumentację OpenRouter dla tego modelu i zaktualizował ADR oraz plan ([PR #9](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/9)). W ADR nie należy wpisywać konkretnych wersji zależności. Dla Context7 można stosować identyfikatory wzorcowe, np. `/vercel/next.js/vxx.x.x`.

OpenRouter zapewnia dostęp do modeli różnych dostawców; udostępnia m.in. rankingi i listę modeli bezpłatnych. Przy wyborze modelu warto brać pod uwagę koszt, szybkość, limity i jakość, a także knowledge cutoff. Omówiono również kredyty API dostępne w wybranych subskrypcjach Anthropic i OpenAI. Subskrypcje i rozliczanie przez API to różne ścieżki; szczegółowe zasady należy sprawdzać w dokumentacji dostawców.

## Instrukcje, sesje i długie procesy

Instrukcje agentów powinny być zwięzłe, spójne i odwoływać się do źródeł prawdy zamiast powielać ich treść. Dodatkowe reguły warto dodawać, gdy ujawni się konkretny problem. `/init` generuje `CLAUDE.md`. W `AGENTS.md` zalecono najpierw sprawdzać składnię CLI przez wbudowane `--help`, dokumentację bibliotek i frameworków pobierać przez Context7 z uwzględnieniem wersji w lockfile, a wyszukiwanie w sieci traktować jako dalszy krok i preferować strony dostawców.

Długotrwałe procesy agentów wymagają limitów czasu i monitorowania, aby wykryć zawieszenie i zdecydować, czy wznowić pracę. Dla dłuższych zadań należy dopasować timeout do konkretnego kroku. Omówiono również limity użycia i wznowienie pracy po ich resecie. Danych sesji OpenCode należy szukać w jego lokalnym katalogu danych; nie należy zakładać, że różne narzędzia przechowują je w tym samym miejscu.

Wśród funkcji i konfiguracji Claude Code omówiono `/rc` (Remote Control), `/teleport`, środowiska chmurowe, lokalne zmienne środowiskowe sesji oraz konfigurację serwera podglądu Claude Desktop w `app/.claude/launch.json`. Wspomniano też o Git worktree, w tym worktree Claude Code w `.claude/worktrees`. Pliki planów i briefów agentów mają charakter tymczasowy: dokumentacja w odpowiednich folderach powinna przypominać o ich usunięciu po wdrożeniu i potwierdzeniu realizacji planu; warto zachować historię zmian w Git. Briefów nie dodajemy do `.gitignore`, tylko commitujemy je w trakcie pracy, a lokalny skill do planowania też trafia do repozytorium (z wyjątkiem w `.gitignore`). Szablony należy traktować jako elastyczne wzorce, nie materiały do bezrefleksyjnego kopiowania.

## Bezpieczeństwo i obserwowalność

Środowiska agentów powinny być odizolowane stosownie do ryzyka. Warto ograniczać dostęp do danych i sekretów produkcyjnych, nadawać minimalne uprawnienia oraz rozważyć ograniczenia sieciowe i dedykowane środowiska. W przypadku Claude Cloud Environments wskazano konfigurację dozwolonych domen.

Do obserwowalności i ewaluacji aplikacji agentowych wskazano Langfuse. Przy udostępnianiu agentom narzędzi należy rozważać zakres uprawnień, m.in. przy korzystaniu z fine-grained personal access tokens (PAT).

## Plan na dzień 5

- Code review wbudowany w Claude, Codex i GitHub Copilot oraz własne workflow z agentami CLI lub SDK; narzędzia takie jak PR Agent, Qodo i CodeRabbit.
- Cloud Environments w Claude, Codex i Copilot: kredyty, przechowywanie danych, prywatność i ograniczenia.
- Uprawnienia agentów w `settings.json` (`allow`, `deny`, `ask`), hooki i reguły.
- Bezpieczeństwo środowisk firmowych dla agentów, dostęp do narzędzi i modeli dostępu zdalnego.
- Nowości w MCP, w tym skills over MCP, Tasks, Files, lazy loading i stateless.
- Praca z legacy code: analiza dużych repozytoriów, dokumentacja, workflow i RAG na kodzie.
- Analiza kosztów i danych z sesji oraz śledzenie użycia przez Langfuse lub OpenRouter.
- Modele lokalne w Claude i Codex, integracje VS Code i JetBrains oraz Agent Client Protocol.
- Narzędzia do vibe codingu i tworzenia aplikacji webowych.

## Materiały i linki

- Beads — https://github.com/gastownhall/beads
- Dolt — https://github.com/dolthub/dolt
- Personal access tokens — https://github.com/settings/personal-access-tokens
- Beadbox — https://beadbox.app/en
- Beads Viewer — https://paseo.sh/plugins/cuongntr/beads-viewer
- Przykładowy prompt: macierz subagentów i mapa zależności — https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md
- Epic issues dla implementacji — https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/issues/10
- Langfuse — https://langfuse.com/
- Kredyty API dla subskrybentów Claude — https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- Kredyty API dla subskrypcji ChatGPT — https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- Bezpłatne modele OpenRouter — https://openrouter.ai/models?variant=free
- Rankingi modeli i dostawców OpenRouter — https://openrouter.ai/rankings
- Jev 1.14 w OpenRouter — https://openrouter.ai/typesafe/jev-1.14
- Dokumentacja OpenRouter Decisions — https://openrouter.ai/docs/guides/features/decisions
- Podgląd lokalnego serwera w Claude Desktop — https://code.claude.com/docs/en/desktop#configure-preview-servers
- Zmienne środowiskowe w lokalnych sesjach Claude Desktop — https://code.claude.com/docs/en/desktop#environment-variables-in-local-sessions
- Agent Teams — https://code.claude.com/docs/en/agent-teams
- Workflows — https://code.claude.com/docs/en/workflows
- Dozwolone domeny w Claude Cloud Environments — https://code.claude.com/docs/en/cloud-environments#default-allowed-domains
- Ralph Loop (historycznie) — https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/tree/main/course-materials/how-to-ralph-wiggum
- PR #9: PRD, ADR i plan implementacji — https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/9
- PR #44: skill do planowania i zasady dla tymczasowych planów i briefów — https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/44
