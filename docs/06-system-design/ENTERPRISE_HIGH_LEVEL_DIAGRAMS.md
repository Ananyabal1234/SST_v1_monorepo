# Enterprise High-Level Architecture Diagrams — SST

## Purpose

Clean, enterprise-grade **visual pack** for Service Staffing Tracker (SST) MVP. Each figure has one zoom level, labeled edges, and a short caption for presentations or architecture reviews.

## Audience

Architects, Team Leads, senior engineers, DevOps, stakeholders who need a board-room-ready system view.

## Scope

**As-is MVP:** React SPA + NestJS modular monolith + PostgreSQL system of record.  
**Optional (dashed):** SMTP, Prometheus/Grafana/Loki.  
**Out of scope on these boards:** microservices, Redis as required runtime, BFF, SSO, cloud multi-region.

## How to use

| Figure | Zoom | Use when |
|-------|------|----------|
| Fig 1 | Context | Executive / product intro |
| Fig 2 | Containers | **Primary HLA** for engineering reviews |
| Fig 3 | Domain pipeline | Business architecture |
| Fig 4 | API components | Modular monolith seams |
| Fig 5 | API layers | Code structure / clean architecture |
| Fig 6 | Monorepo | Repo ownership |
| Fig 7 | Request path | Security & data path |
| Fig 8 | Deployment | Local vs Compose topology |

