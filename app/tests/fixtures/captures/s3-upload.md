# S3 capture: 10 MB multipart upload to a route handler

- Date: 2026-11-26
- Next.js: 16.4.6 (`app/package.json`), Cache Components on, no `proxy.ts`/middleware, no `runtime` export, no `next.config` body-size options.
- Route (temporary, deleted): `POST /api/spike-upload`, `await request.formData()`, `form.get("photo")` -> `{ ok, size, contentLength }`.
- Request: Node `fetch` with `FormData` + `Blob` (type `image/jpeg`), field `photo`, filename `big.jpg`; content starts with `FF D8 FF E0`, rest zeros. Run twice.

## Mode: dev (`pnpm dev --port 3001`)

| Payload bytes | Status | Body | Elapsed run 1 / run 2 |
|---|---|---|---|
| 10 485 760 | 200 | `{"ok":true,"size":10485760,"contentLength":"10485930"}` | 2188 ms (cold compile) / 879 ms |
| 10 485 761 | 200 | `{"ok":true,"size":10485761,"contentLength":"10485931"}` | 366 ms / 310 ms |
| 12 582 912 (12 MB) | 200 | `{"ok":true,"size":12582912,"contentLength":"12583082"}` | 466 ms / 277 ms |

## Mode: start

Not checked: `pnpm typecheck` was red at that moment because of concurrent work (`src/lib/**` tests importing modules not yet written), so `pnpm build` was not run.

## Verdict

- 10 MB reaches the handler: yes (dev). Full `File.size` is intact.
- Any limit found: none up to 12 MB in dev. Multipart overhead is about 170 bytes (`content-length` = payload + 170), so an app limit of exactly 10 MiB must be enforced on `File.size` in the handler, not on `content-length`.
- Config needed: none for dev with no proxy/middleware. Production `start` is unverified; Next's 10 MB body buffer limit applies only to `proxy.ts`/middleware, so do not add one on `/api/**` upload paths without re-testing. Re-check in `pnpm start` during E2E.
