# Feature Modules — Frontend

## Purpose

Map UI features to routes, APIs, and primary components.

## Audience

Frontend engineers.

## Scope

MVP features.

## Definitions

Feature = independently deliverable UI vertical.

---

## Catalog

| Feature | Routes | API | Key components |
|---------|--------|-----|----------------|
| Auth | `/login` | `/auth/*` | LoginForm |
| Dashboard | `/` | `/dashboard/*` | KpiGrid, FilterBar, BreakdownTables |
| Requirements | `/requirements`, `/requirements/:id` | `/requirements` | RequirementsTable, RequirementForm |
| Candidates | `/candidates`, `/candidates/:id` | `/candidates` | CandidatesTable, DuplicateBadge, StageSelect |
| Offers | `/offers`, `/offers/:id` | `/offers` | OfferForm, StatusStepper |
| Onboarding | `/onboarding`, `/onboarding/:id` | `/onboardings` | OnboardingForm |
| Admin Users | `/admin/users` | `/users` | UsersTable |
| Admin Masters | `/admin/masters` | `/master-data` | MasterEditor |
| Admin Audit | `/admin/audit` | `/audit-logs` | AuditTable |
| Admin Import | `/admin/import` | `/imports` | ImportWizard |

## Shared components

`DataTable`, `PageHeader`, `FilterBar`, `RagBadge`, `ConfirmDialog`, `EmptyState`, `PermissionGate`.

## Cross-feature navigation

Requirement detail → Candidates tab → Offer link → Onboarding link (breadcrumb trail).

## References

- [../05-ux/INFORMATION_ARCHITECTURE.md](../05-ux/INFORMATION_ARCHITECTURE.md)  
- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)  
