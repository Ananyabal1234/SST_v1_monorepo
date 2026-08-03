# Docker Compose — SST

## Purpose

Local and v1 production Compose layouts for Postgres, API, and web.

## Audience

DevOps, developers.

## Layouts

| File | Role |
|------|------|
| [`docker/docker-compose.yml`](../../docker/docker-compose.yml) | **Dev** — Postgres (+ optional observability profile). Run API/web with `pnpm dev`. |
| [`docker/docker-compose.prod.yml`](../../docker/docker-compose.prod.yml) | **v1 delivery** — Postgres + `sst-api` + `sst-web` (nginx). See [DEPLOY_V1.md](./DEPLOY_V1.md). |

## Dev (Postgres only)

```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

Host port **5433** → container `5432`. Optional: `--profile observability` for Prometheus/Grafana.

## Production Compose (v1)

Images: `sst-api:1.0.0`, `sst-web:1.0.0`  
Dockerfiles: `docker/api.Dockerfile`, `docker/web.Dockerfile`  
Env template: `docker/.env.prod.example`

```bash
cp docker/.env.prod.example docker/.env.prod
docker compose -f docker/docker-compose.prod.yml up -d --build
```

Full build, smoke, `docker save`/`load`, and rollback: **[DEPLOY_V1.md](./DEPLOY_V1.md)**.

## Networks

Prod services resolve by name (`postgres`, `api`, `web`). SPA uses relative `/api/v1`; nginx proxies `/api/` → `http://api:3000/api/`.

## Health checks

- API: `GET http://localhost:3000/health`
- Web: `GET http://localhost/`

## References

- [DEPLOY_V1.md](./DEPLOY_V1.md)
- [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- [../06-system-design/DEPLOYMENT.md](../06-system-design/DEPLOYMENT.md)
- [../18-monitoring/OBSERVABILITY.md](../18-monitoring/OBSERVABILITY.md)
