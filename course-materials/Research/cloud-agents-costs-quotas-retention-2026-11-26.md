# Cloud agents and managed code review: costs, quotas, retention

Checked 2026-11-26 for day 5 (27.11.2026). Vendor docs read directly (code.claude.com and platform.claude.com `.md` pages, learn.chatgpt.com `.md` pages, docs.github.com article API), plus `claude --help` (v2.1.332) and `codex --help`. Updates [claude-artifacts-retention-ownership-2026-11-24.md](claude-artifacts-retention-ownership-2026-11-24.md) (edited in place) and complements [token-optimization-limits-resets.md](token-optimization-limits-resets.md) and [github-code-review-company-settings-2026-11-05.md](github-code-review-company-settings-2026-11-05.md).

## Answers

### 1. Cloud agents: what the subscription covers

**Claude Code on the web (cloud sessions, `claude --cloud`, `--teleport`)**
- Available on Pro, Max, Ultra and Team, and for Enterprise users with premium or Chat + Claude Code seats and with the single Enterprise seat on new and self-serve plans (https://support.claude.com/en/articles/11845131-use-claude-code-with-your-team-or-enterprise-plan). On Pro, Max, Ultra, Team and legacy seat-based Enterprise a cloud session "counts toward your plan's usage limits alongside the rest of your Claude and Claude Code usage, and there's no separate charge for the cloud VM". Parallel tasks consume limits proportionately. https://code.claude.com/docs/en/claude-code-on-the-web
- Current (usage-based) Enterprise is different: "The seat fee ... doesn't include any usage. Every token your team consumes is billed separately at standard API rates." Standard and Premium are legacy Enterprise seat types, no longer sold. https://support.claude.com/en/articles/11526368-how-am-i-billed-for-my-enterprise-plan
- Limits are the same rolling 5-hour window and weekly window, shared with chat and Cowork. On Team and legacy seat-based Enterprise the allowance is per seat (Standard or Premium). https://code.claude.com/docs/en/costs
- Past the limit you only pay if **usage credits** (the new name for extra usage) are on: individual plans turn them on in Settings > Usage. On Team and seat-based Enterprise an Owner turns them on and sets org, group or member spend limits, and the organization pays. Usage credits do not apply to usage-based Enterprise, which pays API rates from the first token. https://code.claude.com/docs/en/costs, https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans
- Owner controls: the GitHub connector (members need it to sign in with GitHub for cloud sessions, https://code.claude.com/docs/en/web-quickstart), the `allow_remote_sessions` policy and the cloud sessions permission in custom roles. ZDR, HIPAA and CMEK orgs cannot use cloud sessions. https://code.claude.com/docs/en/claude-code-on-the-web
- `--remote` is now a deprecated alias for `--cloud`. `--teleport` moves sessions one way only, from cloud to terminal. It needs a claude.ai login, a clean git state and the session branch pushed. https://code.claude.com/docs/en/claude-code-on-the-web

**Codex Cloud (OpenAI)**
- Codex Cloud is available on eligible Plus, all Pro tiers, Business, Enterprise and Edu plans, but not on Free or Go. "Model usage counts toward your normal Codex usage limits and applicable credits or billing", and "At launch, standard Codex Cloud environments have no separate VM charge". https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- "Local messages and cloud chats share your plan's usage allowance". "Cloud tasks may use more of your allowance than local messages". Plus and Standard Business have 5-hour limits and Pro has none. Weekly limits may also apply. Enterprise/Edu with flexible pricing has no fixed limit and draws on a credit pool. https://learn.chatgpt.com/docs/pricing
- Past the limit, Plus/Pro users buy credits themselves. Business/Enterprise draw on shared workspace credits that the Owner buys. API-key mode has "No cloud-based features". https://learn.chatgpt.com/docs/pricing
- Default VM size is 2 vCPU/8 GiB on Plus and 4 vCPU/16 GiB/32 GiB disk on Pro, Business and Enterprise. Larger VMs are Enterprise-only and priced by the account team. https://learn.chatgpt.com/docs/environments/cloud-environments

**GitHub Copilot cloud agent ("Copilot in the cloud" since 28.10.2026)**
- Model usage is billed in **AI credits** (1 credit = $0.01) since 1.06.2026. Premium requests remain only for legacy annual Pro/Pro+ plans. https://docs.github.com/en/copilot/concepts/billing/copilot-requests
- Monthly AI credits by plan: Pro ($10) 1,500, Pro+ ($39) 7,000, Max ($100) 20,000. They reset on the 1st (UTC) without rollover, and extra usage runs against a USD budget. https://docs.github.com/en/copilot/concepts/billing-and-usage/individuals/billing
- Business gets 1,900 and Enterprise 3,900 credits per user per month, **pooled** per billing entity. "AI credits paid usage" is enabled by default and an admin must disable it to block overage. https://docs.github.com/en/copilot/concepts/billing-and-usage/organizations-and-enterprises/billing
- **Compute is billed separately.** "Cloud and GitHub Actions compute draw on the same monthly GitHub account allowance, separate from AI credits". https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- Included compute per month: $12 on Free, $18 on Pro, $12 on Free for orgs, $18 on Team and $300 on Enterprise Cloud. https://docs.github.com/en/billing/reference/product-usage-included
- Sandbox meters past that allowance: $0.000024 per vCPU-second, $0.000003 per GiB-second, and $0.005 per GiB-month for stopped-session snapshots. The repo owner pays, whether that is a personal account or an org. https://docs.github.com/en/billing/concepts/product-billing/cloud-and-local-sandboxes
- An Actions-based session can run for at most 59 minutes. https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent

### 2. Managed AI code review

- **Claude Code Review (GitHub app):** Team and Enterprise only. It is "billed on token usage through usage credits, separately from your plan's included usage", "billed to your organization, not to the developer". There is no flat price; the cost depends on the level (Quick, Standard or Deep) and on how often reviews run. New repos default to **After every push**. The Owner sets a Code Review spend limit and reviews are skipped when budget runs out. https://code.claude.com/docs/en/code-review, https://code.claude.com/docs/en/code-review-costs
- **Claude for individuals:** local `/code-review` uses plan usage. `/code-review ultra` (Ultrareview) gives 3 free runs once per Pro/Max/Ultra account, then usually costs $5-25 per review in usage credits. Claude in your own CI uses API billing. https://code.claude.com/docs/en/ultrareview, https://code.claude.com/docs/en/code-review
- **Codex code review in GitHub:** included from Plus up but not with an API key. Reviews through GitHub (`@codex review` or automatic) count as "Code Review usage", while local `/review` counts toward general limits. https://learn.chatgpt.com/docs/pricing
- Credit-based Business/Enterprise pay token rates and list code review as running on GPT-5.3-Codex. https://help.openai.com/en/articles/11481834-chatgpt-rate-card-business-enterpriseedu-credit-based-pricing
- **Copilot code review** has two cost parts: AI credits for the model and **GitHub Actions minutes** for agentic context gathering. Self-hosted runners use no minutes. https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review
- Estimated Copilot cost per review: Lite about $0.25, Balanced about $1.50, Max about $10, not counting Actions minutes. https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review
- Copilot review billing: automatic reviews charge the PR author and manual reviews charge the requester. Admins choose **Member** or **Organization** as the billing source, and the org pays by default if nothing is saved. Unlicensed members' reviews are paid usage for the org. Copilot Free excludes code review. https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/code-review

### 3. Retention of cloud environments and unpushed work

- **Claude:** after a few idle minutes the VM "pauses with its files saved", and the next message restores the same VM. A paused VM "can later be reclaimed". https://code.claude.com/docs/en/cloud-environments
- Reopening a reclaimed session provisions a fresh VM. The docs list only "conversation history" (and MCP task tracking) as restored, so running commands, subagents and `/loop` are lost. https://code.claude.com/docs/en/claude-code-on-the-web
- Sessions stay in claude.ai/code until you archive or delete them, and deletion is permanent. Under Enterprise custom retention, "Cloud sessions Claude starts from a chat are deleted with that chat". https://code.claude.com/docs/en/data-usage, https://support.claude.com/en/articles/10440198-configure-custom-data-retention-controls-for-enterprise-plans
- **Codex (current Codex Cloud):** an existing task keeps "its own saved files, including uncommitted changes and installed tools". However, "a task's saved VM state is recoverable for up to seven days after you last start a turn or resume the task". OpenAI's advice: "Commit important work ... Saved state doesn't replace source control". https://learn.chatgpt.com/docs/environments/cloud-environments
- Codex Cloud (Legacy), which still serves Code Review and the GitHub/Linear integrations, caches container state for only up to 12 hours. https://learn.chatgpt.com/docs/environments/cloud-environment
- Conversations follow chat retention, while "hosted execution state and snapshots follow a separate lifecycle". This explains the participant's case: the history stayed, but the VM state expired. https://learn.chatgpt.com/docs/enterprise/chatgpt-work-cloud-security
- **Copilot:** a stopped cloud sandbox keeps a snapshot so you can resume "with your files and in-progress work intact". The snapshot is billed as storage until you delete it. https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes
- Copilot chat data is kept 28 days for Actions-based sessions and for the life of the account in sandbox sessions. https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- **Recommendation:** use one branch per task, push early, and ask the agent to commit and push at each milestone, ideally to a draft PR. Teleport and `claude --cloud` only see pushed branches. https://code.claude.com/docs/en/claude-code-on-the-web

### 4. Claude Artifacts (update of the 24.11 file)

- No expiry for published or shared artifacts is documented. The only stated expiry is for pending email invitations, which expire after 30 days. Unpublishing a legacy artifact permanently deletes its data. https://support.claude.com/en/articles/9547008-publish-and-share-artifacts
- New: "Artifacts shared with your organization stay shared after their creator leaves". A removed member loses their own access right away. https://support.claude.com/en/articles/9547008-publish-and-share-artifacts, https://support.claude.com/en/articles/16994751-artifacts-admin-guide-for-team-and-enterprise-plans
- Enterprise custom retention (minimum 30 days): artifacts are deleted on their own clock, counted from the last open or edit, "not with the chat". Public-link artifacts are never deleted this way. Research reports and artifacts in some older chats are deleted with their chat. Team has no custom retention. https://support.claude.com/en/articles/10440198-configure-custom-data-retention-controls-for-enterprise-plans
- Turning Artifacts off, or External sharing off, deletes nothing, but the existing links stop working until the setting is turned back on. https://support.claude.com/en/articles/16994751-artifacts-admin-guide-for-team-and-enterprise-plans

### 5. API credits bundled with subscriptions

- **Anthropic:** Max gets $100/month, Ultra $200/month and Team $20 per Standard or $100 per Premium seat, pooled and capped at $500. Free, Pro and Enterprise are not eligible. The credits cover the Claude API, Managed Agents, the **Agent SDK** and the Console playground. https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- The Anthropic credits do **not** cover Claude Code, extra usage in the apps, or Bedrock/Vertex/Foundry. They expire at the end of each billing cycle with no rollover and need no payment method. https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- Anthropic claim process: the claimant must be the subscriber or a Team Owner and an Admin/Billing user of the Console org. Claims open after 7 days on the plan, and each plan links one Console org. When the credits run out, requests stop unless purchased credits exist, and nothing is charged to the Claude plan. https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers
- **OpenAI:** Pro tiers get $100, $200 or $500/month. Business gets $20 per Standard or $100 per Premium seat, pooled and capped at $500/month per workspace ($6,000 per annual cycle; an annual-upfront workspace gets the year's grant at once). Plus, Go, Free and Enterprise are not eligible. https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- The OpenAI credits cover the Responses, Agents (including hosted sandbox), Realtime and Images APIs plus built-in tools. "Codex usage through API keys is not supported by this benefit". https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- OpenAI expiry and claiming: unused credits expire at the end of the cycle, and the first grant is prorated. The claimant must own both the subscription and the API org with the same email. Free and complimentary plans don't qualify. https://developers.openai.com/api/docs/guides/chatgpt-api-credits
- **CI use:** CI is fine on both vendors only if it calls the API or SDK directly (Claude Agent SDK, OpenAI Responses/Agents). Claude Code CLI or Codex CLI with an API key in CI is excluded from these credits.

## Comparison

| | Claude | Codex (OpenAI) | GitHub Copilot |
|---|---|---|---|
| Cloud agent quota | Plan 5h + weekly limits, shared with chat (Pro/Max/Ultra/Team, legacy Enterprise seats); usage-based Enterprise: per token at API rates | Plan allowance shared with local, cloud uses more; Pro no 5h limit; Enterprise flex = credit pool | Monthly AI credits (Pro 1,500 / Pro+ 7,000 / Max 20,000; Business 1,900 / Enterprise 3,900 per user, pooled) |
| Extra cost after limit | Usage credits at API rates, opt-in; org-paid on Team and seat-based Ent; usage-based Ent pays API rates from the first token | Credits (Plus/Pro self; Business/Ent workspace pool) | AI credits budget; org paid usage on by default |
| VM / compute | No separate charge | No separate charge for standard env ("at launch"); bigger VMs Ent only | Separate: included compute $12-$300/month, then per vCPU-s, GiB-s, snapshot storage |
| Managed PR review | Team/Ent only, usage credits separate from included usage, billed to org (usage-based Ent: API rates) | Plus+ incl., own "Code Review usage" bucket | AI credits (~$0.25-$10/review) + Actions minutes |
| Env retention | Pauses with files; reclaimed later (time unknown); history kept | Task VM state up to 7 days after last turn; legacy cache 12 h | Stopped sandbox snapshot until deleted (billed) |
| Bundled API credits | Max $100, Ultra $200, Team up to $500; not Claude Code | Pro $100-$500, Business up to $500; not Codex via API key | None documented |

## Unverified

- Claude: the time before a paused VM is reclaimed is not documented. That unpushed, uncommitted files are lost after a reclaim is inferred, because the docs list only conversation history as restored.
- Codex: whose allowance pays for a GitHub review (PR author, configurer or `@codex` requester), the size of the "Code Review usage" bucket, and whether reviews fall back to credits after it runs out are not documented. "No separate VM charge" is worded "at launch" and may change.
- Copilot: whether the Actions-based cloud agent consumes standard Actions minutes from the same $ allowance, rather than a separate meter, is stated only generally. No automatic deletion period for stopped sandbox snapshots is documented.
- Anthropic API credits with `anthropics/claude-code-action` in CI: excluded by the "Claude Code" row, but that is not stated explicitly for the Action.
- Artifacts: effects of consumer account deletion, manual chat deletion outside Enterprise retention, and a downgrade to Free on published links are not documented.

## Cloud sessions bonus credit promotion (expired)

- Sep 23 to Nov 4, 2026: individual Pro ($100) and Max ($250) subscribers got a one-time bonus for cloud sessions from web, desktop, CLI or mobile, used before plan limits. Team and Enterprise were excluded. Claim by Oct 7, expired Nov 4, 2026. https://support.claude.com/en/articles/17152539-cloud-sessions-bonus-credit-promotion
- Nov 4-22, 2025: an earlier promotion gave Pro $250 and Max $1000 at API pricing, for Claude Code on the web and mobile only, also used before regular limits.
- Cloud sessions never required credits; these were bonuses on top of plan limits.
