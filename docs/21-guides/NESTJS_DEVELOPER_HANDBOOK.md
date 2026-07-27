# SST NestJS + Full-Stack Developer Handbook (Beginner-Friendly)

## Purpose

This is a **one-stop developer handbook** for building and extending the **Service Staffing Tracker (SST)** even if you are new to **Node.js** and **NestJS**.

It is intentionally **codebase-driven**: every concept is explained using the **actual SST repository structure and files**, not generic tutorials.

## Scope

- Backend: **NestJS 11 + Prisma + PostgreSQL** under `apps/api`
- Frontend: **Vite React SPA** under `apps/web`
- Shared packages: `packages/shared-types`, `packages/shared-utils`
- How to implement features end-to-end: **DB → API → UI**

Out of scope: Production cloud deploy (see `docs/19-cloud`), future workforce modules.

## Quick links (in this repo)

- Local setup: `docs/17-local-deployment/LOCAL_SETUP.md`
- Sprint plan: `docs/12-planning/TEAM_SPRINT_PLAN.md`
- API docs conventions: `docs/10-api/OPENAPI_CONVENTIONS.md`
- Permissions: `docs/11-security/PERMISSION_MATRIX.md`

---

## Table of contents

1. Orientation: what is Node/TS/Nest/Prisma?
2. Run SST locally (from zero)
3. Repository map (monorepo + where to look)
4. NestJS fundamentals (as used in SST)
5. Database + Prisma deep dive (schema/migrations/queries)
6. Code walkthrough: Requirements module (controller → service → prisma)
7. Auth, JWT, refresh tokens, RBAC (backend + frontend)
8. End-to-end workflows (Requirement → Candidate → Offer → Onboarding → Dashboard)
9. How to implement a new feature (repeatable checklist)
10. Frontend integration guide (routing, API client, data fetching)
11. Appendices: endpoint map, env vars, glossary, known gaps

---

## 1) Orientation (for absolute beginners)

### 1.1 What is Node.js?

**Node.js** is a runtime that lets you run JavaScript on the server (outside the browser). SST’s API (`apps/api`) is a Node.js app.

### 1.2 What is TypeScript?

**TypeScript (TS)** is JavaScript plus types. SST uses TypeScript in both:

- Backend: `apps/api/src/**/*.ts`
- Frontend: `apps/web/src/**/*.tsx`

Types help you catch mistakes early (e.g., wrong DTO fields, wrong API shapes).

### 1.3 What is NestJS?

**NestJS** is a server framework (like Spring for Java) that encourages:

- **Modules**: feature boundaries and dependency wiring
- **Controllers**: HTTP routing
- **Services**: business logic
- **Dependency Injection (DI)**: classes get dependencies via constructor parameters

SST uses a “feature module per domain” layout like `requirements/`, `candidates/`, etc.

### 1.4 What is Prisma?

**Prisma** is an ORM and query builder:

- You define your models in `schema.prisma`
- Prisma generates a typed client (`@prisma/client`)
- Your services call `this.prisma.<model>.<query>()` to read/write DB

### 1.5 The SST mental model

```mermaid
flowchart TB
  subgraph browser [Browser]
    Web[apps/web React SPA]
  end
  subgraph server [Node_Server]
    API[apps/api NestJS]
    Prisma[PrismaService]
  end
  subgraph data [Data]
    PG[(PostgreSQL)]
  end
  Web -->|"HTTP /api/v1 + JWT"| API
  API --> Prisma
  Prisma --> PG
```

---

## 2) Run SST locally (from zero)

Follow `docs/17-local-deployment/LOCAL_SETUP.md` for the authoritative steps. This section explains **what happens and why**.

### 2.1 What you need

- Node.js 22+
- pnpm
- Docker

### 2.2 Start Postgres

SST’s compose file is in `docker/docker-compose.yml` and exposes Postgres on host port **5433**.

### 2.3 Configure environment variables

Copy `.env.example` to `.env` and update secrets if needed. Key vars:

- `DATABASE_URL` (points to Postgres)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (defaults to `http://localhost:5173`)
- `VITE_API_BASE_URL` (frontend base path, typically `/api/v1`)
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (seed user)

### 2.4 Migrate and seed

Prisma migrations live under `apps/api/prisma/migrations`. Seeding is `apps/api/prisma/seed.ts`.

Seed creates a single **ADMIN** user from env (required — no hardcoded defaults):

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`

Create Sales / TA / HR users via the Admin UI or API after seed.

### 2.5 Run API and web

- API: `apps/api` runs on port `3000`
- Web: `apps/web` runs on port `5173`

Verify:

- Health: `http://localhost:3000/health`
- Swagger: `http://localhost:3000/api/docs`
- Web: `http://localhost:5173`

### 2.6 Commands cheat sheet

From repo root:

```bash
# Install dependencies
pnpm install

# Start Postgres (Docker)
docker compose -f docker/docker-compose.yml up -d postgres

# Database
pnpm db:migrate
pnpm db:seed

# Run API + Web together
pnpm dev
```

Login: use the admin email/password you set in `.env` (`SEED_ADMIN_*`). Additional role accounts are created manually after seed.

