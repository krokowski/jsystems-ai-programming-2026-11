# Prompt caching when switching models or effort

Checked 2026-11-24 against live official documentation. Claude Code section and user reports added 2026-11-25.

## Claude Code: what breaks the cache and what keeps it

Source: [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching). The cache matches the exact start of each request (prefix): tools and system prompt, then project context (CLAUDE.md, memory), then the conversation. A change anywhere recomputes everything after it.

**One slower, uncached turn:**
- **Model switch** (`/model`, `opusplan` plan-mode toggles, a skill with its own `model`, automatic fallback). Each model has its own cache.
- **Effort change**, except on Fable 5.1+ and Opus, Sonnet and Haiku 5.5 with an API key or a Claude subscription, where the cache stays. On Bedrock, Google Cloud, a Claude apps gateway, with `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` or a HIPAA configuration, effort changes break it on every model.
- **Fast mode** on or off (separate cache per speed).
- **MCP server connected or removed** only when tools load upfront. With tool search, the default on supported models, the tool list is frozen at the first request and MCP changes keep the cache. The same rule covers plugins that bring MCP servers and denying a whole tool (`Bash`, `WebFetch`).
- **`/compact`**, removal of old images, and the first session after a Claude Code upgrade.

**Cache kept:**
- Editing files, editing the root or user CLAUDE.md mid-session (it reloads only after `/clear`, `/compact` or a restart), changing permission mode or output style, invoking skills and commands (appended as messages), plugin skills, agents and hooks, `/recap`, `/rewind`.
- Subagents build their own cache; the parent's cache is untouched.

**Lifetime:** on a subscription within plan usage the main conversation gets 1 hour, subagents 5 minutes. With an API key or usage credits the main conversation gets 5 minutes. Set `promptCacheTtl` (or `CLAUDE_CODE_PROMPT_CACHE_TTL`) to `5m` or `1h`.

