# Non-Functional Requirements — SST

## Purpose

Define quality attributes for design and acceptance.

## Audience

Architects, engineers, QA, Ops.

## Scope

MVP runtime (local/Docker). Cloud NFRs deferred to [../19-cloud/CLOUD_MIGRATION_PLAN.md](../19-cloud/CLOUD_MIGRATION_PLAN.md).

## Definitions

| Term | Definition |
|------|------------|
| p95 | 95th percentile latency |
| RTO/RPO | Recovery time/point objectives |

---

## Categories

### Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | List endpoints (page size 50) p95 | < 300 ms local |
| NFR-PERF-02 | Dashboard aggregate p95 | < 500 ms with indexes |
| NFR-PERF-03 | SPA initial interactive (local) | < 3 s on mid hardware |

### Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-01 | Support concurrent users | 50 concurrent MVP |
| NFR-SCALE-02 | Data volume | 50k requirements, 200k candidates without redesign |
| NFR-SCALE-03 | Horizontal scale API | Stateless API containers |

### Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVL-01 | Local Compose healthchecks | api/web/db healthy |
| NFR-AVL-02 | Process crash restart | Compose `restart: unless-stopped` |

### Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-01 | All mutable APIs authenticated | 100% |
| NFR-SEC-02 | RBAC enforced server-side | 100% |
| NFR-SEC-03 | TLS for non-local production | Required later |
| NFR-SEC-04 | Secrets not in git | `.env` + CI secrets |
| NFR-SEC-05 | PII minimization in logs | Mask mobile/email |

### Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-REL-01 | DB migrations versioned | Prisma migrate |
| NFR-REL-02 | Backup (local) | Daily pg_dump documented |
| NFR-REL-03 | Idempotent import where possible | Dedupe keys |

### Observability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-OBS-01 | Structured JSON logs (Pino) | All services |
| NFR-OBS-02 | Metrics endpoint | Prometheus format |
| NFR-OBS-03 | Request correlation ID | Header + log field |

### Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-UX-01 | Dense ops tables with filters | Excel mental model |
| NFR-UX-02 | WCAG 2.2 AA for core flows | Must |
| NFR-UX-03 | Dark mode | Should |

### Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-MAIN-01 | TypeScript strict | On |
| NFR-MAIN-02 | Lint + typecheck in CI | Block merge |
| NFR-MAIN-03 | Unit coverage critical domains | ≥70% statements MVP |

### Portability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PORT-01 | Runs via Docker Compose on Windows/Mac/Linux | Must |
| NFR-PORT-02 | 12-factor config via env | Must |

## Trade-offs

Optimize clarity and correctness over micro-optimizations in MVP. Caching (Redis) deferred until measured need.

## References

- ISO 25010 quality model  
- OWASP ASVS  
- 12-Factor App  
