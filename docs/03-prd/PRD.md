# Product Requirements Document (PRD) — SST MVP

## Purpose

Product-facing specification of what to build, why, and how success is measured for MVP.

## Audience

Product, engineering, QA, stakeholders.

## Scope

MVP release. Future modules summarized for roadmap only.

## Definitions

See [../README.md](../README.md).

---

## 1. Summary

SST MVP replaces `Service_Staffing_Tracker_Updated Version.xlsx` with a multi-user web application covering requirement intake through join, plus dashboard, masters, auth, RBAC, and audit.

## 2. Problem

Excel cannot safely support concurrent operators, access control, audit, or sustainable growth into staffing platform capabilities.

## 3. Goals / non-goals

### Goals

- Excel process parity for pipeline sheets  
- Faster multi-user operations  
- Trustworthy KPIs  
- Secure access and audit  

### Non-goals (MVP)

- Workforce bench/capacity/assignments  
- Cloud production  
- Full ATS  
- SSO  

## 4. Users

Sales, TA, HR, Admin, Leadership readonly — see Personas doc.

## 5. User stories (executive)

| ID | Story |
|----|-------|
| US-1 | As Sales, I create a client requirement so TA can staff it |
| US-2 | As TA, I manage candidates and select one without duplicate surprises |
| US-3 | As HR, I release offers and onboard joiners |
| US-4 | As Leadership, I filter dashboards to see risk and fill rate |
| US-5 | As Admin, I manage users, roles, and setup lists |

Detailed stories: [../12-planning/EPICS_AND_STORIES.md](../12-planning/EPICS_AND_STORIES.md).

## 6. Features (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| Auth | Login, refresh, logout | P0 |
| Users & roles | Admin management | P0 |
| Master data | Setup lists + clients/job families | P0 |
| Requirements | Full intake + SLA | P0 |
| Candidates | Pipeline + duplicates + selection | P0 |
| Offers | Lifecycle + TAT | P0 |
| Onboarding | Docs/BGV/DOJ | P0 |
| Dashboard | KPI parity + filters | P0 |
| Audit | Mutation trail | P0 |
| Import/Export | CSV bridge from Excel | P0 |
| Notifications | In-app stubs | P1 |
| Dark mode | Theme | P2 |

## 7. UX principles

- Dense, table-first, Excel-familiar  
- Filters always visible on list/dashboard  
- Derived fields read-only with help text  
- Destructive actions confirmed  

Wireframes: [../05-ux/WIREFRAMES.md](../05-ux/WIREFRAMES.md).

## 8. Analytics / metrics product cares about

Fill rate, open positions, SLA RAG mix, duplicates, offers accepted, joined count, overdue requirements, wasted sourcing.

## 9. Release plan

| Milestone | Outcome |
|-----------|---------|
| M1 | Auth, masters, requirements |
| M2 | Candidates, selection, duplicates |
| M3 | Offers, onboarding |
| M4 | Dashboard, import, observability, CI |

See [../12-planning/SPRINT_AND_MILESTONES.md](../12-planning/SPRINT_AND_MILESTONES.md).

## 10. Risks

Scope creep into Future modules; KPI drift from Excel; PII handling.

## 11. Open questions (defaults)

| Topic | Default |
|-------|---------|
| Manual closedPositions override | No; derived |
| Duplicate hard-block vs warn | Warn + allow with reason (TA/Admin) |
| Soft delete UX | Hide by default; Admin can restore |

## 12. Success criteria for MVP exit

1. Operators complete J1–J3 without Excel.  
2. Dashboard KPIs match Excel on seeded sample (± documented formula differences).  
3. RBAC verified by permission tests.  
4. Audit present for create/update/status.  
5. CSV import of requirements/candidates works with error report.

## Decision rationale

Ship pipeline SoR first; keep architecture seams for Future modules without committing UI/API surface in MVP.

## References

- Vision, Charter, FRs, SRS  
- Excel workbook  
