# C4 Model — SST

## Purpose

C4 views for shared architecture understanding.

## Audience

Engineers, architects.

## Scope

MVP context, containers, components. Code-level optional.

## Definitions

C4: Context, Container, Component, Code.

---

## Level 1 — Context

```mermaid
flowchart LR
  Sales((Sales))
  TA((TA))
  HR((HR))
  Admin((Admin))
  SST[Service Staffing Tracker]
  Excel[(Legacy Excel files)]
  Sales --> SST
  TA --> SST
  HR --> SST
  Admin --> SST
  Admin -->|CSV import| SST
  SST -.->|one-time migration| Excel
```

## Level 2 — Containers

```mermaid
flowchart TB
  Web[SPA_apps_web]
  API[API_apps_api]
  DB[(PostgreSQL)]
  FS[LocalVolume]
  Mon[Prometheus_Grafana_Loki]
  Web --> API
  API --> DB
  API --> FS
  API --> Mon
```

| Container | Technology | Notes |
|-----------|------------|-------|
| Web | React Vite | Port 5173 |
| API | NestJS | Port 3000 |
| DB | PostgreSQL 16 | Port 5432 |
| Monitoring | Prom/Grafana/Loki | Local |

## Level 3 — API components

```mermaid
flowchart TB
  AuthMod[AuthModule]
  UserMod[UsersModule]
  MD[MasterDataModule]
  Req[RequirementsModule]
  Can[CandidatesModule]
  Off[OffersModule]
  Onb[OnboardingModule]
  Dash[DashboardModule]
  Aud[AuditModule]
  Imp[ImportModule]
  AuthMod --> UserMod
  Req --> MD
  Can --> Req
  Off --> Can
  Onb --> Off
  Dash --> Req
  Dash --> Can
  Dash --> Off
  Dash --> Onb
  Req --> Aud
  Can --> Aud
```

## Level 3 — Web components

- `app` shell (router, auth provider, query client)  
- `features/*` (dashboard, requirements, candidates, offers, onboarding, admin)  
- `shared/ui`, `shared/api`, `shared/lib`  

## Code (illustrative)

`RequirementsService.create` → `RequirementsRepository.insert` → Prisma `requirement.create` → `AuditService.record`.

## References

- [HIGH_LEVEL_ARCHITECTURE.md](./HIGH_LEVEL_ARCHITECTURE.md)  
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md)  
