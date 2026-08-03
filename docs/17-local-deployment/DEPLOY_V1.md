# SST v1 — Docker production Compose

Build and run `sst-api` / `sst-web` with Postgres for team handoff. No cloud registry required.

## Prerequisites

- Docker Desktop (or Engine + Compose v2)
- Ports free: **80** (web), **3000** (API), **5433** (Postgres host mapping)
- If local `pnpm` Postgres (`docker/docker-compose.yml` / `sst-postgres`) is already on 5433, stop it first or change the host port in `docker-compose.prod.yml`

## 1. Env file

```bash
cp docker/.env.prod.example docker/.env.prod
# Edit JWT_* secrets (min 32 chars). Leave SEED_* unset.
```

## 2. Build images

From the **monorepo root**:

```bash
docker compose -f docker/docker-compose.prod.yml build
```

Tags: `sst-api:1.0.0`, `sst-web:1.0.0` (Compose `image:` fields).

## 3. Start stack

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

On first API start, `docker/api-entrypoint.sh` runs `prisma migrate deploy` (non-destructive), then starts Nest. **Seed is not auto-run.**

| Service | URL |
|---------|-----|
| Web | http://localhost |
| API health | http://localhost:3000/health (or http://localhost/health via nginx) |
| API (direct) | http://localhost:3000/api/v1 |
| SPA → API (proxied) | http://localhost/api/v1/... |

If host port 3000 is already in use (e.g. `pnpm dev`), start with `API_HOST_PORT=3001` (PowerShell: `$env:API_HOST_PORT=3001`).

## 4. Smoke checks

```bash
curl -sf http://localhost:3000/health
curl -sf -o /dev/null -w "%{http_code}\n" http://localhost/
# Expect health JSON with status ok; web HTTP 200
```

Open http://localhost and confirm the login page. Full Product journey: [12-ui-uat-j1-j3.md](../15-testing/v1-catalog/12-ui-uat-j1-j3.md).

## 5. First admin (greenfield)

Prod entrypoint does **not** seed. Options:

1. **One-off seed (demo only)** — after stack is healthy, from monorepo with `DATABASE_URL` pointing at `localhost:5433` and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` set:

   ```bash
   pnpm --filter @sst/api prisma:seed
   ```

2. Or create the first user via a controlled ops process once an admin bootstrap path exists.

Do not bake demo passwords into images.

## 6. Offline handoff (`docker save` / `load`)

On the build machine:

```bash
docker compose -f docker/docker-compose.prod.yml build
docker save sst-api:1.0.0 sst-web:1.0.0 -o sst-v1-images.tar
```

Give the receiving team:

- `sst-v1-images.tar`
- `docker/docker-compose.prod.yml`
- `docker/.env.prod.example` (they create `.env.prod`)
- this runbook

On the target machine:

```bash
docker load -i sst-v1-images.tar
cp docker/.env.prod.example docker/.env.prod
# edit secrets
docker compose -f docker/docker-compose.prod.yml up -d
# Postgres still pulls `postgres:16-alpine` from Docker Hub unless cached.
```

Optional next step (out of v1 scope): push `sst-api` / `sst-web` to GHCR/ECR.

## 7. Logs & stop

```bash
docker compose -f docker/docker-compose.prod.yml logs -f api
docker compose -f docker/docker-compose.prod.yml down
# Keep DB volume: omit -v. Wipe DB: add -v (destructive).
```

## 8. Rollback

1. Keep previous tags, e.g. rebuild as `sst-api:1.0.0` only after retagging current:

   ```bash
   docker tag sst-api:1.0.0 sst-api:1.0.0-backup
   docker tag sst-web:1.0.0 sst-web:1.0.0-backup
   # rebuild new 1.0.0 or load older tar
   ```

2. To roll back: `docker tag sst-api:1.0.0-backup sst-api:1.0.0` (same for web), then:

   ```bash
   docker compose -f docker/docker-compose.prod.yml up -d
   ```

3. Prefer **forward-only** Prisma migrations. Do not restore an older API image against a DB that already applied newer migrations without a tested down path.

## Related

- Dev Postgres only: [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md) + `docker/docker-compose.yml`
- Local pnpm: [LOCAL_SETUP.md](./LOCAL_SETUP.md)
