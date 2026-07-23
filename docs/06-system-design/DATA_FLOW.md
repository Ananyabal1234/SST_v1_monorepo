# Data Flow Diagram — SST

## Purpose

Show how data moves through SST for pipeline operations and analytics.

## Audience

Architects, data engineers, backend.

## Scope

MVP. No external integrations beyond optional SMTP later.

## Definitions

| Store | Contents |
|-------|----------|
| PostgreSQL | SoR |
| Local FS | Import temp / future docs |
| Log stream | Pino → Promtail → Loki |

---

## Context DFD

```mermaid
flowchart LR
  U[Operators] -->|forms_filters| SPA
  SPA -->|JSON_REST| API
  API -->|SQL| PG[(PostgreSQL)]
  API -->|files| FS[(LocalFS)]
  API -->|logs_metrics| OBS[Observability]
  Admin[Admin] -->|CSV| API
```

## Level 1 — Pipeline writes

```mermaid
flowchart TD
  ReqIn[Requirement_Write] --> ReqT[requirement_table]
  CandIn[Candidate_Write] --> CandT[candidate_table]
  CandIn --> Dup[Duplicate_Check_Read]
  Dup --> CandT
  Sel[Selection] --> OfferIn[Offer_Write]
  OfferIn --> OffT[offer_table]
  Acc[Accept] --> OnbIn[Onboarding_Write]
  OnbIn --> OnbT[onboarding_table]
  OnbT --> Pos[Position_Recount]
  Pos --> ReqT
  ReqIn --> Audit[audit_log]
  CandIn --> Audit
  OfferIn --> Audit
  OnbIn --> Audit
```

## Dashboard read path

Filters → parameterized SQL aggregates → DTO → SPA charts/tables.

PII fields in logs must be masked (mobile/email).

## References

- [../07-database/ER_AND_SCHEMA.md](../07-database/ER_AND_SCHEMA.md)  
- [DEPLOYMENT.md](./DEPLOYMENT.md)  
