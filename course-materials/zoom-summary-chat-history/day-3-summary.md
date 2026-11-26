# Podsumowanie — dzień 3, 25 listopada 2026

## Zakres dnia

Trzeci dzień pięciodniowego kursu „AI dla programistów - od pomysłu do MVP”, prowadzonego zdalnie przez Łukasza Matuszewskiego, poświęcono pracy z agentami programistycznymi, design systemowi i planowaniu aplikacji wspólnie z agentem. Głównym narzędziem był Claude Code; omawiano też Codex CLI, GitHub Copilot, Copilot CLI i OpenCode jako alternatywy lub narzędzia do delegowania zadań.

## Praca z agentem i narzędziami programistycznymi

Na przykładzie pull requestu z raportem o języku polskim w LLM pokazano przegląd kodu przez Codex i odpowiadanie na uwagi z recenzji skillem `respond-to-code-review`. Agent może przy tym uruchomić `monitor`, czyli skrypt w tle, który w pętli obserwuje zmiany, na przykład nowe komentarze w PR. Omówiono też Claude Ship, w którym główną nowością jest pełny proces CI/CD z zatwierdzaniem i wdrożeniem zmian.

Code Mode, czyli programowanie algorytmiczne, przedstawiono jako nowy i często najlepszy sposób pracy agentów.

Do automatyzacji pracy w przeglądarce wskazano narzędzie Browser Use w Claude, rozszerzenie Claude in Chrome oraz Playwright CLI do obsługi różnych przeglądarek. Przy rozszerzeniach przeglądarkowych trzeba uważać na potencjalne wycieki danych i śledzenie.

## Design system

Design system powstawał w osobnej gałęzi `design-system` ze skillem `create-design-system`, uruchomionym na stronie DevPowers z widoczną przeglądarką. Agent dostał polecenie wykonania zrzutów samej górnej części strony w widoku mobilnym i desktopowym, commitu design systemu i utworzenia pull requestu. Następnie poproszono agenta o analizę błędów popełnionych podczas używania skilla i o przygotowanie jego poprawek jako pull requestu w publicznym repozytorium ze skillami.

## Skróty i polecenia Claude Code

