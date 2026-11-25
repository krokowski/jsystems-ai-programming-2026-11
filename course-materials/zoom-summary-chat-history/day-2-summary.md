# Podsumowanie — dzień 2, 24 listopada 2026

Drugi z pięciu dni zdalnego szkolenia "AI dla programistów - od pomysłu do MVP", prowadzonego przez Łukasza Matuszewskiego w środowisku chmurowych maszyn wirtualnych z Ubuntu. Zajęcia koncentrowały się na praktycznej pracy z agentami programistycznymi: konfiguracji Claude Code, integracji z repozytoriami, delegowaniu zadań subagentom, tworzeniu Skills oraz zarządzaniu kontekstem i kosztami. Omawiano także Codex CLI i GitHub Copilot jako alternatywne narzędzia.

## Modele AI, benchmarki i badanie języków

Rozmowa o modelach i benchmarkach objęła MaxxBench - zmodyfikowany benchmark oparty na DeepSWE, przedstawiony jako sposób badania, czy modele dopasowują się do znanych testów. Poruszono także destylację modeli, różnice między modelami open-weight a czołowymi modelami zamkniętymi oraz pytanie, jak wiarygodnie oceniać ich możliwości. Do śledzenia postępu badań nad przyspieszeniem prac badawczo-rozwojowych w Anthropic udostępniono materiał METR.

Część praktyczna dotyczyła sprawdzenia, czy język polski i inne języki słowiańskie wpływają na skuteczność modeli w wyszukiwaniu informacji, RAG-u i rozumowaniu. Zadanie badawcze zakładało delegowanie pracy do co najmniej pięciu subagentów opartych na Haiku, poszukiwanie źródeł pierwotnych, weryfikowanie danych i - w razie potrzeby - powtarzanie wyszukiwania. Wyniki miały zostać opracowane po polsku i angielsku w Markdownie oraz w formie czytelnych artefaktów HTML. Gotowy raport udostępniono jako artefakt Claude w organizacji szkoleniowej. Jako źródło publikacji naukowych polecono arXiv.

Na początku dnia porównaliśmy gry i aplikacje z ćwiczenia Vibe Coding, wygenerowane w Arena.ai przez różne modele, oraz grę zbudowaną lokalnie w Claude Code z Opus 5.5. Udostępniono też film wyjaśniający, czym jest hipoteza Riemanna.

## Claude Code, sesje i praca z GitHubem

Pokazano pracę z GitHub CLI (`gh`) jako sposobem uzyskania bezpośredniej kontroli nad repozytorium. W porównaniu z MCP Connectorem CLI pozwala precyzyjnie wykonywać polecenia i kontrolować zakres uprawnień. Omówiono fine-grained Personal Access Token (PAT), ograniczany do wskazanych repozytoriów i potrzebnych operacji, oraz zasadę nadawania agentowi wyłącznie niezbędnego dostępu.

Przydatne polecenia z zajęć:

- `gh auth login` - logowanie do GitHuba;
- `gh auth status` - sprawdzenie statusu logowania;
- `gh auth setup-git` - konfiguracja uwierzytelniania Git;
- `gh repo fork --remote` - utworzenie forka i skonfigurowanie zdalnych repozytoriów `origin` oraz `upstream`;
- `gh api user` - pobranie informacji o zalogowanym koncie przez API.

Do pracy nad własną kopią projektu wskazano fork repozytorium zamiast wysyłania zmian bezpośrednio do repozytorium źródłowego. Omówiono także ustawienie tożsamości Gita i użycie adresu GitHub noreply, który pozwala nie ujawniać prywatnego adresu e-mail w publicznych commitach. Dla GitLaba wskazano `glab`; wspomniano również Bitbucket i Atlassian Rovo MCP.

Sesje Claude Code są związane z katalogiem roboczym. Przydatne skróty to `/resume` do powrotu do wcześniejszej sesji i `/new` do rozpoczęcia nowej. Omówiono również `/rc` (Remote Control) do zdalnej kontroli lokalnej sesji oraz tryb powłoki uruchamiany przez `!`. Wskazano, że `gh` może być wygodnym narzędziem dla agentów pracujących z repozytorium.

## Skills: tworzenie, instalowanie i bezpieczeństwo

