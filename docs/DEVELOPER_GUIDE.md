# Developer Guide — Service Staffing Tracker

## Purpose

Day-1 handbook for engineers implementing SST from scratch using only the `docs/` tree.

## Audience

Backend, frontend, full-stack, and platform engineers.

**New to Node.js or NestJS?** Start with the one-stop implementation handbook: [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md).

## Scope

| In scope | Out of scope |
|----------|--------------|
| MVP build path (hiring pipeline) | Implementing Future workforce modules |
| Local Docker-first development | Production cloud deploy (see `19-cloud`) |
| How docs map to code | — |

## Definitions

See [README.md](./README.md#definitions).

---

## 1. What you are building (MVP)

Digitize the Excel staffing workbook into a web app:

```text
Requirement Intake → TA Candidate Pipeline → Offer & Selection → HR Onboarding
                              ↓
                    Dashboard + Master Data
                              ↓
              Auth (JWT) + RBAC + Audit Logs
```

**Do not build in MVP:** Bench, Skills Matrix, Capacity, Availability, Assignments, Workload. See [04-domain/FUTURE_MODULES.md](./04-domain/FUTURE_MODULES.md).

### Excel mapping cheat sheet

| Excel sheet | App area |
|-------------|----------|
| Requirement Intake | Requirements feature + API |
| TA Candidate Pipeline | Candidates feature + API |
| Offer & Selection | Offers feature + API |
| HR Onboarding | Onboarding feature + API |
| Setup Lists | Master data / admin |
| Dashboard | Dashboard KPIs + filters |

---

## 2. Recommended first week

| Day | Activity | Docs |
|-----|----------|------|
| 1 | Read Vision, PRD, Domain model | `00`, `03`, `04` |
| 2 | Monorepo + NestJS + React architecture | `13`, `08`, `09` |
| 3 | Database + Prisma design | `07` |
| 4 | API catalog + Auth/RBAC | `10`, `11` |
| 5 | Scaffold monorepo per `13-monorepo`; local Compose per `17` | `13`, `17` |
| 6–7 | Implement Auth + Master Data + Requirements (Milestone 1) | `12-planning` ([TEAM_SPRINT_PLAN.md](./12-planning/TEAM_SPRINT_PLAN.md)) |

---

## 3. Target monorepo (preview)

```text
/
├── apps/
│   ├── web/                 # Vite React SPA
│   └── api/                 # NestJS API
├── packages/
│   ├── shared-types/        # Zod schemas & DTOs shared
│   ├── shared-utils/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/                  # Optional shared ShadCN wrappers
├── docs/                    # This documentation
├── docker/                  # Compose, monitoring stack
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

Full detail: [13-monorepo/MONOREPO_STRUCTURE.md](./13-monorepo/MONOREPO_STRUCTURE.md).

---

## 4. Core business rules engineers must not break

1. A **Candidate** always belongs to a **Requirement** (`Req ID`).
2. An **Offer** is created only when `Selected? = Yes` and Candidate ID exists.
3. **Onboarding** starts only after Offer status = Accepted.
4. Open/Closed position counts derive from requirement `Number Of Positions` and selected/joined outcomes — not free-typed contradictions.
5. Duplicate mobile/email must be detectable (server-side enforcement for MVP).
6. SLA RAG for TA handoff: ≤2 days Green, ≤5 Amber, else Red (when handoff empty; see Business Rules for full formula parity).
7. Soft-delete preferred; mutate through audit-logged services.

Full rules: [01-business-analysis/BUSINESS_RULES.md](./01-business-analysis/BUSINESS_RULES.md).

---

## 5. Roles (MVP)

| Role | Typical access |
|------|----------------|
| `ADMIN` | Full CRUD + master data + users |
| `SALES` | Create/update requirements; view pipeline |
| `TA` | Candidates, selection; update req TA fields |
| `HR` | Offers post-selection, onboarding |
| `LEADERSHIP_READONLY` | Dashboards and reports |

Permission matrix: [11-security/PERMISSION_MATRIX.md](./11-security/PERMISSION_MATRIX.md).

---

## 6. Implementation checklist (MVP)

Use this as the build backlog root; stories live in planning docs.

- [ ] Turborepo + pnpm workspace
- [ ] PostgreSQL + Prisma schema (per `07`)
- [ ] NestJS modules: Auth, Users, MasterData, Requirements, Candidates, Offers, Onboarding, Dashboard, Audit
- [ ] JWT access + refresh; guards; RBAC
- [ ] React app: login, layout, feature routes, TanStack Query
- [ ] Dashboard KPIs parity with Excel
- [ ] Seed data from Excel sample rows
- [ ] Docker Compose: api, web, postgres, (optional redis stub), monitoring
- [ ] CI: lint, typecheck, unit, build
- [ ] Swagger at `/api/docs`
- [ ] Health: `/health`, `/ready`, metrics scrape endpoint

---

## 7. Local ports (convention)

| Service | Port |
|---------|------|
| Web (Vite) | 5173 |
| API (Nest) | 3000 |
| PostgreSQL | 5432 |
| Redis (future) | 6379 |
| Prometheus | 9090 |
| Grafana | 3001 |
| Loki | 3100 |

---

## 8. Engineering principles

| Principle | Application |
|-----------|-------------|
| KISS / YAGNI | No workforce modules in MVP |
| Clean Architecture | Nest domain → application → infrastructure |
| Feature modules | Frontend by feature folder, not by type-only |
| Secure by default | Auth on all mutating APIs; PII in audit carefully |
| Observable | Structured Pino logs + Prometheus metrics |

Standards: [14-standards/CODING_STANDARDS.md](./14-standards/CODING_STANDARDS.md).

---

## 9. Where to look when stuck

| Problem | Doc |
|---------|-----|
| Field meaning vs Excel | [01-business-analysis/REQUIREMENT_TRACEABILITY_MATRIX.md](./01-business-analysis/REQUIREMENT_TRACEABILITY_MATRIX.md) |
| Endpoint contract | [10-api/API_CATALOG.md](./10-api/API_CATALOG.md) |
| Schema | [07-database/PRISMA_DESIGN.md](./07-database/PRISMA_DESIGN.md) |
| Sequence of operations | [06-system-design/SEQUENCE_DIAGRAMS.md](./06-system-design/SEQUENCE_DIAGRAMS.md) |
| Local fail | [21-guides/TROUBLESHOOTING_AND_FAQ.md](./21-guides/TROUBLESHOOTING_AND_FAQ.md) |

---

## 10. Open questions (defaults applied)

| Topic | Default until changed |
|-------|----------------------|
| Tenancy | Single-tenant internal |
| Identity | Email/password; SSO later |
| Notifications | In-app stub; email optional Phase 1.1 |
| File storage | Local disk |
| Redis | Interface-ready; not required for MVP logic |

---

## References

- [docs/README.md](./README.md)
- [21-guides/NESTJS_DEVELOPER_HANDBOOK.md](./21-guides/NESTJS_DEVELOPER_HANDBOOK.md) — **NestJS + full-stack implementation guide**
- ADR-0001: [14-standards/adr/0001-mvp-pipeline-first.md](./14-standards/adr/0001-mvp-pipeline-first.md)
- ADR-0002: [14-standards/adr/0002-modular-monolith.md](./14-standards/adr/0002-modular-monolith.md)