### 2.7 Troubleshooting (common first-day issues)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ECONNREFUSED` on API | Postgres not running | `docker compose -f docker/docker-compose.yml up -d postgres` |
| Prisma migrate fails | Wrong `DATABASE_URL` | Use port **5433** from `.env.example` |
| Web loads but API 401 | No login / expired token | Login again; check `sessionStorage` key `sst_access` |
| CORS error | `CORS_ORIGIN` mismatch | Set `CORS_ORIGIN=http://localhost:5173` in `.env` |
| Swagger 403 on routes | Missing Bearer token | Login via Swagger Authorize with access token |

---

## 3) Repository map (what lives where)

### 3.1 Monorepo root

Key root files:

- `package.json`: turbo scripts and DB helpers (`db:migrate`, `db:seed`)
- `pnpm-workspace.yaml`: declares `apps/*` and `packages/*` as workspaces
- `turbo.json`: defines tasks and caching rules

### 3.2 Apps

- `apps/api`: NestJS + Prisma API
- `apps/web`: Vite + React SPA

### 3.3 Packages (shared)

- `packages/shared-types`: Zod schemas + exported TS types (used by frontend; can be used by backend too)
- `packages/shared-utils`: shared helpers (e.g., normalization, SLA/RAG calculation)
- `packages/typescript-config`: shared TS config presets

### 3.4 API source tree (actual layout)

SST’s current backend source is **flat feature folders** under `apps/api/src/`:

```
apps/api/src/
  main.ts
  app.module.ts
  prisma/
  auth/
  users/
  master-data/
  requirements/
  candidates/
  offers/
  onboarding/
  dashboard/
  audit/
  import/
  id-sequence/
  health/
  common/swagger/
```

Note: `docs/08-backend/NESTJS_ARCHITECTURE.md` sketches a future structure with `modules/` and `infrastructure/`, but the codebase today uses the layout above. This handbook documents the **real code**, and you should follow existing conventions for consistency.

### 3.5 Web source tree (high-signal files)

- Routing: `apps/web/src/app/router.tsx`
- Auth state: `apps/web/src/features/auth/auth-context.tsx`
- API client: `apps/web/src/shared/lib/api.ts`
- Feature pages: `apps/web/src/features/*/pages/*`

Full feature page map:

| Route | Page file |
|-------|-----------|
| `/login` | `features/auth/pages/login-page.tsx` |
| `/` | `features/dashboard/pages/dashboard-page.tsx` |
| `/requirements` | `features/requirements/pages/requirements-page.tsx` |
| `/requirements/:id` | `features/requirements/pages/requirement-detail-page.tsx` |
| `/candidates` | `features/candidates/pages/candidates-page.tsx` |
| `/candidates/:id` | `features/candidates/pages/candidate-detail-page.tsx` |
| `/offers` | `features/offers/pages/offers-page.tsx` |
| `/offers/:id` | `features/offers/pages/offer-detail-page.tsx` |
| `/onboarding` | `features/onboarding/pages/onboarding-page.tsx` |
| `/onboarding/:id` | `features/onboarding/pages/onboarding-detail-page.tsx` |
| `/admin` | `features/admin/pages/admin-page.tsx` |

### 3.6 Module dependency graph (build order)

This matches the delivery dependency graph used in planning (`docs/12-planning/DEPENDENCY_GRAPH.md`), and explains why some modules must exist before others.

```mermaid
flowchart TD
  mono[Monorepo_E0] --> db[Prisma_Schema]
  db --> auth[Auth_E1]
  auth --> md[MasterData_E2]
  md --> req[Requirements_E3]
  req --> can[Candidates_E4]
  can --> off[Offers_E5]
  off --> onb[Onboarding_E6]
  req --> dash[Dashboard_E7]
  can --> dash
  off --> dash
  onb --> dash
  auth --> aud[Audit_E8]
  mono --> ci[CI_E9]
  auth --> ci
```

### 3.7 API module file map (every Nest module)

Each API feature follows the same shape: `*.module.ts` + `*.controller.ts` + `*.service.ts` + `dto/`.

| Module folder | Controller | Service | Key responsibility |
|---------------|------------|---------|-------------------|
| `auth/` | `auth.controller.ts` | `auth.service.ts` | Login, refresh, logout, JWT |
| `users/` | `users.controller.ts` | `users.service.ts` | Admin user CRUD + directory |
| `master-data/` | `master-data.controller.ts` | `master-data.service.ts` | Lookups, clients, job families |
| `requirements/` | `requirements.controller.ts` | `requirements.service.ts` | Requirement CRUD + SLA derived fields |
| `candidates/` | `candidates.controller.ts` | `candidates.service.ts` | Pipeline + duplicates + select |
| `offers/` | `offers.controller.ts` | `offers.service.ts` | Offer lifecycle |
| `onboarding/` | `onboarding.controller.ts` | `onboarding.service.ts` | HR onboarding + join |
| `dashboard/` | `dashboard.controller.ts` | `dashboard.service.ts` | KPI aggregations (read-only) |
| `audit/` | `audit.controller.ts` | `audit.service.ts` | Audit log write + admin query |
| `import/` | `import.controller.ts` | `import.service.ts` | CSV validate/commit |
| `health/` | `health.controller.ts` | — | Liveness, readiness, metrics |
| `prisma/` | — | `prisma.service.ts` | Global DB client |
| `id-sequence/` | — | `id-sequence.service.ts` | Public IDs (`REQ-00001`, etc.) |

Global modules (`@Global()`): `PrismaModule`, `IdSequenceModule`, `AuditModule`.

---

## 4) NestJS fundamentals (as implemented in SST)