Skill opisuje powtarzalny workflow agenta: kiedy należy go uruchomić, jak wykonać zadanie i jak sprawdzić jego jakość. Jednym ze sposobów tworzenia Skill jest analiza zakończonej sesji: zapisanie kolejnych kroków, poprawek i napotkanych problemów, a następnie ułożenie z nich instrukcji, które pomogą powtórzyć proces. Warto też określić, gdzie zapisywać wynik, i poprosić agenta o podsumowanie workflow przed jego ponownym wykonaniem.

Omówiono specyfikację Agent Skills oraz wyszukiwarkę i instalator skills.sh. Jako przykład instalacji pokazano:

```bash
npx --yes skills@latest add EdukeyTeam/agent-toolbox
```

Skills można organizować na poziomie projektu lub użytkownika; do współdzielenia między repozytoriami mogą służyć osobne repozytorium albo symlinki. Plik lock na poziomie projektu pozwala zachować informację o używanych Skills i ich wersjach. Ustawienia `.gitignore` można dobrać tak, by ignorować katalog z zainstalowanymi Skills, a jednocześnie śledzić plik lock lub wybrane wyjątki.

Przed instalacją warto sprawdzić, co Skill wykonuje i czy uzyskuje dostęp do credentials. Na zajęciach pokazano przykład oznaczony przez Snyk jako potencjalnie ryzykowny - sygnał do sprawdzenia jego zawartości i zakresu działania, a nie do bezrefleksyjnego zaufania ani automatycznego odrzucenia.

## Kontekst, statusline i koszty

Polecenie `/context` pokazuje wykorzystanie okna kontekstowego w Claude Code i Copilot CLI. Dla Codex udostępniono Skill do podobnego zastosowania. Przydatna statusline może prezentować stan sesji; pokazano konfigurację Claude Code opartą na skrypcie, ustawieniu `statusLine` w `.claude/settings.json` i narzędziu `jq`.

W dyskusji rozróżniono fine-tuning, czyli modyfikację wag modelu, od LoRA, czyli adapterów modyfikujących wybrane obszary sieci. Zestawiono te podejścia z przekazywaniem instrukcji i wiedzy przez kontekst oraz RAG. Zwrócono uwagę na cache: według informacji przekazanej podczas zajęć jego koszt może wynosić około 5-10% ceny tokenów wejściowych. Przy intensywnym użyciu agentów istotne jest ograniczanie niepotrzebnego kontekstu i sprawdzanie, jaki zakres kodu analizuje automatyczne Code Review.

## Agenci i automatyzacja pracy

Wśród narzędzi do organizowania pracy agentów wskazano Herdr. Wspomniano też o środowisku Termux, które udostępnia Bash na Androidzie, oraz o KDE Plasma. W kontekście przeglądu kodu pojawiły się GitHub Copilot code review, rulesets, PR-Agent i materiały dotyczące CI/CD. Pokazano także dokumentację narzędzi Claude do browser use i computer use.

## Plan na dzień 3

Kolejna sesja ma przejść do pracy nad pomysłem aplikacji. Przygotowanie obejmuje zapoznanie się z udostępnionym PRD opisującym wymagania funkcjonalne oraz ADR dotyczącym proponowanych technologii.

## Materiały i linki

