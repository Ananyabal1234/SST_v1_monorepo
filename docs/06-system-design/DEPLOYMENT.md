# Deployment Diagram — SST Local

## Purpose

Define local containerized deployment topology for Phase 1–2.

## Audience

DevOps, developers.

## Scope

Docker Compose local. Cloud separately documented.

## Definitions

| Service | Role |
|---------|------|
| `api` | NestJS |
| `web` | Nginx or Vite preview / dev |
| `postgres` | DB |
| `prometheus` / `grafana` / `loki` / `promtail` / `node-exporter` | Observability |

---

## Diagram

```mermaid
flowchart TB
  Dev[Developer_Browser]
  subgraph compose [Docker_Compose_Network]
    Web[web_5173]
    API[api_3000]
    PG[(postgres_5432)]
    Prom[prometheus_9090]
    Graf[grafana_3001]
    Loki[loki_3100]
    Promtail[promtail]
    NodeExp[node_exporter]
  end
  Dev --> Web
  Dev --> API
  Web --> API
  API --> PG
  Prom --> API
  Prom --> NodeExp
  Promtail --> Loki
  Graf --> Prom
  Graf --> Loki
```

## Communication

| From | To | Protocol |
|------|----|----------|
| Browser | Web | HTTP |
| Browser / Web | API | HTTP JSON |
| API | Postgres | TCP 5432 |
| Prometheus | API `/metrics` | scrape |
| Promtail | API logs volume | scrape files/docker logs |

## Volumes

- `pgdata` persistence  
- `api_uploads` local files  
- `grafana_data`, `prometheus_data`  

## Health checks

- API: `GET /health`  
- Postgres: `pg_isready`  
- Web: HTTP 200 on `/`  

## References

- [../17-local-deployment/DOCKER_COMPOSE.md](../17-local-deployment/DOCKER_COMPOSE.md)  
- [SCALABILITY.md](./SCALABILITY.md)  