**Why the status line ratio barely moves after `/model`:** `prompt_cache.hit_ratio` is cache-read tokens divided by all input tokens for the whole session, main conversation only ([status line fields](https://code.claude.com/docs/en/statusline)). Every tool call is a separate request that re-reads the context, so even a short session has many requests. Example: 100 requests of about 50k tokens is 5M input tokens; one full re-read of 50k after `/model` lowers the ratio by about one point. Watch `misses` and `last_miss_cause` in the status line JSON or the `Prompt cache (main)` line in `/usage` instead. Switching back to the previous model within its TTL can read that model's still-warm cache, so the return is cheap.

## What users measured (checked 2026-11-25)

- **Model switch:** in 770 sessions, a real model change rewrote 86% of the prior conversation versus 0.43% on ordinary turns ([zenn.dev, 2026-08-27](https://zenn.dev/aika_paranoid/articles/model-switch-cache)). Another log shows a switch to Sonnet still reading 34k tokens from a Sonnet cache warmed by a parallel session in the same folder, and the switch back to Opus costing 67 write tokens ([qiita.com, 2026-09-01](https://qiita.com/suwa_nobu/items/5fe930eb46d064b3da06)). Parallel sessions in the same directory share the prefix, so a switch is not always a full miss.
- **Effort:** effort changes broke the cache on Opus 5 and Sonnet 5 but not on Fable 5.1 ([issue #92444](https://github.com/anthropics/claude-code/issues/92444), open). This matches the current docs, which keep the cache only on Fable 5.1+ and the 5.5 models.
- **Real bugs, since fixed or open:** the subscription TTL silently fell from 1 hour to 5 minutes in March 2026 ([#46829](https://github.com/anthropics/claude-code/issues/46829)) and again for Team premium seats in v2.1.301 ([#102693](https://github.com/anthropics/claude-code/issues/102693), workaround `promptCacheTtl: "1h"`). Intermittent mid-session misses ([#87966](https://github.com/anthropics/claude-code/issues/87966)) and `claude -p` missing the cache after a turn without thinking ([#100065](https://github.com/anthropics/claude-code/issues/100065), open).
- **Hidden reasoning:** Anthropic returns summarized and encrypted thinking on purpose, to make distillation harder ([Anthropic research, 2026-10-12](https://www.anthropic.com/research/distillation-defenses), [preserved thinking](https://support.claude.com/en/articles/16761192-preserved-thinking-changing-how-the-messages-api-handles-thinking-blocks-to-protect-against-distillation)). No source was found claiming that cache token counts are reported falsely; all the reported anomalies trace to client bugs, TTL changes or the session-wide average.

| Question | Answer | Source |
| --- | --- | --- |
| Is cache shared across models or versions? | Different underlying models or snapshots have separate caches. Either direction uses the destination cache and writes an eligible prefix on a miss. | [Claude cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics#cache-miss-reason-types), [OpenAI cache diagnostics](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics#fix-a-cache-miss) |
| Does changing Claude thinking or effort reset it? | Changing thinking mode or budget misses the message cache. Changing top-level effort can miss too. Supported per-message effort changes preserve the earlier prefix. | [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#what-invalidates-the-cache), [Claude effort](https://platform.claude.com/docs/en/build-with-claude/effort) |
| Does changing OpenAI reasoning effort reset it? | A request-level change can cause a miss. Supported GPT-6 and later models can preserve the earlier prefix with a Responses API configuration update. | [OpenAI reasoning](https://developers.openai.com/api/docs/guides/reasoning#change-reasoning-mid-conversation) |

## Why switching can look asymmetric

Anthropic says, "The cache is per-model." Claude Code documents a cold turn after `/model`. Codex also supports `/model` mid-session, and OpenAI lists model-specific instructions as another reason a switch causes misses. A new model version or snapshot should be treated as a new cache. An alias can resolve to the same underlying model. [Claude diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics#cache-miss-reason-types), [Claude model IDs](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions), [Claude Code switches](https://code.claude.com/docs/en/prompt-caching#switching-models), [Codex commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

**Inference from prefix matching.** Opus to Haiku can be cold, while returning to Opus can hit Opus's own still-warm entry if the rendered prefix matches. Actual reuse on return through the CLI is unverified. Claude API entries last 5 minutes by default or 1 hour when requested. Hits refresh the timer from request start. Claude Code generally uses 1 hour for the main conversation within included subscription usage and 5 minutes for API-key, usage-credit, cloud-provider and ordinary subagent calls. Haiku subagents or background calls can show separate usage while the main cache stays warm. `opusplan` switches between Opus for planning and Sonnet for execution. Fast mode uses separate caches from standard speed and charges higher rates. [Claude API cache lifetime](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#1-hour-cache-duration), [Claude Code caching](https://code.claude.com/docs/en/prompt-caching), [Claude Code models](https://code.claude.com/docs/en/model-config), [Fast mode costs](https://code.claude.com/docs/en/fast-mode#understand-the-cost-tradeoff)

## Thinking and effort

- **Claude API.** "Changing thinking parameters (switching modes, or changing the budget in extended mode) invalidates cached message prefixes". This includes enabled, disabled and adaptive modes and changes to `budget_tokens`. Tool and system caches can also miss. The effort docs say "changing it between requests can invalidate cached prefixes from earlier turns." Explicit default effort equals omission. On supported models, append an effort update as a system message in the per-message beta. Thinking blocks can be cached with tool results. If the API strips earlier thinking, the match ends at that block. [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Per-message effort](https://platform.claude.com/docs/en/build-with-claude/effort-per-message)
- **Claude Code.** Changing `/effort` usually causes a miss. On Claude API-key or subscription connections it preserves cache by default on Fable 5.1 and later, Opus 5.5, Sonnet 5.5 and Haiku 5.5, subject to documented gateway, provider and beta restrictions. [Claude Code effort behavior](https://code.claude.com/docs/en/prompt-caching#changing-effort-level)
- **OpenAI and Codex.** Request-level `reasoning.effort` "Can change model-side reasoning instructions." For supported models, append `configuration_update` between responses and keep request-level effort unchanged. Codex CLI 0.165.0 enabled this path by default for supported models. [OpenAI caching](https://developers.openai.com/api/docs/guides/prompt-caching#which-settings-affect-the-cached-prefix), [Codex release](https://github.com/openai/codex/releases/tag/rust-v0.165.0), [Codex implementation](https://github.com/openai/codex/blob/rust-v0.172.0/codex-rs/core/src/session/reasoning_effort.rs)

## What else causes misses

Claude matches the exact prefix in the order `tools` -> `system` -> `messages`. Changes invalidate that level and those after it. MCP changes matter when they change the sent tool definitions. Claude Code's deferred tool search can keep the sent list stable. System-prompt edits affect downstream reuse. Root or user `CLAUDE.md` edits are picked up on reload, such as `/compact` or `/clear`. Claude API image-presence and `tool_choice` changes affect message caching. `/compact` rewrites history. A new session drops the old conversation prefix, while resuming can reuse matching, unexpired content. [Claude invalidation table](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#what-invalidates-the-cache), [Claude Code caching](https://code.claude.com/docs/en/prompt-caching), [Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)

OpenAI enables prefix caching by default on supported models. GPT-5.6 and later Responses API minimum lifetimes are 30 minutes by default or 12 hours by request. Earlier models use `prompt_cache_retention`, typically 5-10 minutes idle (up to 1 hour) in memory, or up to 24 hours with supported extended retention. `prompt_cache_key` helps routing before GPT-5.6 and provides optional separate accounting on newer models. [OpenAI API cache guide](https://developers.openai.com/api/docs/guides/prompt-caching)

## Five practical tips

- Pick the model and usual effort at session start.
- Use `/model` sparingly during long tasks. Switch at a task boundary when practical.
- Give bounded work to cheaper subagents such as Haiku. [Claude Code costs](https://code.claude.com/docs/en/costs)
- Budget for writes. Claude charges 1.25x base input for 5-minute writes and 2x for 1-hour writes. Reads are typically 0.1x, with 0.05x and 0.025x rates on specified models. On GPT-5.6 and later, the OpenAI Responses API charges 1.25x for 30-minute writes and 2.5x for 12-hour writes. [Claude cache pricing](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pricing), [OpenAI cache lifetime](https://developers.openai.com/api/docs/guides/prompt-caching#cache-lifetime)
- Check `/usage` (alias `/cost`) for cache reads and writes, and `/context` for context size. In API usage, compare Claude's `cache_creation_input_tokens` and `cache_read_input_tokens`, or OpenAI's `input_tokens_details.cached_tokens`. [Claude Code commands](https://code.claude.com/docs/en/commands), [Claude Code usage](https://code.claude.com/docs/en/costs#prompt-cache-statistics), [OpenAI cache metrics](https://developers.openai.com/api/docs/guides/prompt-caching#monitor-cache-performance)

## Primary sources

[Claude API prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Claude API effort](https://platform.claude.com/docs/en/build-with-claude/effort), [Claude Code prompt caching](https://code.claude.com/docs/en/prompt-caching), [OpenAI API prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/)