**Modele, benchmarki i badania**
- [Czym jest hipoteza Riemanna (film)](https://www.youtube.com/watch?v=ptibpKiT-QM)
- [MaxxBench](https://unlap.ai/maxxbench/): zmodyfikowany DeepSWE, wykrywa dopasowanie modeli do benchmarku
- [Film o modelach open-weight](https://www.youtube.com/watch?v=B2rFx4Fy1us)
- [Badanie METR o przyspieszeniu prac badawczo-rozwojowych w Anthropic](https://metr.org/blog/2026-11-05-anthropic-ai-rd-acceleration-assessment/#executive-summary)
- [Dane OpenAI o perplexity i możliwościach modeli](https://x.com/merettm/status/2124549218995949967)
- [Współtwórca Bielika i twórca Basal Omni](https://x.com/KinasRemek)
- [Artykuł o wynikach modeli dla języka polskiego](https://cryps.pl/sztuczna-inteligencja-mowi-po-polsku-nasz-jezyk-zdeklasowal-angielski-w-najnowszym-rankingu/)
- [Raport o języku polskim jako artefakt Claude (dla organizacji szkoleniowej)](https://claude.ai/artifact/KLd5kLv3Q8CkRMwGpRZmh9)
- [arXiv](https://arxiv.org/)

**Gry z ćwiczenia Vibe Coding**
- [Rozmowa w Arena.ai](https://arena.ai/c/01a20842-d5a4-7d86-9550-7eb36d776411)
- [Claude Fable 5.2 High](https://01a20847-cb83-785c-8132-e80a371f532b.arena.site/), [Gemini 4 Carbon High](https://01a20834-05e9-7eda-8938-70b3c9be7819.arena.site/), [DeepSeek v4.1 Flash High](https://01a20837-4ed4-777c-b881-1450ace57989.arena.site/), [Qwen3.8 Max](https://01a20837-4ed4-7f4c-83c1-3259e3c25416.arena.site/), [Fable 5.1 Low](https://01a20c89-6fe5-7adb-aa4a-29d044b9ebc2.arena.site/), [Haiku 5.5 High](https://01a20c89-6fe5-740e-8f4d-de4dd6b7af98.arena.site/) i [kolejna gra](https://01a20843-a036-73dd-9d59-201a179bcafb.arena.site/)
- [Gra z Opus 5.5 lokalnie, z głosami z Google Lyria](https://rumi-neon-ride.vercel.app/)

**GitHub, GitLab, Bitbucket**
- [GitHub CLI](https://cli.github.com/)
- [Tokeny GitHub (PAT)](https://github.com/settings/credentials) i [nowy fine-grained PAT](https://github.com/settings/personal-access-tokens/new)
- [PAT w GitLabie](https://docs.gitlab.com/user/profile/personal_access_tokens/) i [GitLab CLI (glab)](https://docs.gitlab.com/cli/)
- [PAT w Bitbuckecie](https://confluence.atlassian.com/bitbucketserver0717/personal-access-tokens-1087535496.html)
- [Atlassian Rovo MCP](https://developer.atlassian.com/cloud/rovo-mcp/)

**Skills**
- Specyfikacja: [Agent Skills](https://agentskills.io/specification), [OpenAI](https://developers.openai.com/api/docs/guides/tools-skills), [Claude](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [skills.sh](https://www.skills.sh/): wyszukiwarka i manager Skills, np. [pyside6](https://www.skills.sh/?q=pyside6), [artifacts](https://www.skills.sh/?q=artifacts), [computer use](https://www.skills.sh/?q=computer+use)
- [Skill oznaczony przez Snyk jako ryzykowny](https://www.skills.sh/designed-by-ai/skills/design-mobile-apps) i [analiza tego Skill w czacie z Claude](https://claude.ai/share/cb1e79c1-63bb-490c-947e-daf72397554a)
- [Skills trenera: EdukeyTeam/agent-toolbox](https://github.com/EdukeyTeam/agent-toolbox), w tym [create-design-system](https://www.skills.sh/edukeyteam/agent-toolbox/create-design-system)
- [PR z Skills i plikiem lock, stworzony przez agenta](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/pull/5)

**Konfiguracja, kontekst i koszty**
- [Skrypt statusline](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/agent-configs/claude/statusline.sh)
- [Slajd o kosztach tokenów](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/Prezentacja_02_Podstawy_AI.html#15)

**Aplikacja kursowa**
- [PRD: pomysł na aplikację od strony funkcjonalnej](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/PRD-electronics-returns-complains-app.md)
- [ADR: technologie do użycia](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Prompt%20examples/ADR-generation-typescript-vercel-ai-sdk.md)

**Agenci, code review i automatyzacja**
- [Herdr](https://herdr.dev/) i [zestawienie managerów agentów](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/blob/main/course-materials/Research/agent-managers-and-remote-agents.md)
- [Termux](https://github.com/termux)
- [PR-Agent](https://github.com/The-PR-Agent/pr-agent), [rulesets](https://github.com/EdukeyTeam/agent-skills/settings/rules) i [Copilot code review](https://github.com/EdukeyTeam/agent-skills/settings/copilot/code_review)
- [CI/CD i headless code review](https://github.com/LucasMatuszewski/jsystems-ai-programming-2026-11/tree/main/course-materials/cicd-headless)
- [Claude browser use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/browser-use-tool) i [computer use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool)
- [Materiały szkolenia](https://devpowers.com/szkolenia/jsystems/ai-programming-2026-11/index.html)
