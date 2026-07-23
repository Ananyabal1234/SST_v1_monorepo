# Module Catalog — SST API

## Purpose

Catalog Nest modules, public API surface, and dependencies.

## Audience

Backend engineers, reviewers.

## Scope

MVP modules.

## Definitions

See NestJS Architecture.

---

## Modules

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| AuthModule | Login, refresh, logout, JWT strategy | Users, Prisma |
| UsersModule | User CRUD (Admin) | Prisma, Audit |
| MasterDataModule | Lookups, clients, job families | Prisma, Audit |
| RequirementsModule | Requirement CRUD + SLA fields | MasterData, Audit |
| CandidatesModule | Pipeline + duplicates + selection | Requirements, Audit |
| OffersModule | Offer lifecycle | Candidates, Audit |
| OnboardingModule | Onboarding lifecycle + join | Offers, Audit |
| DashboardModule | Aggregations | Prisma read |
| AuditModule | Write/read audit | Prisma |
| ImportModule | CSV import | domain modules |
| HealthModule | `/health`, `/ready`, `/metrics` | Prisma |

## Controllers (summary)

| Controller | Base path |
|------------|-----------|
| AuthController | `/auth` |
| UsersController | `/users` |
| MasterDataController | `/master-data` |
| RequirementsController | `/requirements` |
| CandidatesController | `/candidates` |
| OffersController | `/offers` |
| OnboardingController | `/onboardings` |
| DashboardController | `/dashboard` |
| AuditController | `/audit-logs` |
| ImportController | `/imports` |
| HealthController | `/health` (may sit outside v1 prefix) |

## Communication rules

- CandidatesModule may read RequirementsRepository; must not write requirements except via RequirementsService for status side-effects.  
- DashboardModule is read-only.  
- No circular Nest imports; extract shared types to `common` or package.

## Future modules

`WorkforceModule` shells disabled — see Future Modules doc.

## References

- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)  
- [NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md)  
