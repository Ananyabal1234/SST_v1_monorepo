# Permission Matrix — SST MVP

## Purpose

Map roles to operations for Guards and UI gates.

## Audience

Backend, frontend, security, QA.

## Scope

MVP roles as implemented in code (`packages/shared-types` / Prisma `Role`).

## Definitions

| Code | Meaning |
|------|---------|
| C | Create |
| R | Read |
| U | Update |
| D | Soft-delete / cancel / disable |
| — | Denied |

Roles: `ADMIN`, `SALES`, `SALES_LEAD`, `TA`, `TA_LEAD`, `HR`, `HR_LEAD`.

Abbr. in tables: ADM, SAL, SL, TA, TL, HR, HL.

---

## Matrix (API)

| Resource / Action | ADM | SAL | SL | TA | TL | HR | HL |
|-------------------|-----|-----|----|----|----|----|-----|
| Users manage (CRUD, reset password) | CRUD | — | — | — | — | — | — |
| Users directory | R | R | R | R | R | R | R |
| Lookups mutate | CRUD | — | — | — | — | — | — |
| Candidate-status list | R | — | — | R | R | — | — |
| Clients create/update | CU | CU | CU | — | — | — | — |
| Clients read | R | R | R | R | R | R | R |
| Job families create/update | CU | CU | CU | — | — | — | — |
| Job families read | R | R | R | R | R | R | R |
| TA/Sales/HR member lists read | R | R | R | R | R | R | R |
| Member lists mutate | C | — | — | — | — | — | — |
| Requirements create | C | C | C | — | — | — | — |
| Requirements read | R | R | R | R | R | R | R |
| Requirements PUT (core) | U | U* | U | — | — | — | — |
| Requirements PATCH | U | U* | U | U† | U‡ | — | — |
| Requirements status | U | U | U | — | — | — | — |
| Requirements pipeline read | R | R | R | R | R | — | — |
| Candidates read | R | R | R | R | R | R | R |
| Candidates create/update | CU | — | — | CU | CU | — | — |
| Candidate select | U | — | — | U | U | — | — |
| Candidate duplicates | R | — | — | R | R | — | — |
| Offers read/create | CR | — | — | CR | CR | CR | CR |
| Offers update / status | U | — | — | — | — | U | U |
| Onboarding CRUD / status | CRUD | — | — | — | — | CRUD | CRUD |
| Dashboard | R | R | R | R | R | R | R |
| Audit logs | R | — | — | — | — | — | — |
| Import validate/commit | C | — | — | — | — | — | — |

\* SALES: row-level — only requirements where `salesOwnerId = self`.  
† TA: TA owner / handoff / remarks on accessible requirements.  
‡ TA_LEAD: limited field set (`TA_LEAD_UPDATE_FIELDS`) for lead assignment.

---

## UI secondary tabs (`Dashboard.jsx`)

| Tab | ADM | SAL | SL | TA | TL | HR | HL |
|-----|-----|-----|----|----|----|----|-----|
| Dashboard overview | Y | Y | Y | Y | Y | Y | Y |
| Add Request | Y | Y | Y | — | — | — | — |
| Requirements (Sales list) | Y | Y | Y | — | — | — | — |
| Task History | — | Y | Y | — | — | — | — |
| Requirements & Pipeline (TA Lead) | — | — | — | — | Y | — | — |
| Assign Task | Y | — | — | Y | Y | — | — |
| Offer | Y | — | — | — | — | Y | Y |
| Onboarding | Y | — | — | — | — | Y | Y |
| Users | Y | — | — | — | — | — | — |

---

## Row-level rules

| Role | Scope |
|------|-------|
| SALES | Default list filter `salesOwnerId = me`; cannot edit another owner's core fields |
| SALES_LEAD | Sees all requirements; may reassign sales owner |
| TA | Prefer assigned requirements; access enforced in service |
| TA_LEAD | Lead queue; assign TA owners; restricted PATCH fields |
| HR / HR_LEAD | All offers/onboardings in scope of controllers |
| ADMIN | Full access |

---

## Enforcement

Server-side `@Roles` + service checks are authoritative. UI tab hiding is UX only (BR-SEC-01).

## Test cases

See [../15-testing/v1-catalog/08-authz-matrix.md](../15-testing/v1-catalog/08-authz-matrix.md). Each mutate cell → manual case; P0 automation in `apps/api/test/integration/authz.integration.spec.ts`.

## References

- [AUTH_RBAC.md](./AUTH_RBAC.md)  
- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)  
- Controllers under `apps/api/src/**/*.controller.ts`  
