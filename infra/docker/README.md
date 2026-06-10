# Local development

## First-time setup

```bash
# 1. Boot infra (Postgres + Redis + Meilisearch)
docker compose -f infra/docker/docker-compose.yml up -d

# 2. Copy env templates
cp .env.shared.example .env.shared
cp apps/storefront/.env.example apps/storefront/.env.local
cp apps/admin/.env.example apps/admin/.env.local

# 3. Install
npm install

# 4. Push schema + seed demo catalog
npm run db:push
npm run db:seed

# 5. Run both apps
npm run dev
```

## URLs

- Storefront: http://store.localhost:3000
- Admin:      http://admin.localhost:3001

`*.localhost` is treated as loopback automatically by modern browsers — no
hosts-file edits required on Windows 10+, macOS, or Linux. If your browser
balks, add to your hosts file:

```
127.0.0.1 store.localhost admin.localhost
```

## Database

```bash
# Apply schema without a migration (dev only)
npm run db:push

# Seed demo catalog (sneakers + watches + headphones)
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Create + run a migration
npm run db:migrate
```

The `DATABASE_URL` in `.env.shared` must point to a running Postgres before
any of these commands work. The compose file maps Postgres on `localhost:5432`
with credentials `ecom / ecom / ecom`.

## One app at a time

```bash
npm run dev:storefront
npm run dev:admin
```

## Reset infra

```bash
docker compose -f infra/docker/docker-compose.yml down -v
```