- `/rename` zmienia nazwę sesji, a `/color` jej kolor.
- `/btw` pozwala zadać pytanie na boku z dostępem do historii sesji, bez przerywania agenta i bez dodawania pytania do głównej historii.
- `/fork` tworzy kopię całej sesji do pracy nad innym zadaniem, na przykład poprawką skilla.
- `/rewind` cofa sesję do wcześniejszego promptu i usuwa późniejszą historię; przydaje się po błędach.
- `Ctrl+J` wstawia nową linię; `\` działa podobnie, ale nie wszędzie.
- `Ctrl+G` otwiera prompt w edytorze wskazanym przez `$EDITOR`, `Ctrl+W` usuwa całe słowa, a strzałka w górę przywołuje wcześniejsze prompty.
- `/mcp` wyświetla listę serwerów MCP i konektorów, `/model` służy do wyboru modelu, a `/status` pokazuje między innymi, kiedy odnowi się limit sesji.
- `/new` otwiera nową sesję, a `/goal` zleca agentowi realizację celu, na przykład planu: `/goal implement this plan: @<path-planu>.md`.

Jako terminalowy edytor promptów polecono Micro: `Ctrl+S` zapisuje, a `Ctrl+Q` zamyka edytor i przekazuje prompt do agenta. Po zmianie `~/.bashrc` trzeba wykonać `source ~/.bashrc`. Jako inne edytory wspomniano Zed, Fresh (pełne IDE w terminalu) oraz Vim/Neovim; w VS Code `Shift+Ctrl` ze strzałką daje wiele kursorów.

## Spec-Driven Development i planowanie

Głównym podejściem do budowy aplikacji był Spec-Driven Development (SDD). Przed implementacją agent pomaga doprecyzować wymagania w PRD, przygotować decyzje architektoniczne w ADR, a następnie opracować plan z zadaniami i zależnościami. Dokumenty należy sprawdzić pod kątem spójności i sprzeczności, a implementację rozpocząć w nowej sesji na podstawie zaakceptowanego planu. Można poprosić o pełną implementację w ramach jednego planu albo o fragmenty, na przykład pierwsze 1-2 etapy; obecnie agenci bez problemu realizują całość od razu.

Jako alternatywne metodyki i frameworki omawiano FIRE (`specs.md`) i GitHub Spec Kit, a jako alternatywę dla trybu planowania skille z `skills.sh`, w tym zestaw superpowers i `writing-plans`. Tryb planowania domyślnie zapisuje plan w wewnętrznym folderze Claude; można to zmienić w `settings.json`, na przykład `"plansDirectory": "./docs/plans"`.

Git worktree to gałąź z osobną kopią kodu. Pokazany przykład planu działa bez worktree: zawiera macierz zadań i zależności oraz deleguje pracę do agentów CLI w trybie headless, takich jak OpenCode, Codex czy agy. Warto poprosić, aby agent orkiestrator zapisywał wszystkie prompty jako pliki Markdown, na przykład `docs/plans/.briefs/<plan-name>-<brief-name>.md`. Agenci commitują plany i briefy w trakcie pracy, a po pełnej realizacji planu (zgodnie z jego Definition of Done, na przykład po merge lub wdrożeniu na produkcję) pliki się usuwa, bo zostawione rozpraszają agentów; pozostają w historii Git. Status zadań w planie można łączyć z GitHub Issues.

## Aplikacja do zwrotów i reklamacji elektroniki

Jako przykład projektu służyła aplikacja zbierająca opis problemu i zdjęcie produktu, a następnie przygotowująca wstępną ocenę sprawy. Przykładowy przepływ zakłada użycie modelu decyzyjnego Luna Decisions do sprawdzenia kategorii produktu, jego stanu i zgodności formularza ze zdjęciem. Przy niskiej pewności, na przykład poniżej 80%, sprawa trafia do multimodalnego LLM; przy wysokiej pewności warto przetestować, czy wstępny etap może obyć się bez LLM. Rekomendacja aplikacji ma charakter wstępny i niewiążący.

Rozważano zarówno formularz, jak i interfejs konwersacyjny, w którym agent może korzystać z elementów interfejsu jak z narzędzi. W tym kontekście przedstawiono protokół AG-UI z licznymi SDK społeczności, CopilotKit oraz assistant-ui. Do testów automatycznych i manualnych udostępniono przykładowe zdjęcia produktów w `assets/example-images`.

Każdy uczestnik przygotowuje własną wersję stosu technologicznego w oparciu o technologie, których używa. Najpierw warto zlecić agentowi research z użyciem Context7 i poszukać gotowego boilerplate’u lub szablonu, na przykład prostej aplikacji czatu AI albo Angular + Java z OpenAI, co przyspiesza start agenta.

## Modele, API i uruchamianie lokalne

OpenRouter daje dostęp do modeli wielu dostawców przez jedno API. W OpenCode providerów dodaje się poleceniem `/connect`, a aplikacja może czytać klucz i model z pliku `.env`, na przykład `OPENROUTER_API_KEY` i `LLM_MODEL=openai/gpt-6-luna`. Agent może też delegować zadania do zewnętrznych modeli przez OpenCode w trybie headless. Modele decyzyjne, takie jak Luna Decisions, zwracają decyzję z poziomem pewności. Do modeli lokalnych w aplikacji można użyć Ollama lub LM Studio, a do hostingu vLLM albo `llama-server`.

Klucze API przechowuj w zmiennych środowiskowych lub pliku `.env` poza repozytorium, nigdy w kodzie.

## Prompt caching, MCP i wyszukiwanie wiedzy

Omówiono prompt caching w Claude Code (dla subskrypcji) oraz osobno w Claude Platform API. Cache ogranicza ponowne przetwarzanie powtarzalnej części kontekstu. Każdy model ma własny cache, a szczegóły unieważniania cache przy zmianie modelu i poziomu effort opisuje materiał z dnia 2.

Context7 to wyszukiwanie RAG i baza wiedzy dla agentów na dokumentacji i kodzie, zarówno publicznym, jak i prywatnym. Konfiguracja dla Claude Code: `npx ctx7 setup --claude`, a klucz trzymaj w zmiennej `CONTEXT7_API_KEY` w `~/.bashrc` (`export CONTEXT7_API_KEY=...`). Context7 można też zainstalować jako plugin albo dodać jako konektor Claude w chmurze. Ukryte pliki, takie jak `.bashrc`, wyświetla `ls -a`. Prosty własny backend z prywatnym RAG jest dostępny w skillu `legacy-codebase-workflows`. Claude ma wbudowane wyszukiwanie, a jako zewnętrzne wyszukiwarki i agentów researchu wskazano Exa, Brave Search MCP i Perplexity MCP.

## Dane i kopie zapasowe

Warto eksportować dane z usług AI, na przykład historię ChatGPT, i robić kopie zapasowe kilka razy dziennie, na przykład narzędziem restic. Tailscale tworzy prywatną sieć VPN łączącą telefon, laptop i inne urządzenia. Jako przykład skrajnie szybkiego wdrażania wskazano levelsio, który zmienia pliki PHP bezpośrednio na serwerach produkcyjnych serwisów z milionami użytkowników.

## Materiały i linki

**Dane i bezpieczeństwo**
- Eksport danych z ChatGPT: https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data
- restic: https://restic.net/
- Tailscale: https://tailscale.com/
- levelsio na X: https://x.com/levelsio

**Agenci, przeglądarka i design system**
- Pull request z recenzją Codex: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/5
- Skill `respond-to-code-review`: https://github.com/EdukeyTeam/agent-toolbox/tree/main/skills/respond-to-code-review
- Claude Ship: https://claude.com/resources/articles/introducing-claude-ship
- Code Mode i programowanie algorytmiczne: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Research/code-mode-and-algorithmic-code-migration-2026-10-13.md
- Browser Use w Claude: https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool
- Claude in Chrome: https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn
- Playwright CLI: https://playwright.dev/agent-cli/introduction
- Pull request z design systemem: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/6
- Micro: https://micro-editor.github.io/
- Zed: https://zed.dev/
- Fresh: https://getfresh.dev/

**SDD, PRD, ADR i planowanie**
- FIRE / `specs.md`: https://specs.md/
- GitHub Spec Kit: https://github.com/github/spec-kit
- Skille do SDD: https://www.skills.sh/?q=spec
- Skille do planowania: https://www.skills.sh/?q=plan
- Skille do PRD: https://www.skills.sh/?q=prd
- Skille do ADR: https://www.skills.sh/?q=adr
- superpowers: https://www.skills.sh/obra/superpowers
- superpowers - using-superpowers: https://www.skills.sh/obra/superpowers/using-superpowers
- superpowers - writing-plans: https://www.skills.sh/obra/superpowers/writing-plans
- Plany usunięcia trybu planowania: https://x.com/trq212/status/2102813194196758746
- Git worktree: https://git-scm.com/docs/git-worktree
- Przykładowy prompt PRD dla aplikacji zwrotów i reklamacji: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/PRD-electronics-returns-complains-app.md
- Przykładowy prompt ADR dla Java i Angular: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/ADR-generation-java-openai-sdk-angular-material.md
- Przykładowy prompt ADR dla TypeScript i Vercel AI SDK: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/ADR-generation-typescript-vercel-ai-sdk.md
- Przykładowy prompt planu z subagentami i mapą zależności: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/Plan-SubAgents-matrix-dependency-map.md
- OpenCode: https://opencode.ai/
- Dokumentacja OpenCode: https://opencode.ai/docs

**Interfejsy i modele**
- AG-UI: https://docs.ag-ui.com/introduction
- SDK społeczności AG-UI: https://github.com/ag-ui-protocol/ag-ui/tree/main/sdks/community
- CopilotKit i AG-UI: https://www.copilotkit.ai/ag-ui
- assistant-ui: https://github.com/assistant-ui/assistant-ui
- Zdjęcia produktów do testów: https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/tree/main/assets/example-images
- OpenRouter: https://openrouter.ai/
- Luna Decisions w OpenRouter: https://openrouter.ai/openai/gpt-6-luna-decisions
- Modele decyzyjne: https://typesafe.ai/
- Ollama: https://ollama.com/
- LM Studio: https://lmstudio.ai/
- vLLM: https://vllm.ai/
- `llama-server`: https://llama.app/docs/serve

**Cache i wyszukiwanie wiedzy**
- Prompt caching w Claude Code: https://code.claude.com/docs/en/prompt-caching
- Prompt caching w Claude Platform API: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Cache przy zmianie modelu i effort (dzień 2): https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Research/prompt-caching-model-switch-and-effort-2026-11-24.md
- Context7: https://context7.com/
- Context7 dla Codex: https://context7.com/openai/codex
- Context7 w Claude Code: https://context7.com/docs/clients/claude-code
- Plugin Context7 dla Claude Code: https://context7.com/docs/clients/claude-code#installing-the-plugin
- Konektor Context7 w Claude: https://claude.ai/directory/context7
- Prosty backend z prywatnym RAG: https://github.com/EdukeyTeam/agent-toolbox/tree/main/skills/legacy-codebase-workflows/assets/context7
- Lokalny Context7: https://github.com/EdukeyTeam/agent-toolbox/blob/main/skills/legacy-codebase-workflows/references/local-context7-setup.md
- Prywatne wyszukiwanie: https://github.com/EdukeyTeam/agent-toolbox/blob/main/skills/legacy-codebase-workflows/references/private-retrieval.md
- Exa: https://exa.ai/
- Brave Search MCP: https://github.com/brave/brave-search-mcp-server
- Perplexity MCP: https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server

## Plan na dzień 4

- Stworzyć plany u wszystkich i wprowadzić do nich poprawki; najlepiej plan od razu na całą aplikację (software factory), ale może być też na fragmenty.
- Sprawdzić, czy agent nie robi mocków dla testów E2E i manualnych; mocki dla testów jednostkowych i integracyjnych powinny opierać się na realnych wywołaniach endpointów, a nie na dokumentacji.
- Przejrzeć spójność planu, ADR, PRD i `AGENTS.md` i usunąć sprzeczności lub niejednoznaczności.
- Omówić, co powstało w PRD, ADR i planie: diagramy UML w Mermaid, problem rozwiązywany przez aplikację, grupę odbiorców, skalę (mała firma, aplikacja wewnętrzna, PoC, enterprise, globalny startup) i specyfikę firmy, na przykład sektory regulowane.
- Omówić działanie `/goal` i monitora do wznowienia pracy po limicie.
- Omówić poziomy instrukcji `AGENTS.md`: organizacja, użytkownik w chmurze, użytkownik lokalnie, root projektu oraz moduły i foldery.
- Opcjonalnie: używanie GitHub Issues obok planu i wbudowanych zadań Claude; w razie potrzeby npm zamiast pnpm.
- Stworzyć skill do planowania zgodny z omówioną ścieżką i wszystkimi poprawkami.
