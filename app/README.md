# App: Hardware Service Decision Copilot

Next.js 16 application built during the course. Requirements: [`../docs/PRD.md`](../docs/PRD.md). Architecture: [`../docs/ADR/`](../docs/ADR/). Plan: [`../docs/plans/hsdc-poc-implementation-plan.md`](../docs/plans/hsdc-poc-implementation-plan.md).

## Commands

Run in `app/` with pnpm (activated through Corepack).

```bash
pnpm install
cp ../.env.example .env.local   # then fill OPENROUTER_API_KEY
pnpm dev                        # http://localhost:3000
pnpm test                       # Vitest: unit + ui projects
pnpm test:e2e                   # Playwright on the production build, real OpenRouter (costs credits)
pnpm test:perf                  # TAC-06 timing check, run alone
pnpm verify                     # typecheck + lint + test + test:perf + build, before every commit
```

Playwright browsers: `pnpm exec playwright install chromium firefox webkit`.

## Checklist

### Project setup
- [x] Choose framework (Next.js, Express+Vite, Mastra, other) — record in ADR
- [x] Initialize project (e.g. `npx create-next-app@latest` or equivalent)
- [x] TypeScript config (`tsconfig.json`)
- [x] Package manager chosen (npm / pnpm / bun)

### Code quality
- [x] ESLint config (`eslint.config.js`)
- [x] Prettier config (`.prettierrc`, `.prettierignore`) — N/A, decided not to use Prettier (plan D12, U10)
- [ ] `.editorconfig` (optional but recommended)

### Testing
- [x] Unit/integration test runner (Vitest / Jest)
- [x] E2E test runner (Playwright)
- [x] Test setup file (e.g. `test-setup.ts` with Testing Library matchers)

### Environment
- [x] `.env.example` with required env vars (API keys, ports)
- [x] `.env.local` created locally in `app/` (gitignored)
- [x] `.gitignore` (node_modules, .env, build output, etc.)

### AI integration
- [x] Vercel AI SDK (`ai` package) or equivalent
- [x] API route / endpoint for chat (`/api/cases/{id}/chat`)
- [x] Model configuration (provider, model name, API key from env)

### Design
- [x] Design tokens (`../assets/design-tokens.json`)
- [x] Tailwind CSS or equivalent
- [x] Logo and favicon (`../assets/`)
- [x] Design system doc (`../docs/design-guidelines.md`)

### Documentation
- [x] PRD (`../docs/PRD.md`)
- [x] ADRs (`../docs/ADR/`)
- [x] AGENTS.md in `app/` with stack-specific rules

## Notes

- Don't create config files manually if the boilerplate provides them — it leads to conflicts.
- Keep this folder organized: separate routes, components, domain logic, and tests.