### 4.1 The request lifecycle in SST

When the browser calls an API endpoint:

```mermaid
sequenceDiagram
  participant Web as Web_App
  participant Ctrl as Controller
  participant Guard as Guard
  participant Pipe as ValidationPipe
  participant Svc as Service
  participant Prisma as PrismaService
  participant DB as Postgres
  Web->>Ctrl: HTTP /api/v1/...
  Ctrl->>Guard: JwtAuthGuard + RolesGuard
  Guard-->>Ctrl: allow/deny
  Ctrl->>Pipe: DTO validation (global pipe)
  Pipe-->>Ctrl: sanitized + typed input
  Ctrl->>Svc: call service method
  Svc->>Prisma: prisma.<model>.<op>()
  Prisma->>DB: SQL
  DB-->>Prisma: rows
  Prisma-->>Svc: typed result
  Svc-->>Ctrl: response object
  Ctrl-->>Web: JSON response
```

### 4.2 Modules

Each folder like `requirements/` is a module with:

- `requirements.module.ts`: registers providers/controllers
- `requirements.controller.ts`: HTTP routes
- `requirements.service.ts`: business logic + Prisma queries
- `dto/*.dto.ts`: request validation

### 4.3 Controllers

Controllers define HTTP endpoints with decorators like `@Get()`, `@Post()`. SST also uses:

