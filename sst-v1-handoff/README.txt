SST v1 Docker handoff
=====================

Contents
- sst-v1-images.tar          sst-api:1.0.0 + sst-web:1.0.0
- docker/docker-compose.prod.yml
- docker/.env.prod.example
- docs/DEPLOY_V1.md          full runbook

Prerequisites
- Docker Desktop (Compose v2)
- Free ports: 80, 3000, 5433
- Internet once (or cached) for postgres:16-alpine

Quick start (from this folder)
1. docker load -i sst-v1-images.tar
2. copy docker\.env.prod.example docker\.env.prod
3. Edit docker\.env.prod — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (min 32 chars)
4. docker compose -f docker/docker-compose.prod.yml up -d
5. Open http://localhost
   Health: http://localhost:3000/health

Notes
- Seed is NOT auto-run. See docs/DEPLOY_V1.md section 5 for first admin / demo seed.
- Do not commit or share a filled .env.prod with real secrets.