**Render:** GitHub / Cursor Mermaid preview, or paste into [mermaid.live](https://mermaid.live).

---

## Legend (apply to all figures)

| Element | Meaning |
|---------|---------|
| Solid arrow | Critical path dependency / control |
| Dashed arrow | Optional or migration path |
| Person node | Human role |
| Rounded box | Software system or process |
| Rectangle with tech subtitle | Deployable container / app |
| Cylinder | Data store |
| Grey / optional subgraph | Not required for core CRUD |

| Protocol shorthand | Meaning |
|--------------------|---------|
| HTTPS REST + JWT | JSON API with Bearer access token |
| Prisma/SQL | Nest API → PostgreSQL via Prisma |
| SMTP | Optional outbound mail |

---

## Fig 1 — System context (C4 Level 1)

**Caption:** SST sits between hiring roles and a small set of external systems. Users interact with one product surface; Excel is a migration/import bridge, not the live SoR.

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

| Actor | Primary interest |
|-------|------------------|
| Sales | Requirement intake and ownership |
| TA | Candidate pipeline and selection |
| HR | Offers and onboarding |
| Admin | Users, masters, import, audit |
| Leadership | Dashboards (typically read-only) |

---

## Fig 2 — Container architecture (C4 Level 2) — primary HLA

**Caption:** One SPA, one modular-monolith API, one PostgreSQL system of record. The SPA never talks to the database. Optional mail and observability sit beside the critical path.

```mermaid
flowchart TB
  User((User))

  subgraph client [Trust zone - Browser]
    SPA["Web SPA<br/>React · Vite<br/>apps/RecuirementDashboard"]
  end

  subgraph server [Trust zone - Application runtime]
    API["API · Modular monolith<br/>NestJS · Prisma · JWT / RBAC<br/>apps/api<br/>/api/v1 · Swagger /api/docs"]
    PG[("PostgreSQL<br/>System of record")]
    FS["Local file storage<br/>(optional port)"]
  end

  subgraph optional [Optional integrations]
    SMTP["Company SMTP"]
    Prom["Prometheus"]
    Graf["Grafana"]
    Loki["Loki"]
  end

  User -->|"HTTPS"| SPA
  SPA -->|"HTTPS REST + JWT Bearer"| API
  API -->|"Prisma / SQL"| PG
  API --> FS
  API -.->|"nodemailer"| SMTP
  Prom -.->|"scrape /metrics"| API
  Prom --> Graf
  API -.-> Loki
```

| Container | Technology | Responsibility |
|-----------|------------|----------------|
| Web SPA | React, Vite, TanStack Query | Role-aware UI; calls API only |
| API | NestJS, Prisma, Passport/JWT | Business rules, RBAC, audit, OpenAPI |
| PostgreSQL | PostgreSQL 16 | Authoritative data (SoR) |
| Local files | Disk port | Attachments / local storage when used |
| SMTP / metrics | Optional | Mail and ops observability |

| Typical local ports | |
|---------------------|--|
| SPA | `5173` |
| API | `3000` (`/health`, `/api/docs`, `/api/v1/*`) |
| PostgreSQL | host often `5433` → container `5432` |

**Architectural decisions on this board**

| Decision | Statement |
|----------|-----------|
| Style | Modular monolith (not microservices) |
| Client integration | SPA → API directly (no BFF) |
| Integration style | Synchronous REST/JSON |
| Persistence | Single PostgreSQL SoR |

---

## Fig 3 — Business domain pipeline

**Caption:** Runtime architecture follows the hiring pipeline. Master data, identity, dashboard, and audit wrap the sequential staffing flow.

```mermaid
flowchart LR
  subgraph identity [Identity]
    Users[Users]
    Auth[Auth JWT]
  end

  subgraph catalog [Master data]
    Clients[Clients]
    Lists[Lookup lists]
  end

  subgraph pipeline [Staffing pipeline]
    R[Requirements]
    C[Candidates]
    O[Offers]
    N[Onboarding]
    R --> C --> O --> N
  end

  subgraph platform [Platform]
    Dash[Dashboard]
    Audit[Audit]
  end

  identity --> pipeline
  catalog --> pipeline
  pipeline --> Dash
  pipeline --> Audit
```

```text
Requirement → Candidates → Offer → Onboarding → Join / Close seats
```

---

## Fig 4 — API modular monolith (C4 Level 3)

**Caption:** One NestJS process, domain-bounded modules. Deploy once; keep module folders independent.

```mermaid
flowchart TB
  subgraph cross [Cross-cutting]
    Guards["JWT · RolesGuard"]
    Valid["Validation · Filters"]
    Logging["Pino logging · Config"]
    AuditX["Audit writes"]
  end

  subgraph domain [Domain modules]
    Auth[Auth]
    Users[Users]
    MD[MasterData]
    Req[Requirements]
    Can[Candidates]
    Off[Offers]
    Onb[Onboarding]
    Dash[Dashboard]
    Imp[Import]
    Health[Health / metrics]
  end

  PG[("PostgreSQL")]

  cross -.-> domain
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
  Req --> AuditX
  Can --> AuditX
  domain --> PG
```

| Module group | Modules |
|--------------|---------|
| Access | Auth, Users |
| Catalog | MasterData |
| Pipeline | Requirements, Candidates, Offers, Onboarding |
| Insights | Dashboard |
| Platform | Import, Audit (cross-cutting), Health |

---

## Fig 5 — API logical layers (clean architecture)

**Caption:** HTTP is the edge; business rules live in services; persistence is isolated behind repositories.

```mermaid
flowchart TB
  HTTP["Controllers<br/>REST /api/v1"]
  APP["Application services<br/>use cases / orchestration"]
  DOM["Domain services<br/>SLA · derived rules"]
  REPO["Repositories<br/>Prisma adapters"]
  DB[("PostgreSQL")]

  XCUT["Guards · Interceptors · Pipes · Filters"]

  HTTP --> APP --> DOM --> REPO --> DB
  XCUT -.-> HTTP
  XCUT -.-> APP
```

```text
Controllers → Application services → Domain / pure calculators → Repositories (Prisma) → DB
```

---

## Fig 6 — Monorepo structure

**Caption:** One repository versions UI, API, shared contracts, Docker, and docs together (Turborepo + pnpm).

```mermaid
flowchart TB
  Root["SST_v1_monorepo"]

  Root --> Apps["apps/"]
  Root --> Pkgs["packages/"]
  Root --> Docker["docker/"]
  Root --> Docs["docs/"]

  Apps --> SPA["RecuirementDashboard<br/>React SPA"]
  Apps --> API["api<br/>NestJS"]

  Pkgs --> ST["shared-types"]
  Pkgs --> SU["shared-utils"]
  Pkgs --> TS["typescript-config"]

  API --> ST
  API --> SU
  SPA -.-> ST
```

**Dependency rule:** apps depend on packages; apps do not import each other.

---

## Fig 7 — End-to-end request path (security + data)

**Caption:** Every protected business action is SPA → JWT/RBAC → service rules → Prisma → PostgreSQL. Dashboard and lists are the same path with read-focused services.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant SPA as React SPA
  participant API as NestJS API
  participant G as JWT + RBAC
  participant S as Domain service
  participant DB as PostgreSQL

  U->>SPA: Action (save / open list)
  SPA->>API: HTTPS REST + Bearer token
  API->>G: Validate identity and role
  G->>S: Authorized use case
  S->>DB: Prisma read / write
  DB-->>S: Result
  S-->>SPA: JSON (+ audit side effect when required)
  SPA-->>U: Updated UI
```

---

## Fig 8 — Deployment topology (MVP)

### 8a — Local development

```mermaid
flowchart LR
  Dev[Developer machine]
  SPA["Vite SPA :5173"]
  API["Nest API :3000"]
  PG[("Postgres<br/>host :5433")]

  Dev --> SPA
  Dev --> API
  SPA -->|"HTTP / proxy"| API
  API --> PG
```

### 8b — Production-style Docker Compose

```mermaid
flowchart TB
  User((Browser))

  subgraph compose [docker-compose style stack]
    Web["sst-web<br/>nginx :80<br/>static SPA + /api reverse proxy"]
    API["sst-api<br/>Nest :3000"]
    PG[("postgres")]
    Web -->|"/api/*"| API
    API --> PG
  end

  User -->|"HTTPS / HTTP"| Web
```

---

## One-page summary board (combine for a poster)

Use **Fig 2** as the centerpiece, **Fig 3** as a strip under it, **Fig 1** actors on the left.

```text
┌─ Actors ─┐     ┌──────── Container HLA ────────┐     ┌─ Optional ─┐
│ Sales    │────▶│ SPA ──REST+JWT──▶ Nest API     │····▶│ SMTP      │
│ TA       │     │                    │           │····▶│ Metrics   │
│ HR       │     │                    ▼           │     └───────────┘
│ Admin    │     │              PostgreSQL (SoR)  │
│ Leader   │     └────────────────────────────────┘
└──────────┘
              Requirement → Candidate → Offer → Onboarding
```

**Poster footer (recommended wording):**

> **SST MVP High-Level Architecture.** A React SPA authenticates users and consumes a NestJS modular-monolith REST API protected by JWT and RBAC. The API persists staffing pipeline and master data via Prisma to PostgreSQL (system of record). Optional integrations: company SMTP and metrics scrape. No BFF, no microservice mesh, no required Redis in MVP.

---

## Accuracy notes (as-is)

| Topic | Use this |
|-------|----------|
| Web folder | `apps/RecuirementDashboard` |
| API folder | `apps/api` |
| Shared libs | `packages/shared-types`, `packages/shared-utils` |
| Core path | SPA → REST + JWT → Nest → Prisma → PostgreSQL |
| Optional | SMTP, Prometheus/Grafana/Loki |
| Not MVP runtime | Redis, WebSocket bus, BFF, microservices per domain |

---

## References

- [HIGH_LEVEL_ARCHITECTURE.md](./HIGH_LEVEL_ARCHITECTURE.md) — narrative HLA  
- [C4_MODEL.md](./C4_MODEL.md) — C4 index  
- [BEGINNER_HIGH_LEVEL_ARCHITECTURE.md](./BEGINNER_HIGH_LEVEL_ARCHITECTURE.md) — plain-language guide  
- [BEGINNER_ARCHITECTURE_DIAGRAMS.md](./BEGINNER_ARCHITECTURE_DIAGRAMS.md) — onboarding talk track  
- [SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md)  
- ADR-0002 — modular monolith: [../14-standards/adr/0002-modular-monolith.md](../14-standards/adr/0002-modular-monolith.md)  
