# Automation tokens, MCP news, IDE/ACP, subscription sign-in (2026-11-26)

Checked: 2026-11-26 for day 5 (27.11.2026) group questions. Local tools: Claude Code 2.1.332, `codex-cli 0.171.0`, OpenCode 2.2.7, Ollama 0.30.6. Note: `developers.openai.com/codex/*` now redirects (308) to `learn.chatgpt.com/docs/*`. Updates, not replaces: [Headless agents](Headless%20agents%20-%20CLI%20automation,%20JSON%20streaming,%20subscriptions%20and%20CI-CD.md), [local routing](local-llm-routing-messages-vs-responses-2026-10-16.md), [local workers](local-models-as-agent-workers.md), [agent managers](agent-managers-and-remote-agents.md).

## Answers

### 1. Long-lived automation tokens

- `claude setup-token` runs the same browser flow as `/login`, then prints a **one-year OAuth token** and does not save it; set it as `CLAUDE_CODE_OAUTH_TOKEN`. https://code.claude.com/docs/en/authentication#generate-a-long-lived-token
- Plans: Pro, Max, Ultra, Team or Enterprise. It "can only make model requests": no Remote Control, no claude.ai connectors; locally configured MCP servers still work. Same source.
- `--bare` does **not** read `CLAUDE_CODE_OAUTH_TOKEN`; use `ANTHROPIC_API_KEY` or `apiKeyHelper` there. Precedence: cloud provider > `ANTHROPIC_AUTH_TOKEN` > `ANTHROPIC_API_KEY` > `apiKeyHelper` > `CLAUDE_CODE_OAUTH_TOKEN` > profiles > `/login`. In `-p` an API key in env always wins. Same source.
- `setup-token` and `/install-github-app` enforce only `forceLoginMethod`, not `forceLoginOrgUUID`, so a developer can mint a token in a different org than the company one. Same source, "Restrict login to your organization".
- GitHub Actions: `anthropics/claude-code-action@v1`, input `claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}` (or `anthropic_api_key`). `/install-github-app` can create the token and secret for you. https://code.claude.com/docs/en/github-actions
- Shared company CI: docs say for a secret shared across repos "authenticate with an API key ... rather than an OAuth token, since an OAuth token is tied to the subscription of the person who ran `claude setup-token`". Better still: workload identity federation (GitHub OIDC -> Console service account, `id-token: write`), no long-lived secret. https://code.claude.com/docs/en/github-actions#set-up-for-an-organization
- Terms: Free/Pro/Max/Ultra fall under Consumer Terms, Team/Enterprise/API under Commercial Terms. Plan limits "assume ordinary, individual usage of Claude Code and the Agent SDK". OAuth is for subscribers' "ordinary use of Claude Code and other native Anthropic applications"; products built on Claude (incl. Agent SDK) must use API keys; third parties may not offer Claude.ai login or route requests through Free/Pro/Max/Ultra credentials for their users. https://code.claude.com/docs/en/legal-and-compliance
- Practical reading: personal scripts/CI on your own repos with your own token = documented use case; a company-wide shared bot on one person's Pro/Max token = against the documented guidance (use API key, WIF or Team/Enterprise seats).
- Codex: OpenAI says "API keys are still the recommended default for automation" and to use API keys for CI/CD. https://learn.chatgpt.com/docs/auth
- Codex with a ChatGPT plan in CI: advanced guide only for **trusted private runners**, never public/OSS repos; seed `~/.codex/auth.json`, Codex refreshes it when `last_refresh` is older than ~8 days, write the refreshed file back, one file per runner/serial job stream. https://learn.chatgpt.com/docs/auth/ci-cd-auth
- Codex access tokens (`printenv CODEX_ACCESS_TOKEN | codex login --with-access-token`): ChatGPT **Business and Enterprise** workspaces, owner must enable, expiry chosen per token (example max 90 days, min 1 day), revocable, for trusted runners only. https://learn.chatgpt.com/docs/enterprise/access-tokens
- `openai/codex-action@v1` documents only `openai-api-key` (API billing). https://learn.chatgpt.com/docs/github-action

### 2. MCP news (spec 2026-07-28 and extensions)

