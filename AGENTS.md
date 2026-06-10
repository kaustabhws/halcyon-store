# This is NOT the Next.js you know

This version (16.x) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notable Next 16 changes already encountered:
- `middleware.ts` is deprecated; use `proxy.ts`.
- `cookies()`, `headers()`, `draftMode()` are async — must `await`.
- Cache Components (`use cache` directive, `cacheComponents` config flag) is the sanctioned data-cache primitive; `unstable_cache` is legacy.
- Use `unstable_instant` route export for instant client-side navigations on stable post-load pages.
- Server Actions across multiple subdomains require `serverActions.allowedOrigins`.

# currentDate
Today's date is 2026-06-07.
