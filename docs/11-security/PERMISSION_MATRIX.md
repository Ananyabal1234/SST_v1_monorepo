# Permission Matrix — SST MVP

## Purpose

Map roles to operations for Guards and UI gates.

## Audience

Backend, frontend, security, QA.

## Scope

MVP roles only.

## Definitions

| Code | Meaning |
|------|---------|
| C | Create |
| R | Read |
| U | Update |
| D | Soft-delete / cancel |
| — | Denied |

Roles: `ADMIN`, `SALES`, `TA`, `HR`, `LEADERSHIP_READONLY` (abbr. `LEAD`).

---

## Matrix

| Resource / Action | ADMIN | SALES | TA | HR | LEAD |
|-------------------|-------|-------|----|----|------|
| Users manage | CRUD | — | — | — | — |
| Masters lookups mutate | CRUD | — | — | — | — |
| Clients create | C | C | — | — | — |
| Clients read | R | R | R | R | R |
| Job families mutate | CRUD | — | — | — | — |
| Requirements create | C | C | — | — | — |
| Requirements read | R | R | R | R | R |
| Requirements update core | U | U | U* | — | — |
| Requirements status | U | U | — | — | — |
| Candidates CRUD | CRUD | R | CRUD | R | R |
| Candidate select | U | — | U | — | — |
| Offers CRUD | CRUD | R | RU | CRUD | R |
| Offer status | U | — | — | U | — |
| Onboarding CRUD | CRUD | R | R | CRUD | R |
| Dashboard | R | R | R | R | R |
| Audit logs | R | — | — | — | — |
| Import | C | — | — | — | — |
| CTC/Rate field | R | R† | R† | R | —† |

\* TA may update TA owner/handoff/remarks on assigned reqs.  
† Confirm with product; default: LEAD hides CTC; SALES/TA can read for negotiation context.

---

## Row-level rules (Should)

| Role | Scope |
|------|-------|
| TA | Prefer `taOwnerId = me` default filter (can view all unless flag) |
| HR | All onboardings |
| SALES | Prefer `salesOwnerId = me` |

## Enforcement

Server-side only trustworthy. UI uses matrix for UX.

## Test cases

Each matrix cell → automated authorization test (403/200).

## References

- [AUTH_RBAC.md](./AUTH_RBAC.md)  
- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)  
