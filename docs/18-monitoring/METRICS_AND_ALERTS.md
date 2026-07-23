# Metrics & Alert Rules — SST

## Purpose

Specify metrics catalog and example alert rules for local/prod-ready design.

## Audience

DevOps, SRE-minded engineers.

## Scope

MVP local alerts (optional Alertmanager). Cloud alerting in migration plan.

## Definitions

| Golden signal | Meaning |
|---------------|---------|
| Latency | request duration |
| Traffic | RPS |
| Errors | 5xx rate |
| Saturation | CPU/mem/DB connections |

---

## Application metrics catalog

| Metric | Type | Labels |
|--------|------|--------|
| `http_request_duration_seconds` | histogram | method, route, status |
| `http_requests_total` | counter | method, route, status |
| `sst_login_failures_total` | counter | |
| `sst_imports_total` | counter | result |
| `process_resident_memory_bytes` | gauge | |

## Example alert rules

```yaml
groups:
  - name: sst-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.02
        for: 5m
        labels: { severity: page }
        annotations:
          summary: API error rate > 2%
      - alert: ApiDown
        expr: up{job="sst-api"} == 0
        for: 1m
```

## Business watches (Grafana)

- Spike in duplicate mobiles  
- Rising Red RAG count  
- Import failure ratio  

## References

- [OBSERVABILITY.md](./OBSERVABILITY.md)  
- Google Four Golden Signals  
