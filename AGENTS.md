# This is NOT the Next.js you know

This version (16.x) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notable Next 16 changes already encountered:
- `middleware.ts` is deprecated; use `proxy.ts`.
- `cookies()`, `headers()`, `draftMode()` are async — must `await`.
- Cache Components (`use cache` directive, `cacheComponents` config flag) is the sanctioned data-cache primitive; `unstable_cache` is legacy.
- Use `unstable_instant` route export for instant client-side navigations on stable post-load pages.
- Server Actions reject cross-origin POSTs unless the origin is in `serverActions.allowedOrigins`. Each app is served from its own domain (no shared parent subdomain); set `allowedOrigins` from that app's own public domain env var (`STOREFRONT_PUBLIC_DOMAIN` / `ADMIN_PUBLIC_DOMAIN`).

# currentDate
Today's date is 2026-06-07.
