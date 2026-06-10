# Ecommerce Monorepo

Production-grade ecommerce platform — Next.js 16, React 19, Prisma, PostgreSQL, Meilisearch, Razorpay, Cloudinary.

## Apps

- `apps/storefront` — customer-facing store (`store.localhost:3000` → `store.domain.com`)
- `apps/admin` — admin dashboard (`admin.localhost:3001` → `admin.domain.com`)

## Packages

- `@ecom/database` — Prisma schema, client, repositories
- `@ecom/shared` — zod schemas, money types, branded IDs, errors
- `@ecom/config` — env loader (zod-validated)
- `@ecom/auth` — auth provider abstraction (Auth.js for storefront, Clerk for admin)
- `@ecom/payments` — payment gateway abstraction (Razorpay impl)
- `@ecom/search` — Meilisearch abstraction
- `@ecom/analytics` — event ingest + reporting
- `@ecom/ui` — shadcn primitives + brand tokens
- `@ecom/email` — email provider abstraction (Console MVP)
- `@ecom/shipping` — shipping provider abstraction (Mock MVP)
- `@ecom/observability` — logger, OpenTelemetry hooks
- `@ecom/jobs` — background job queue abstraction

## Getting started

```bash
npm install
npm run dev
```

Storefront: http://store.localhost:3000
Admin: http://admin.localhost:3001

## Local infra

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Brings up Postgres 16, Redis 7, Meilisearch.
