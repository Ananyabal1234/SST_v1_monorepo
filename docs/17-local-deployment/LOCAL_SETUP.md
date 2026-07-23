# Local Setup Guide — SST

## Purpose

Enable a developer to run SST locally from zero.

## Audience

Developers.

## Scope

Docker Compose primary path; optional native Node for api/web with Compose Postgres.

## Definitions

| Prerequisite | Version |
|--------------|---------|
| Node | 22 LTS |
| pnpm | 9+ |
| Docker | Recent Desktop/Engine |

---

## 1. Clone & install

```bash
git clone <repo-url>
cd Staffing_Tracker
cp .env.example .env
pnpm install
```

## 2. Start dependencies

```bash
docker compose -f docker/docker-compose.yml up -d postgres
# optional full stack:
docker compose -f docker/docker-compose.yml up -d
```

## 3. Database migrate & seed

```bash
pnpm --filter api prisma migrate dev
pnpm --filter api prisma db seed
```

## 4. Run apps (native)

```bash
pnpm --filter api dev
pnpm --filter web dev
```

Or turbo: `pnpm dev`

## 5. Verify

| Check | URL |
|-------|-----|
| Web | http://localhost:5173 |
| API health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| Grafana | http://localhost:3001 |

Login with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## 6. Local networking

- Web Vite proxies `/api` → `localhost:3000` (recommended) **or** CORS to 5173  
- Compose network name `sst_net`  

## 7. Local reverse proxy (optional)

Caddy/Nginx terminate `:8080` → web + `/api` → api for cookie domain simplicity.

## Troubleshooting

See [../21-guides/TROUBLESHOOTING_AND_FAQ.md](../21-guides/TROUBLESHOOTING_AND_FAQ.md).

## References

- [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md)  
- [SEED_AND_MIGRATION.md](./SEED_AND_MIGRATION.md)  
- [../13-monorepo/ENV_AND_VERSIONING.md](../13-monorepo/ENV_AND_VERSIONING.md)  