- `@UseGuards(JwtAuthGuard, RolesGuard)` on many controllers
- `@Roles(...)` to restrict access by role
- Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiOkResponse`, etc.)

### 4.4 Services

Services implement use-cases and call Prisma. In SST, services commonly inject:

- `PrismaService` (DB access)
- `AuditService` (log mutations)
- `IdSequenceService` (public IDs like `REQ-00001`)

### 4.5 Guards and role checks

SST uses two guards:

- `JwtAuthGuard`: protects routes unless `@Public()` is applied
- `RolesGuard`: checks that `request.user.role` is included in `@Roles(...)`

### 4.6 Global validation

In `apps/api/src/main.ts`, SST uses a global `ValidationPipe` configured to:

- `whitelist: true`: drop unknown fields from request bodies
- `forbidNonWhitelisted: true`: error if unknown fields are present
- `transform: true`: transform primitives when possible

This means DTOs are the contract: if a field isn’t in the DTO, it won’t pass.

### 4.7 Bootstrap code (what `main.ts` does)

`apps/api/src/main.ts` is the API entry point. It:

1. Creates the Nest app from `AppModule`
2. Enables `cookie-parser` (for refresh cookie `sst_refresh`)
3. Enables CORS for the web origin
4. Sets global prefix `api/v1` (excludes health endpoints)
5. Registers global `ValidationPipe`
6. Sets up Swagger at `/api/docs`
7. Listens on `PORT` (default `3000`)

### 4.8 Root module wiring (`app.module.ts`)

`apps/api/src/app.module.ts` imports all feature modules:

- `ConfigModule` (global, reads `.env`)
- `PrismaModule`, `IdSequenceModule` (global infra)
- `HealthModule`, `AuthModule`, `UsersModule`, `MasterDataModule`
- `RequirementsModule`, `CandidatesModule`, `OffersModule`, `OnboardingModule`
- `DashboardModule`, `AuditModule`, `ImportModule`

There is **no global auth guard** — each controller opts in with `@UseGuards(JwtAuthGuard, RolesGuard)`.

### 4.9 What SST does NOT use yet (don’t search for these)

| Pattern | Status in SST |
|---------|---------------|
| Repository layer | Not used — services call Prisma directly |
| Custom exception filter | Not implemented — Nest default `HttpException` |
| Global `APP_GUARD` | Not used — per-controller guards |
| `correlationId` in errors | Documented in Swagger only |
| Sort query param | Documented in DTOs but not implemented in services |

---

## 5) Database + Prisma deep dive

### 5.1 Where the schema lives

Prisma schema is here:

- `apps/api/prisma/schema.prisma`

Migrations live here:

- `apps/api/prisma/migrations/*`

Seed script:

- `apps/api/prisma/seed.ts`

### 5.2 Core data model (pipeline)

SST’s core pipeline models are:

- `Requirement` → `Candidate` → `Offer` → `Onboarding`

Plus supporting models:

- `User`, `RefreshToken`
- `Client`, `JobFamily`
- `LookupType`, `LookupValue`
- `AuditLog`
- `IdSequence`

### 5.3 ER diagram (core relationships)

```mermaid
erDiagram
  User ||--o{ Requirement : sales_owns
  User ||--o{ Requirement : ta_owns
  Client ||--o{ Requirement : has
  JobFamily ||--o{ Requirement : categorizes
  Requirement ||--o{ Candidate : pipelines
  Candidate ||--o| Offer : selected_for
  Offer ||--o| Onboarding : accepts_to
  User ||--o{ Onboarding : hr_owns
```

### 5.4 PrismaService in SST

SST uses a wrapper class that extends `PrismaClient`:

- `apps/api/src/prisma/prisma.service.ts`
- `apps/api/src/prisma/prisma.module.ts` is marked `@Global()` so `PrismaService` can be injected anywhere.

### 5.5 Common Prisma query patterns in SST

**List endpoints** usually:

- Build a `where` object that includes `deletedAt: null`
- Use `skip`/`take` for pagination
- Use `include` to join related rows (client, owners, etc.)
- Return `{ items, total, page, pageSize }`

**Mutations** usually:

- Create/update the row with Prisma
- Write an audit log entry (before/after)

**Derived fields** (SLA RAG, open positions) are computed in the service and not stored in DB.

### 5.6 Prisma model reference (pipeline tables)

| Model | Table | Public ID prefix | Notes |
|-------|-------|------------------|-------|
| `Requirement` | `requirements` | `REQ-#####` | Core demand record |
| `Candidate` | `candidates` | `CAN-#####` | Always linked to a requirement |
| `Offer` | `offers` | `OFF-#####` | One per selected candidate |
| `Onboarding` | `onboardings` | `ONB-#####` | Created after offer accepted |
| `User` | `users` | — | Auth + ownership |
| `Client` | `clients` | — | Normalized name |
| `JobFamily` | `job_families` | — | Lookup directory |
| `LookupType` / `LookupValue` | `lookup_types` / `lookup_values` | — | Setup Lists |
| `AuditLog` | `audit_logs` | — | Mutation history |
| `IdSequence` | `id_sequences` | — | Counter for public IDs |

### 5.7 Soft delete pattern

Most entities have `deletedAt`. List queries always filter `deletedAt: null`. Users are “deleted” by setting `deletedAt` + `isActive: false`.

### 5.8 Cross-cutting services every developer should know

#### `IdSequenceService` (`apps/api/src/id-sequence/id-sequence.service.ts`)

Generates human-readable IDs like `REQ-00001`:

- Upserts a counter row in `id_sequences`
- Uses `formatPublicId(prefix, value)` from `@sst/shared-utils`
- Called during `create()` in requirements, candidates, offers, onboarding

#### `AuditService` (`apps/api/src/audit/audit.service.ts`)

Writes to `audit_logs` on every mutation:

- `entityType`, `entityId`, `action`, `actorUserId`
- `beforeJson` / `afterJson` snapshots
- Admin can query via `GET /api/v1/audit-logs`

#### `@sst/shared-utils`

Shared business logic used by API (and potentially web):

- `daysSince(date)` — requirement/candidate age
- `computeTaHandoffSlaRag(...)` — GREEN / AMBER / RED
- `normalizeEmail`, `normalizeMobile` — duplicate detection

### 5.9 Pagination and filtering pattern

Shared query DTOs live in `apps/api/src/common/swagger/query.dto.ts`.

List endpoints return:

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 20 }
```

Common query params:

| Param | Used by | Purpose |
|-------|---------|---------|
| `page`, `pageSize` | Most list endpoints | Pagination |
| `q` | Requirements, Candidates, Offers | Text search |
| `status` / `statusCode` | Requirements, Offers, Onboardings | Filter by status |
| `taOwnerId`, `salesOwnerId`, `clientId` | Requirements, Dashboard | Ownership filters |
| `requirementId` | Candidates, Offers, Onboardings | Scope to one req |

Default `pageSize` in services is **20** (DTO docs say 25 — minor doc drift).

---

## 6) Code walkthrough: Requirements module (gold standard)

This module is a great template for building other modules.

### 6.1 Routes and RBAC

`apps/api/src/requirements/requirements.controller.ts` defines:

- `GET /requirements`: list with filters
- `GET /requirements/:id`: detail
- `POST /requirements`: create (ADMIN, SALES)
- `PATCH /requirements/:id`: update (ADMIN, SALES, TA)
- `POST /requirements/:id/status`: status transition (ADMIN, SALES)

Pattern to notice:

- Class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + broad `@Roles(...)`
- Method-level `@Roles(...)` overrides for stricter access
- `@CurrentUser()` provides the actor user for audit logging

### 6.2 DTO validation

`apps/api/src/requirements/dto/requirements.dto.ts` uses `class-validator`:

- `@IsUUID()` for IDs
- `@IsDateString()` for date fields
- `@IsInt()` + `@Min(1)` for positions
- Optional fields via `@IsOptional()`

Because global validation forbids unknown fields, your DTO is the contract.

### 6.3 Service logic (filters + derived fields)

`apps/api/src/requirements/requirements.service.ts` shows:

- `list(query)`: builds `Prisma.RequirementWhereInput` filters (status, owners, date range, text query)
- `withDerived(req)`: computes:
  - `requirementAgeDays` via `daysSince()` from `@sst/shared-utils`
  - `taHandoffSlaRag` via `computeTaHandoffSlaRag()` from `@sst/shared-utils`
  - open/closed positions based on onboardings in status `JOINED`

### 6.4 Mutation + audit pattern

Create and update do:

1. Write row via Prisma
2. `await this.audit.log({ entityType, entityId, action, actorUserId, before?, after? })`

Use this pattern for every new module so managers can trace changes.

### 6.5 Implementation note (known gap)

Swagger documentation for `GET /requirements/:id` says `:id` can be UUID or `publicId` like `REQ-00001`, but the service currently queries by `id` only. If you extend this endpoint, implement lookup by both.

### 6.6 Controller code pattern (annotated)

```typescript
@ApiTags('Requirements')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)          // 1. Auth + role check
@Roles(Role.ADMIN, Role.SALES, Role.TA, Role.LEADERSHIP_READONLY)  // 2. Default roles
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}  // 3. DI

  @Get()
  list(@Query() query: RequirementsQueryDto) {   // 4. Query DTO validated by global pipe
    return this.requirements.list(query);
  }

  @Roles(Role.ADMIN, Role.SALES)               // 5. Method-level role override
  @Post()
  create(@Body() dto: CreateRequirementDto, @CurrentUser() user: AuthUser) {
    return this.requirements.create(dto, user.id);  // 6. Pass actor for audit
  }
}
```

File: `apps/api/src/requirements/requirements.controller.ts`

### 6.7 Service create flow (step by step)

`RequirementsService.create()` in `apps/api/src/requirements/requirements.service.ts`:

1. `const publicId = await this.ids.next('requirement', 'REQ')` → e.g. `REQ-00001`
2. `this.prisma.requirement.create({ data: { ...dto fields }, include: { client, jobFamily, salesOwner, taOwner } })`
3. `this.audit.log({ action: 'CREATE', entityType: 'Requirement', ... })`
4. `return this.withDerived(row)` → adds `requirementAgeDays`, `taHandoffSlaRag`, `openPositions`, `closedPositions`

### 6.8 Derived fields explained

| Field | Source | Logic |
|-------|--------|-------|
| `requirementAgeDays` | `@sst/shared-utils` `daysSince()` | Days since `requirementDate` |
| `taHandoffSlaRag` | `@sst/shared-utils` `computeTaHandoffSlaRag()` | GREEN ≤2d, AMBER ≤5d, else RED |
| `openPositions` | Service | `numberOfPositions - closedPositions` |
| `closedPositions` | Service | Count onboardings with `statusCode = 'JOINED'` |

These mirror Excel helper columns but are computed server-side so formulas cannot break.

---

## 7) Auth, JWT refresh, and RBAC (backend + frontend)

### 7.1 Backend auth flow

Key backend files:

- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/jwt.strategy.ts`
- `apps/api/src/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/auth/guards/roles.guard.ts`
- Decorators: `apps/api/src/auth/decorators/*`

High-level flow:

```mermaid
sequenceDiagram
  participant Web as Web_App
  participant Auth as AuthController
  participant Svc as AuthService
  participant DB as Postgres
  Web->>Auth: POST /auth/login
  Svc->>DB: find user, bcrypt.compare
  Svc-->>Web: accessToken + refreshToken
  Note over Web,Auth: refresh cookie sst_refresh is also set (httpOnly)
  Web->>Auth: GET /auth/me (Bearer accessToken)
  Auth-->>Web: user profile
```

Implementation notes (from code):

- Access tokens are JWTs signed with `JWT_ACCESS_SECRET` and TTL `JWT_ACCESS_TTL` (default `15m`)
- Refresh tokens are random bytes, hashed in DB (`sha256`) and rotated on refresh
- Refresh cookie name: `sst_refresh` (set in `apps/api/src/auth/auth.controller.ts`)
- Cookie settings for local dev (as implemented): `httpOnly: true`, `sameSite: 'lax'`, `secure: false`, `path: '/'`

### 7.2 Role-based access

Roles come from Prisma enum `Role` in `schema.prisma`:

- `ADMIN`, `SALES`, `TA`, `HR`, `LEADERSHIP_READONLY`

Controllers use `@Roles(Role.ADMIN, ...)` and `RolesGuard` enforces it.

Cross-check intended permissions in `docs/11-security/PERMISSION_MATRIX.md`.

### 7.3 Frontend auth flow

Key frontend file:

- `apps/web/src/shared/lib/api.ts`

What it does:

- Stores access token in `sessionStorage` (`sst_access`)
- Adds `Authorization: Bearer <token>` on requests
- On `401`, calls `POST /auth/refresh` (cookie-based refresh), updates token, retries original request
- If refresh fails, clears token and triggers a handler (logout UX)

This is the simplest workable pattern for an internal app.

### 7.4 JWT strategy (how token becomes a user)

`apps/api/src/auth/jwt.strategy.ts`:

1. Extracts Bearer token from `Authorization` header
2. Verifies signature with `JWT_ACCESS_SECRET`
3. Loads user from DB (`id = payload.sub`, `isActive = true`, `deletedAt = null`)
4. Returns `{ id, email, fullName, role }` attached to `request.user`

`@CurrentUser()` decorator reads `request.user` in controllers.

### 7.5 RolesGuard behavior

`apps/api/src/auth/guards/roles.guard.ts`:

- Reads `@Roles(...)` metadata from handler or class
- If no roles declared → allows (returns `true`)
- Otherwise checks `request.user.role` is in the allowed list

This is why some controllers (e.g. master-data GET endpoints) have JWT guard but no class-level `@Roles` — any authenticated user can read.

---

## 8) End-to-end business workflows (technical perspective)

SST’s main workflow is:

```mermaid
stateDiagram-v2
  [*] --> RequirementActive
  RequirementActive --> CandidateSourcing: TA_adds_candidates
  CandidateSourcing --> CandidateSelected: select_candidate
  CandidateSelected --> OfferReleased: create_offer
  OfferReleased --> OfferAccepted: accept_offer
  OfferAccepted --> Onboarding: create_onboarding
  Onboarding --> Joined: mark_JOINED
  Joined --> RequirementClosed: positions_filled
```

How this maps to code modules:

| Workflow step | API module | Typical UI page |
|--------------|------------|-----------------|
| Create requirement | `requirements` | `/requirements` |
| Add candidates | `candidates` | `/candidates` or requirement detail |
| Select candidate | `candidates` | candidate detail |
| Create offer | `offers` | offer pages |
| Onboarding | `onboarding` | onboarding pages |
| KPIs | `dashboard` | `/` |

To understand exact user flows, see `docs/05-ux/USER_FLOWS.md`.

### 8.1 Frontend route map (what screens exist)

SST’s routes are defined in `apps/web/src/app/router.tsx` and currently include:

```mermaid
flowchart LR
  login[/login/] --> appShell[Protected_AppLayout]
  appShell --> dash[/ (Dashboard)/]
  appShell --> req[/requirements/]
  req --> reqDetail[/requirements/:id/]
  appShell --> cand[/candidates/]
  cand --> candDetail[/candidates/:id/]
  appShell --> offers[/offers/]
  offers --> offerDetail[/offers/:id/]
  appShell --> onb[/onboarding/]
  onb --> onbDetail[/onboarding/:id/]
  appShell --> admin[/admin/]
```

### 8.2 Per-module business rules (quick reference)

| Module | Key rule enforced in service |
|--------|------------------------------|
| `requirements` | Status transitions; derived open/closed positions |
| `candidates` | Must link to requirement; duplicate mobile/email detection; select gate |
| `offers` | Only for selected candidates; status transitions |
| `onboarding` | Only from accepted offer; `JOINED` updates closed positions; may auto-close requirement |
| `dashboard` | Read-only aggregations across all pipeline tables |
| `import` | CSV validate before commit; ADMIN only |

For full rules see `docs/01-business-analysis/BUSINESS_RULES.md`.

### 8.3 Error handling pattern

Services throw Nest built-in exceptions:

| Exception | HTTP | When |
|-----------|------|------|
| `NotFoundException` | 404 | Entity not found |
| `BadRequestException` | 400 | Business rule violation |
| `ConflictException` | 409 | Duplicate email, existing offer, etc. |
| `UnauthorizedException` | 401 | Bad credentials / missing token |
| `ForbiddenException` | 403 | Inactive user |

No custom error filter yet — response shape is Nest default plus Swagger-documented `ApiErrorDto`.

---

## 9) How to implement a new feature (repeatable checklist)

This is the main “how you should build” section.

### Step 1 — Change the database model

1. Edit `apps/api/prisma/schema.prisma`
2. Run migration (`pnpm db:migrate`)
3. Regenerate Prisma client (`pnpm db:generate`) if needed
4. Update seed if required (`apps/api/prisma/seed.ts`)

### Step 2 — Create DTOs

Create a `dto/*.dto.ts` (or add to an existing one) using `class-validator` and Swagger decorators.

### Step 3 — Add service methods

In `*.service.ts`:

- Write Prisma queries
- Enforce business rules
- Use `AuditService.log()` for mutations

### Step 4 — Add controller endpoints

In `*.controller.ts`:

- Add routes (`@Get`, `@Post`, `@Patch`, `@Delete`)
- Add guards and `@Roles(...)`
- Add Swagger decorators for clean API docs

### Step 5 — Wire module

Add provider/controller to `*.module.ts`, and import module in `apps/api/src/app.module.ts` if it’s a new module.

### Step 6 — Test via Swagger first

Open Swagger `http://localhost:3000/api/docs` and test:

- Request/response shapes
- Validation errors
- Permission errors (use different seeded users)

### Step 7 — Implement UI

1. Add route in `apps/web/src/app/router.tsx`
2. Add page under `apps/web/src/features/<feature>/pages/`
3. Call API using `apps/web/src/shared/lib/api.ts`
4. Use TanStack Query for caching/mutations
5. Handle errors and loading states

### 9.1 “Add new feature” flowchart (schema → API → UI)

Use this as your default workflow for implementing any new feature in SST:

```mermaid
flowchart TB
  schema[Update_schema.prisma] --> migrate[Run_migration]
  migrate --> seed[Update_seed_if_needed]
  seed --> dto[Add_DTOs_and_validation]
  dto --> svc[Implement_Service_Prisma_queries]
  svc --> audit[Add_Audit_for_mutations]
  audit --> ctrl[Add_Controller_routes_RBAC_Swagger]
  ctrl --> swagger[Test_in_Swagger]
  swagger --> ui[Add_UI_route_page_query_mutations]
  ui --> e2e[Manual_E2E_test_flow]
```

---

## 10) Frontend integration guide (React)

### 10.1 Routing

Routing is configured in:

- `apps/web/src/app/router.tsx`

Protected routes are guarded by:

- `apps/web/src/app/protected-route.tsx`

### 10.2 API calls

Use the shared Axios client:

- `apps/web/src/shared/lib/api.ts`

This ensures:

- `withCredentials: true` (refresh cookie works)
- Authorization header is attached
- Refresh + retry happens on 401

### 10.3 Data fetching pattern

SST uses TanStack Query. The recommended pattern is:

- `useQuery` for lists/details
- `useMutation` for create/update transitions
- invalidate relevant query keys after mutations

### 10.4 Example: Requirements UI

Suggested flow for new developers:

1. Start from `apps/web/src/features/requirements/pages/requirements-page.tsx`
2. Observe how it fetches requirements list
3. Track how it fetches master data (lookups, clients, users directory)
4. Compare to the backend module walkthrough in section 6

### 10.5 Requirements page walkthrough (frontend ↔ API)

File: `apps/web/src/features/requirements/pages/requirements-page.tsx`

**List query:**

```typescript
const list = useQuery({
  queryKey: ['requirements', q],
  queryFn: async () =>
    (await api.get('/requirements', { params: { q: q || undefined } })).data,
});
```

Maps to: `GET /api/v1/requirements?q=...` → `RequirementsService.list()`

**Master data for create form** (loaded when form opens):

```typescript
const [clients, families, priorities, taUsers, salesUsers] = await Promise.all([
  api.get('/master-data/clients'),
  api.get('/master-data/job-families'),
  api.get('/master-data/lookups/PRIORITY'),
  api.get('/users/directory', { params: { role: 'TA' } }),
  api.get('/users/directory', { params: { role: 'SALES' } }),
]);
```

**Create mutation:**

```typescript
const create = useMutation({
  mutationFn: async (body) => (await api.post('/requirements', body)).data,
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['requirements'] });
  },
});
```

Maps to: `POST /api/v1/requirements` → `RequirementsService.create()`

**Role-gated UI:**

```typescript
const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';
```

This mirrors backend `@Roles(Role.ADMIN, Role.SALES)` on the create endpoint.

### 10.6 Auth context (session management)

File: `apps/web/src/features/auth/auth-context.tsx`

- On mount: if token exists in `sessionStorage`, calls `GET /auth/me`
- `login()`: `POST /auth/login` → stores `accessToken` → sets user
- `logout()`: `POST /auth/logout` → clears token and user
- Registers `setUnauthorizedHandler` so 401 refresh failure clears session

### 10.7 Web app structure

```
apps/web/src/
  app/           # Router, layout, protected route
  features/      # One folder per domain (auth, requirements, candidates, ...)
  shared/        # API client, UI components, utilities
```

Dependencies (see `apps/web/package.json`): React, Vite, TanStack Query, React Router, Axios, Tailwind, ShadCN-style UI components.

---

## 11) Appendices

### A) API endpoint map (from controllers + roles)

All endpoints are under `/api/v1` **except** `health`, `ready`, and `metrics`, which are excluded from the global prefix in `apps/api/src/main.ts`.

#### Auth (`apps/api/src/auth/auth.controller.ts`)

- `POST /api/v1/auth/login` (**Public**)
- `POST /api/v1/auth/refresh` (**Public**, reads refresh token from body or `sst_refresh` cookie)
- `POST /api/v1/auth/logout` (**JWT required**)
- `GET /api/v1/auth/me` (**JWT required**)

#### Users (`apps/api/src/users/users.controller.ts`)

- `GET /api/v1/users/directory` (All roles: `ADMIN`, `SALES`, `TA`, `HR`, `LEADERSHIP_READONLY`)
- `GET /api/v1/users` (`ADMIN`)
- `POST /api/v1/users` (`ADMIN`)
- `PATCH /api/v1/users/:id` (`ADMIN`)
- `POST /api/v1/users/:id/reset-password` (`ADMIN`)
- `DELETE /api/v1/users/:id` (`ADMIN`)

#### Master data (`apps/api/src/master-data/master-data.controller.ts`)

- `GET /api/v1/master-data/lookups/:type` (Authenticated; role restrictions are not explicitly declared in controller)
- `POST /api/v1/master-data/lookups/:type` (`ADMIN`)
- `PATCH /api/v1/master-data/lookups/:type/:id` (`ADMIN`)
- `GET /api/v1/master-data/clients` (Authenticated; role restrictions not explicitly declared in controller)
- `POST /api/v1/master-data/clients` (`ADMIN`, `SALES`)
- `PATCH /api/v1/master-data/clients/:id` (`ADMIN`, `SALES`)
- `GET /api/v1/master-data/job-families` (Authenticated; role restrictions not explicitly declared in controller)
- `POST /api/v1/master-data/job-families` (`ADMIN`)
- `PATCH /api/v1/master-data/job-families/:id` (`ADMIN`)

#### Requirements (`apps/api/src/requirements/requirements.controller.ts`)

- `GET /api/v1/requirements` (`ADMIN`, `SALES`, `TA`, `LEADERSHIP_READONLY`)
- `GET /api/v1/requirements/:id` (`ADMIN`, `SALES`, `TA`, `LEADERSHIP_READONLY`)
- `POST /api/v1/requirements` (`ADMIN`, `SALES`)
- `PATCH /api/v1/requirements/:id` (`ADMIN`, `SALES`, `TA`)
- `POST /api/v1/requirements/:id/status` (`ADMIN`, `SALES`)

#### Candidates (`apps/api/src/candidates/candidates.controller.ts`)

- `GET /api/v1/candidates` (`ADMIN`, `TA`, `SALES`, `LEADERSHIP_READONLY`)
- `GET /api/v1/candidates/:id` (`ADMIN`, `TA`, `SALES`, `LEADERSHIP_READONLY`)
- `POST /api/v1/candidates` (`ADMIN`, `TA`)
- `PATCH /api/v1/candidates/:id` (`ADMIN`, `TA`)
- `POST /api/v1/candidates/:id/select` (`ADMIN`, `TA`)

#### Offers (`apps/api/src/offers/offers.controller.ts`)

- `GET /api/v1/offers` (`ADMIN`, `HR`, `TA`, `LEADERSHIP_READONLY`)
- `GET /api/v1/offers/:id` (`ADMIN`, `HR`, `TA`, `LEADERSHIP_READONLY`)
- `POST /api/v1/offers` (`ADMIN`, `HR`, `TA`)
- `PATCH /api/v1/offers/:id` (`ADMIN`, `HR`)
- `POST /api/v1/offers/:id/status` (`ADMIN`, `HR`)

#### Onboardings (`apps/api/src/onboarding/onboarding.controller.ts`)

- `GET /api/v1/onboardings` (`ADMIN`, `HR`, `LEADERSHIP_READONLY`)
- `GET /api/v1/onboardings/:id` (`ADMIN`, `HR`, `LEADERSHIP_READONLY`)
- `POST /api/v1/onboardings` (`ADMIN`, `HR`)
- `PATCH /api/v1/onboardings/:id` (`ADMIN`, `HR`)
- `POST /api/v1/onboardings/:id/status` (`ADMIN`, `HR`)

#### Dashboard (`apps/api/src/dashboard/dashboard.controller.ts`)

- `POST /api/v1/dashboard` (**JWT required**) — **single** dashboard API; filters in JSON body (`taOwnerId`, `salesOwnerId`, `clientId`, `jobFamilyId`, `priorityCode`, `from`, `to`). Empty body `{}` = all data. Returns `summary`, `breakdowns`, `escalations`, `requirementRagSummary`, `openPositionsOnClient`, `closedPositionsOnClient`.

Note: The Dashboard endpoint uses `JwtAuthGuard` but no `RolesGuard`, so any authenticated role can access it.

#### Audit (`apps/api/src/audit/audit.controller.ts`)

- `GET /api/v1/audit-logs` (`ADMIN`)

#### Imports (`apps/api/src/import/import.controller.ts`)

- `POST /api/v1/imports/validate` (`ADMIN`)
- `POST /api/v1/imports/commit` (`ADMIN`)

#### Health (`apps/api/src/health/health.controller.ts`) — outside `/api/v1`

- `GET /health` (**Public**)
- `GET /ready` (**Public**, checks DB)
- `GET /metrics` (**Public route**, but typically treated as internal; no auth guard in code)

For authoritative details, use Swagger: `http://localhost:3000/api/docs`.

### B) Environment variables

From `.env.example`:

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://sst:sst@localhost:5433/sst` | Prisma connection string |
| `JWT_ACCESS_SECRET` | `change-me-access-min-32-chars-long!!` | Signs access JWT |
| `JWT_REFRESH_SECRET` | `change-me-refresh-min-32-chars-long!` | Reserved for future use |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL` | `7d` | Refresh token lifetime |
| `PORT` | `3000` | API listen port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed web origin |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `SEED_ADMIN_EMAIL` | _(required)_ | Seed admin user email |
| `SEED_ADMIN_PASSWORD` | _(required)_ | Seed admin password |
| `VITE_API_BASE_URL` | `/api/v1` | Frontend API base path |

### C) Glossary (quick)

- **DTO**: Data Transfer Object; validated request body
- **DI**: Dependency Injection; services receive dependencies in constructors
- **Guard**: code that decides allow/deny before hitting a handler
- **Pipe**: validation/transformation step
- **Prisma migration**: DB schema change file created by Prisma

### D) Known gaps / TODOs in codebase (good first improvements)

1. `GET /requirements/:id` documents publicId support but queries UUID only
2. `PaginationQueryDto` documents `sort` but list services don’t implement it
3. Error envelope mentions `correlationId` but there is no filter/interceptor implementing it yet

### E) Planning links

- Sprint plan: `docs/12-planning/TEAM_SPRINT_PLAN.md`
- Sprint tracker workbook: `docs/12-planning/SST_Sprint_Planning_Tracker.xlsx`

### F) Related documentation index

| Topic | Doc |
|-------|-----|
| Domain model | `docs/04-domain/DOMAIN_MODEL.md` |
| Business rules | `docs/01-business-analysis/BUSINESS_RULES.md` |
| User flows | `docs/05-ux/USER_FLOWS.md` |
| API catalog | `docs/10-api/API_CATALOG.md` |
| Permission matrix | `docs/11-security/PERMISSION_MATRIX.md` |
| Prisma design | `docs/07-database/PRISMA_DESIGN.md` |
| Frontend architecture | `docs/09-frontend/FRONTEND_ARCHITECTURE.md` |
| Module catalog | `docs/08-backend/MODULE_CATALOG.md` |
| Local setup | `docs/17-local-deployment/LOCAL_SETUP.md` |
| Developer guide | `docs/DEVELOPER_GUIDE.md` |

### G) Reading order for new developers

1. **This handbook** (sections 1–2) — setup and mental model
2. **Section 6** — Requirements walkthrough (your template for all modules)
3. **Section 9** — feature implementation checklist
4. **Sprint plan** — `docs/12-planning/TEAM_SPRINT_PLAN.md` for task order
5. **Swagger** — explore live API at `http://localhost:3000/api/docs`
6. **Domain docs** — `docs/04-domain/` when you need field meanings

---

## References

- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)
- [NESTJS_ARCHITECTURE.md](../08-backend/NESTJS_ARCHITECTURE.md)
- [MODULE_CATALOG.md](../08-backend/MODULE_CATALOG.md)
- [PRISMA_DESIGN.md](../07-database/PRISMA_DESIGN.md)
- [FRONTEND_ARCHITECTURE.md](../09-frontend/FRONTEND_ARCHITECTURE.md)
- [TEAM_SPRINT_PLAN.md](../12-planning/TEAM_SPRINT_PLAN.md)

