<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# App: Hardware Service Decision Copilot (Next.js 16)

Stack-specific rules for `app/`. The root `AGENTS.md` holds the generic workflow (TDD, Manual QA, commits).

## Commands (run in `app/`, pnpm only)

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint, 0 warnings allowed |
| `pnpm test` | Vitest: projects `unit` (node) and `ui` (jsdom) |
| `pnpm test:perf` | TAC-06 timing check, run alone (project `perf`) |
| `pnpm test:e2e` | Playwright on the production build with real OpenRouter. Costs credits |
| `pnpm verify` | typecheck + lint + test + test:perf + build. **Run before every commit** |

pnpm is activated through Corepack in `~/.local/bin` (the VM user cannot write `/usr/bin`). Native build scripts are allowed in `pnpm-workspace.yaml` (`sharp`, `esbuild`).

## TypeScript (ADR-005 A20)

- No `any`. No type assertions (`as T`, `<T>x`), except `as const`.
- Narrow unknown data with zod parsing or type guards.
- Annotate exported function parameters and return types; local variables may use inference.
- Generated vendor code in `src/components/ui/` and `src/components/ai-elements/` is exempt.

## AI SDK v7

- Look up APIs with Context7 `/vercel/ai` (not `/websites/ai-sdk_dev`, which stops at v6).
- Do not use `toUIMessageStreamResponse`, `generateObject`, `streamObject` or `type: "image"` parts. `pnpm lint` fails on them (ADR-005 A14).
- Send images as `file` parts with `mediaType: "image/jpeg"`.

## Next.js

- Cache Components is on: route handlers must **not** export `runtime` or `maxDuration`.
- shadcn preset `base-nova` uses **Base UI**, not Radix: menu items fire `onClick` (no `onSelect`), and there is no `asChild` (use the `render` prop).
- AI Elements has no `loader` component any more; use `@/components/ui/spinner` for the typing indicator.

## Layout

- `src/lib/` shared client/server code (schemas, i18n strings, time). Imports nothing from `src/server/`.
- `src/server/` server-only code. Every module starts with `import "server-only";`.
- Prompts: `src/server/ai/prompts/`. Policies: `../docs/policies/` (`POLICY_DIR`).
- Captures of real API responses: `tests/fixtures/captures/` (index in its `README.md`). Mocks are derived only from these captures.
- Synthetic files for validation-only tests: `tests/fixtures/files/`. Real photos: `../assets/example-images/` (never modify, never describe them to the model).

## Environment

The app reads `app/.env.local` (gitignored), not the repo-root `.env`. Variables are listed in the root `.env.example`.
