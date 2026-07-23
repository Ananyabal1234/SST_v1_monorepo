# Cloud Migration Plan — SST

## Purpose

Step-by-step plan to move from local Docker Compose to production cloud when authorized.

## Audience

Cloud architects, DevOps, security, leadership.

## Scope

**Future** — not MVP execution. Assumes containerized app already works locally.

## Definitions

| Term | Definition |
|------|------------|
| Managed DB | Cloud PostgreSQL (e.g. RDS, Cloud SQL, Neon, Azure DB) |
| Registry | ECR/GHCR/Artifact Registry |

---

## 1. Prerequisites

- [ ] MVP stable locally  
- [ ] Migrations clean  
- [ ] Observability known-good  
- [ ] Backup tested  
- [ ] Security review of secrets/PII  

## 2. Infrastructure assessment

| Component | Local | Cloud target |
|-----------|-------|--------------|
| Compute | Compose | Containers on ECS/EKS/Cloud Run/ACI/ACA |
| DB | Postgres container | Managed PostgreSQL |
| Redis | Optional profile | Managed Redis |
| Files | Local volume | S3/Blob/GCS |
| Ingress | Host ports | LB + TLS |
| DNS | localhost | Corporate domain |
| Secrets | `.env` | Secrets Manager / Key Vault |
| CI | Build only | Build + deploy |

Pick one cloud provider at migration time; keep containers portable.

## 3. Docker image strategy

- Multi-stage builds; non-root user  
- Tag by git SHA + semver  
- Scan images in CI (Trivy)  

## 4. Container registry

Push `sst-api`, `sst-web` to private registry; immutable tags.

## 5. Managed PostgreSQL migration

1. Provision DB (Private subnet)  
2. `pg_dump` local → `pg_restore` / logical migration  
3. Run `prisma migrate deploy`  
4. Swap `DATABASE_URL`  
5. Verify row counts & auth login  

## 6. Redis migration

Enable when dashboard latency requires; use cache port already designed.

## 7. Secrets management

Move JWT, DB, SMTP to managed secrets; rotate on cutover.

## 8. Object storage migration

Replace local FS adapter with S3-compatible; migrate files if any.

## 9. Networking / DNS / SSL

- Public HTTPS via LB/CDN  
- Private DB (no public Postgres)  
- WAF optional  

## 10. Reverse proxy / load balancer / scaling

- LB → N api tasks  
- Autoscale on CPU/RPS  
- Web via CDN static hosting alternative  

## 11. Monitoring migration

- Remote_write Prometheus or cloud metrics  
- Hosted Grafana/Loki or vendor APM  
- Alert routes to on-call  

## 12. CI/CD changes

```text
CI → build/test → push images → deploy staging → smoke → approve → production
```

## 13. Rollback strategy

- Redeploy previous image digest  
- DB: forward-fix preferred; snapshot before migrate  

## 14. Cost estimation (order-of-magnitude)

| Item | Low env monthly |
|------|-----------------|
| Small managed DB | $30–150 |
| Container compute | $20–200 |
| LB + egress | variable |
| Observability | $0–100 |

Refine at provider selection.

## 15. Production readiness checklist

- [ ] TLS  
- [ ] Backups + restore drill  
- [ ] Secrets rotated  
- [ ] RBAC verified  
- [ ] Logging without PII leaks  
- [ ] Runbooks published  
- [ ] RPO/RTO agreed  

## Trade-offs

Lift-and-shift Compose to a single VM is fastest but weaker HA; prefer managed DB early even on small compute.

## References

- [../06-system-design/SCALABILITY.md](../06-system-design/SCALABILITY.md)  
- [../20-maintenance/SUPPORT_DR_INCIDENT.md](../20-maintenance/SUPPORT_DR_INCIDENT.md)  
- 12-Factor; CIS benchmarks  