- **Current spec revision: 2026-07-28.** Stateless MCP: no `initialize` handshake, no `Mcp-Session-Id`; every request carries version and client capabilities in `_meta`; new `server/discover`; `subscriptions/listen` replaces GET/SSE; no SSE resumability; Roots, Sampling, Logging deprecated; `extensions` field added. Gives: plain load-balanced HTTP servers, no sticky sessions. https://modelcontextprotocol.io/specification/2026-07-28/changelog
- **Tasks**: moved out of core into extension `io.modelcontextprotocol/tasks`, stage **Beta, destined for Core**; polling via `tasks/get`, `tasks/update` for mid-flight input. Gives: long jobs (exports, builds) without blocking the agent. https://modelcontextprotocol.io/extensions/overview
- **Skills over MCP** (`io.modelcontextprotocol/skills`): **Beta**, SEP-2640 Final; `skills/list`, `skills/get`, files via `resources/read` (`skill://...`), SHA-256 manifest, user approval, lazy file loading. Gives: ship the "how to use my tools" SKILL.md with the server. https://modelcontextprotocol.io/extensions/skills/overview
- **File uploads**: only **Experimental** (`experimental-ext-file-uploads`), no stability promise. No MCP "Files beta" found; "Files (beta)" likely means Anthropic's API Files beta, which is not MCP. https://modelcontextprotocol.io/extensions/overview
- Other: MCP Apps (`ui://`) **Stable**; Server Cards and Events Beta. Same source.
- Client matrix (community-maintained): **Claude Code** = Skills + Tasks; **VS Code GitHub Copilot** = Apps + Skills; Claude web = Apps + Skills + Tasks; **Codex not listed**. https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/extensions/client-matrix.mdx
- Claude Code: v2 MCP runtime (TS SDK 2.0) speaks 2026-07-28; MCP tasks go to background with a footer counter; skills from connectors, added servers and plugins. https://code.claude.com/docs/en/mcp
- Lazy tool loading: Claude Code defers MCP tools by default (`ENABLE_TOOL_SEARCH` unset/`true`; `auto:N` threshold; `false` = upfront). https://code.claude.com/docs/en/mcp
- Codex: tool search exists as the `deferred` tool surface (`mcp_servers.<id>.omit_tools_from = ["direct"|"deferred"|"code_mode"]`); the old `tool_search = false` switch is retired; optional stdio servers start lazily (`features.mcp_lazy_stdio_startup`). https://learn.chatgpt.com/docs/config-file/config-reference , https://learn.chatgpt.com/docs/extend/mcp
- VS Code Copilot: `tool_search` with ~30 always-loaded core tools and embedding search for the rest (v1.118); MCP skills behind `chat.agentHost.mcpSkills.enabled` (Copilot harness only). https://github.com/microsoft/vscode-docs/blob/main/release-notes/v1_118.md , https://code.visualstudio.com/docs/agent-customization/agent-skills

### 3. IDE integration, ACP, Copilot SDK

- Claude Code: official VS Code extension (`anthropic.claude-code`) and JetBrains plugin "Claude Code [Beta]" (IntelliJ, PyCharm, WebStorm, GoLand, PhpStorm, Android Studio); plugin needs the CLI installed. https://code.claude.com/docs/en/vs-code , https://code.claude.com/docs/en/jetbrains
- Codex: official extension `openai.chatgpt` for VS Code, Cursor, Windsurf; JetBrains via AI Assistant / AI Chat ("Codex" agent) with JetBrains AI subscription, OpenAI API key or ChatGPT account; Codex ignores `.aiignore`. https://learn.chatgpt.com/docs/codex/ide , https://www.jetbrains.com/help/ai-assistant/codex-agent.html
- VS Code now has agent **harnesses**: Copilot (Copilot SDK), Claude (Claude Agent SDK), Codex, Cloud; old Local harness removed by Feb 2027. https://code.visualstudio.com/docs/agents/run/agent-harnesses
- ACP (Agent Client Protocol): v1 stable, **v2 in Preview** (prompt lifecycle redesign, client fs/terminal APIs removed). https://agentclientprotocol.com/protocol/v2/migration
- ACP Registry: curated agents with auth, 46 listed today incl. Claude Agent (`agentclientprotocol/claude-agent-acp`), Codex (`codex-acp`), GitHub Copilot, Gemini CLI, Google Antigravity, Grok Build, Junie, OpenCode, Cursor, Kiro, Mistral Vibe, Qwen Code. https://agentclientprotocol.com/get-started/registry
- ACP clients: Zed, JetBrains (install from registry or `~/.jetbrains/acp.json`, no JetBrains AI subscription needed, not in WSL), Neovim, Emacs, Qt Creator, Sublime, Obsidian plugins, VS Code via community extensions. https://agentclientprotocol.com/get-started/clients , https://www.jetbrains.com/help/ai-assistant/acp.html
- Copilot SDK: **generally available**, semver, latest stable v2.0.3 (2026-11-25); Node/TS, Python, Go, .NET, Java, Rust; drives the Copilot agent runtime over JSON-RPC; needs a Copilot subscription (incl. free tier) or BYOK; billed like Copilot CLI. Repo is moving to the Microsoft org (packages `@microsoft/copilot-sdk` etc.). https://github.com/github/copilot-sdk

### 4. Subscription sign-in inside third-party apps

