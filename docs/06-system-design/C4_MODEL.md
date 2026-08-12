# C4 Model — SST

## Purpose

C4 views for shared architecture understanding. For presentation-ready, labeled enterprise boards, prefer **[ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md)**.

## Audience

Engineers, architects.

## Scope

MVP context, containers, components. Code-level optional.

## Definitions

C4: Context, Container, Component, Code.

---

## Level 1 — Context

> Full version with captions: [ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md — Fig 1](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md#fig-1--system-context-c4-level-1)

```mermaid
flowchart TB
  subgraph actors [Actors]
    Sales((Sales))
    TA((TA))
    HR((HR))
    Admin((Admin))
    Lead((Leadership))
  end

  SST["Service Staffing Tracker<br/>SST MVP"]

  subgraph external [External systems]
    Excel[("Legacy Excel / CSV")]
    SMTP["Company SMTP<br/>(optional)"]
  end

  Sales --> SST
  TA --> SST
  HR --> SST
  Admin --> SST
  Lead --> SST
  Admin -->|"CSV import"| SST
  SST -.->|"migration bridge"| Excel
  SST -.->|"optional email"| SMTP
```

## Level 2 — Containers

> Full version with ports and decisions: [ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md — Fig 2](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md#fig-2--container-architecture-c4-level-2--primary-hla)

```mermaid
flowchart TB
  User((User))

  subgraph client [Trust zone - Browser]
    SPA["Web SPA<br/>React · Vite<br/>apps/RecuirementDashboard"]
  end

  subgraph server [Trust zone - Application runtime]
    API["API · Modular monolith<br/>NestJS · Prisma · JWT / RBAC<br/>apps/api"]
    PG[("PostgreSQL<br/>System of record")]
    FS["Local file storage<br/>(optional)"]
  end

  subgraph optional [Optional]
    SMTP["SMTP"]
    Metrics["Prometheus / Grafana / Loki"]
  end

  User -->|"HTTPS"| SPA
  SPA -->|"HTTPS REST + JWT"| API
  API -->|"Prisma / SQL"| PG
  API --> FS
  API -.-> SMTP
  Metrics -.->|"/metrics"| API
```

| Container | Technology | Notes |
|-----------|------------|-------|
| Web SPA | React + Vite | `apps/RecuirementDashboard` · port 5173 |
| API | NestJS + Prisma | `apps/api` · port 3000 · `/api/v1` |
| Database | PostgreSQL 16 | System of record |
| Monitoring | Prom / Grafana / Loki | Optional |
| SMTP | Company SMTP | Optional |

## Level 3 — API components

> Full modular monolith board: [ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md — Fig 4](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md#fig-4--api-modular-monolith-c4-level-3)

```mermaid
flowchart TB
  subgraph domain [NestJS modular monolith]
    Auth[Auth]
    Users[Users]
    MD[MasterData]
    Req[Requirements]
    Can[Candidates]
    Off[Offers]
    Onb[Onboarding]
    Dash[Dashboard]
    Imp[Import]
    Health[Health]
  end

  PG[(PostgreSQL)]
  Auth --> Users
  Req --> MD
  Can --> Req
  Off --> Can
  Onb --> Off
  Dash --> Req
  Dash --> Can
  Dash --> Off
  Dash --> Onb
  Imp --> Req
  domain --> PG
```

## Level 3 — Web components

- `app` shell (router, auth provider, query client)  
- `features/*` (dashboard, requirements, candidates, offers, onboarding, admin)  
- `shared/ui`, `shared/api`, `shared/lib`  

## Code (illustrative)

`RequirementsService.create` → `RequirementsRepository.insert` → Prisma `requirement.create` → `AuditService.record`.

## References

- [ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md](./ENTERPRISE_HIGH_LEVEL_DIAGRAMS.md) — **enterprise diagram pack (recommended)**  
- [BEGINNER_ARCHITECTURE_DIAGRAMS.md](./BEGINNER_ARCHITECTURE_DIAGRAMS.md) — beginner talk track  
- [BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./BEGINNER_HIGH_LEVEL_ARCHITECTURE.md)  
- [HIGH_LEVEL_ARCHITECTURE.md](./HIGH_LEVEL_ARCHITECTURE.md)  
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md)  
