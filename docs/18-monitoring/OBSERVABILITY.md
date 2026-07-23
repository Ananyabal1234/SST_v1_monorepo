# Observability — SST

## Purpose

Define logging, metrics, and local observability stack usage.

## Audience

DevOps, backend engineers.

## Scope

Local Prometheus, Grafana, Loki, Promtail, Node Exporter + app instrumentation.

## Definitions

| Signal | Tool |
|--------|------|
| Metrics | Prometheus |
| Logs | Loki via Promtail |
| Dashboards | Grafana |
| Host metrics | Node Exporter |

---

## 1. Structured logging

Pino JSON fields:

| Field | Meaning |
|-------|---------|
| level | info/warn/error |
| time | epoch |
| context | Nest context |
| correlationId | request id |
| method/path/status/durationMs | HTTP |

Redact PII tokens.

## 2. Metrics (application)

Expose `/metrics` (prom-client):

- `http_request_duration_seconds` histogram  
- `http_requests_total` counter  
- `nodejs_*` defaults  
- business: `sst_requirements_total`, `sst_candidates_selected_total` (optional)

## 3. Health endpoints

| Path | Meaning |
|------|---------|
| `/health` | process up |
| `/ready` | DB ping ok |

## 4. Prometheus scrape

```yaml
scrape_configs:
  - job_name: sst-api
    static_configs:
      - targets: ['api:3000']
  - job_name: node
    static_configs:
      - targets: ['node-exporter:9100']
```

## 5. Loki + Promtail

Promtail ships Docker container logs to Loki; Grafana explores `{compose_service="api"}`.

## 6. Grafana dashboards

Import:

- Node exporter full  
- Custom SST API golden signals (latency, error rate, traffic)  
- Business KPI panel from Prometheus business metrics  

## 7. Performance monitoring

Watch dashboard endpoint p95; alert if error ratio > 2% over 5m (local alertmanager optional).

## References

- [METRICS_AND_ALERTS.md](./METRICS_AND_ALERTS.md)  
- [../17-local-deployment/DOCKER_COMPOSE.md](../17-local-deployment/DOCKER_COMPOSE.md)  