- "Sign in with ChatGPT": identity sign-in for anyone; **plan usage** for Go, Plus, Pro and Business; draws from the ChatGPT Work and Codex allowance; per-app weekly caps; credits after the limit are off by default; app gets name, email, avatar, not chats or memories; revoke in Settings > Security and login. https://help.openai.com/en/articles/20001542 , https://learn.chatgpt.com/docs/sign-in-with-chatgpt
- Partners with plan usage: Amp Code, Conductor, Dactyl, Devin, Hermes Agent, Hyperagent, Kilo Code, Lovable (soon), Notion, Vercel, Vorflux, Warp; open source: OpenClaw, OpenCode, Pi, T3 Code; sign-in only: Airtable, Canva, GitLab, HubSpot, Supabase. Business admins allow per app in admin.openai.com. Same source.
- v0: Plus, Pro, Business; eligible responses count against ChatGPT plan, but you still need v0 credits (per-request platform fee, images, subagents); no Fast mode; no auto switch to credits at the limit. https://v0.app/docs/chatgpt
- Claude: the opposite policy; third parties may not offer Claude.ai login or route through consumer plan credentials. https://code.claude.com/docs/en/legal-and-compliance
- Google: no equivalent program found. Gemini CLI terms: accessing the services behind Gemini CLI via third-party tools "(for example, using OpenClaw with Gemini CLI OAuth) is a violation" and may lead to suspension. https://github.com/google-gemini/gemini-cli/blob/main/docs/resources/tos-privacy.md

### 5. Local models (Ollama, OpenRouter)

- Existing notes are still valid: [local-llm-routing-messages-vs-responses-2026-10-16.md](local-llm-routing-messages-vs-responses-2026-10-16.md) (Claude Code `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`; Codex `model_provider` + `wire_api = "responses"`, `--profile`), [local-models-as-agent-workers.md](local-models-as-agent-workers.md).
- New only: `ollama launch` now covers `claude`, `codex`, `codex-app`, `opencode`, `copilot` (Ollama 0.30.6 `--help`). https://docs.ollama.com/integrations/codex
- Codex 0.171.0 still has `--oss --local-provider ollama|lmstudio` and `-p <name>` = `$CODEX_HOME/<name>.config.toml` (`codex --help`).
- OpenRouter for Claude Code: `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, empty `ANTHROPIC_API_KEY`, optional `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`. https://openrouter.ai/docs/cookbook/coding-agents/claude-code-integration

### 6. Claude Desktop preview servers and env vars

- `.claude/launch.json` (JSONC, auto-detected, commit it): `configurations[]` with `name`, `runtimeExecutable`, `runtimeArgs`, `port` (default 3000), `env` (no secrets); top-level `autoVerify` (default on). https://code.claude.com/docs/en/desktop#configure-preview-servers
- Claude starts the server, opens it in the Browser pane, takes screenshots, inspects DOM, clicks, fills forms, reads server logs and tests API endpoints; with auto-verify it checks after each edit before finishing. Same source.
- Env vars: per saved local environment (new sessions only), `env` in `~/.claude/settings.json` for all local sessions, or the encrypted local environment editor. Dev servers do not get saved-environment or settings.json vars; use shell profile / OS env / env editor and restart Desktop. https://code.claude.com/docs/en/desktop#environment-variables-in-local-sessions

### 7. OpenRouter free models

- `:free` variants: 20 requests/min; **50/day** if under 10 credits ever purchased, **1000/day** with at least 10 credits. https://openrouter.ai/docs/api/reference/limits
- 11 `:free` models in the models API today (e.g. `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-ultra-550b-a55b:free`); `openrouter/free` router picks a free one. A paid model in a `models` fallback list is billed. https://openrouter.ai/api/v1/models , https://openrouter.ai/docs/guides/routing/model-variants/free
- Data: separate account settings for whether free and paid routes may go to providers that train on prompts; opting out excludes those providers. https://openrouter.ai/docs/guides/privacy/logging
- OpenCode: built-in OpenRouter provider (`OPENROUTER_API_KEY` or connect account, model `openrouter/<vendor>/<model>`), so `:free` IDs work as model IDs. https://opencode.ai/docs/providers/

## Unverified

- Whether Anthropic counts a solo developer's own GitHub Actions on a personal Pro/Max token as "ordinary, individual usage" in every case; docs show it as supported, but no explicit quota rule for CI was found.
- Codex support for MCP revision 2026-07-28, Skills over MCP and the Tasks extension: not documented and not in the MCP client matrix.
- GitHub Copilot (VS Code/CLI) support for MCP Tasks: not in the matrix.
- Which free OpenRouter models are usable only with "allow training" enabled; and whether a given `:free` model handles agentic tool calls in OpenCode (not tested).
- Google: no official statement found that a "Sign in with Gemini" plan-sharing program is planned; the forum reply (2026-10-19) is from an unconfirmed author.
- Codex access token maximum validity beyond the "90 days" example.
