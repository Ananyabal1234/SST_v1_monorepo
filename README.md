# Staffing Tracker (SST)

Greenfield MVP: NestJS API + React/Vite SPA in a Turborepo monorepo.

## Quick start

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d postgres
pnpm install
pnpm --filter @sst/shared-types build
pnpm --filter @sst/shared-utils build
pnpm --filter @sst/api prisma:generate
pnpm --filter @sst/api exec prisma migrate dev --name init
pnpm --filter @sst/api prisma:seed
pnpm dev
```

Postgres is published on **host port 5433** (avoids clashes with other local Postgres instances). `DATABASE_URL` in `.env.example` already points at `localhost:5433`.

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |

Seed login: `admin@sst.local` / `ChangeMeNow!`

Also seeded: `sales@sst.local`, `ta@sst.local`, `hr@sst.local` (same password).

## Design tokens

Palette lives in `apps/web/src/styles/index.css` (`:root` / `.dark`). Change CSS variables to retheme without touching components.
