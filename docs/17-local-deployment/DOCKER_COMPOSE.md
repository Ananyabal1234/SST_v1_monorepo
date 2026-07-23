# Docker Compose — SST

## Purpose

Document the Compose topology and example service definitions for local deployment.

## Audience

DevOps, developers.

## Scope

Example YAML for documentation (to be added under `docker/` when implementing).

## Definitions

| Service | Image role |
|---------|------------|
| postgres | DB |
| api | Nest build |
| web | Nginx static or Vite |
| redis | Future stub optional profile |
| prometheus, grafana, loki, promtail, node-exporter | Observability |

---

## Example compose (illustrative)

```yaml
name: sst
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sst
      POSTGRES_PASSWORD: sst
      POSTGRES_DB: sst
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sst"]
      interval: 5s
      retries: 10

  api:
    build:
      context: ..
      dockerfile: docker/api.Dockerfile
    env_file: ../.env
    ports: ["3000:3000"]
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: ..
      dockerfile: docker/web.Dockerfile
    ports: ["5173:80"]
    depends_on: [api]

  prometheus:
    image: prom/prometheus:v2.54.0
    volumes: [./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml]
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:11.1.0
    ports: ["3001:3000"]
    volumes: [grafana_data:/var/lib/grafana]

  loki:
    image: grafana/loki:3.0.0
    ports: ["3100:3100"]

  promtail:
    image: grafana/promtail:3.0.0
    volumes: [./promtail/config.yml:/etc/promtail/config.yml, /var/run/docker.sock:/var/run/docker.sock]

  node-exporter:
    image: prom/node-exporter:v1.8.1
    pid: host

  redis:
    image: redis:7-alpine
    profiles: ["redis"]
    ports: ["6379:6379"]

volumes:
  pgdata:
  grafana_data:
```

## Networks

Default Compose network; services resolve by service name (`postgres`, `api`).

## Health checks

Wire API `HEALTHCHECK curl -f http://localhost:3000/health`.

## Recommendations

Use Compose `profiles` for monitoring vs core, so lite `postgres+api+web` is fast.

## References

- [LOCAL_SETUP.md](./LOCAL_SETUP.md)  
- [../06-system-design/DEPLOYMENT.md](../06-system-design/DEPLOYMENT.md)  
- [../18-monitoring/OBSERVABILITY.md](../18-monitoring/OBSERVABILITY.md)  
