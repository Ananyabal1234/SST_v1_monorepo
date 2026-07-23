# Functional Requirements — SST MVP

## Purpose

Specify what the system must do for MVP, traced to the Excel workbook.

## Audience

Product, engineers, QA.

## Scope

**MVP** functional requirements only. Future modules listed as out-of-scope pointers.

## Definitions

| ID prefix | Area |
|-----------|------|
| FR-AUTH | Authentication |
| FR-MD | Master data |
| FR-REQ | Requirements |
| FR-CAN | Candidates |
| FR-OFF | Offers |
| FR-ONB | Onboarding |
| FR-DASH | Dashboard |
| FR-AUD | Audit |
| FR-IMP | Import/export |
| FR-NOT | Notifications |

---

## FR-AUTH — Authentication & users

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | Users sign in with email + password | Must |
| FR-AUTH-02 | System issues short-lived JWT access token + refresh token | Must |
| FR-AUTH-03 | Refresh rotates access token; revoke refresh on logout | Must |
| FR-AUTH-04 | Admin can create/disable users and assign roles | Must |
| FR-AUTH-05 | Password stored with strong hash (bcrypt/argon2) | Must |
| FR-AUTH-06 | Failed login rate limiting | Should |

## FR-MD — Master data (Setup Lists)

| ID | Requirement | Excel source | Priority |
|----|-------------|--------------|----------|
| FR-MD-01 | Manage Priority values | Setup Lists | Must |
| FR-MD-02 | Manage Candidate Stage values | Setup Lists | Must |
| FR-MD-03 | Manage Feedback values | Setup Lists | Must |
| FR-MD-04 | Manage Offer Status values | Setup Lists | Must |
| FR-MD-05 | Manage Onboarding Status values | Setup Lists | Must |
| FR-MD-06 | Manage BGV Status values | Setup Lists | Must |
| FR-MD-07 | Manage Requirement Status values | Setup Lists | Must |
| FR-MD-08 | Manage Clients (normalized unique) | Client column | Must |
| FR-MD-09 | Manage Job Families | Job Family | Must |
| FR-MD-10 | Manage HR / TA / Sales owner directories | Setup Lists | Must |
| FR-MD-11 | Yes/No enums available for boolean-like fields | YesNo | Must |

## FR-REQ — Requirement Intake

| ID | Requirement | Excel columns | Priority |
|----|-------------|---------------|----------|
| FR-REQ-01 | Create requirement with client, role/skill, job family, #positions, sales owner, priority | A–H | Must |
| FR-REQ-02 | Assign TA owner and TA handoff date | I–J | Must |
| FR-REQ-03 | Set target closure date | K | Must |
| FR-REQ-04 | Store remarks, experience, location, min/max budget, duration | P–U | Should |
| FR-REQ-05 | Compute requirement age (days since requirement date) | Requirement Age | Must |
| FR-REQ-06 | Compute TA Handoff SLA RAG | TA Handoff SLA | Must |
| FR-REQ-07 | Compute open/closed positions | Open/Closed Positions | Must |
| FR-REQ-08 | Set requirement status (Active, On Hold, Cancelled, Closed) | Requirement Status | Must |
| FR-REQ-09 | List/filter/sort/search requirements | Dashboard filters | Must |
| FR-REQ-10 | Soft-delete or cancel with audit | — | Must |

## FR-CAN — TA Candidate Pipeline

| ID | Requirement | Excel columns | Priority |
|----|-------------|---------------|----------|
| FR-CAN-01 | Add candidate linked to Req ID | Req ID | Must |
| FR-CAN-02 | Capture name, mobile, email, source | Candidate fields | Must |
| FR-CAN-03 | Track candidate stage and feedback | Stage, Latest Feedback | Must |
| FR-CAN-04 | Track profile submitted / shortlist dates, interview round | Dates, Interview Round | Should |
| FR-CAN-05 | Mark Selected? Yes/No | Selected? | Must |
| FR-CAN-06 | Detect duplicate mobile across pipeline | Duplicate Mobile? | Must |
| FR-CAN-07 | Detect duplicate email across pipeline | Duplicate Email? | Must |
| FR-CAN-08 | Compute pipeline age and candidate RAG | Pipeline Age, Candidate RAG | Should |
| FR-CAN-09 | Prefill client/role/owners from requirement | Lookup columns | Must |
| FR-CAN-10 | List candidates by requirement and global filters | — | Must |

## FR-OFF — Offer & Selection

| ID | Requirement | Excel columns | Priority |
|----|-------------|---------------|----------|
| FR-OFF-01 | Create offer only for selected candidates | Selected flow | Must |
| FR-OFF-02 | Track offer initiated/released dates and status | Offer dates/status | Must |
| FR-OFF-03 | Capture CTC/Rate, expected DOJ, remarks | CTC/Rate, DOJ | Must |
| FR-OFF-04 | Compute offer TAT and offer RAG | Offer TAT, Offer RAG | Should |
| FR-OFF-05 | On Accepted, enable onboarding creation | Accepted flow | Must |
| FR-OFF-06 | Prevent conflicting offers rules per business rules | — | Must |

## FR-ONB — HR Onboarding

| ID | Requirement | Excel columns | Priority |
|----|-------------|---------------|----------|
| FR-ONB-01 | Create onboarding from accepted offer | Flow | Must |
| FR-ONB-02 | Assign HR owner | HR Owner | Must |
| FR-ONB-03 | Track docs pending, BGV status, joining formalities | Docs/BGV/Formalities | Must |
| FR-ONB-04 | Capture expected/actual DOJ and onboarding status | DOJ fields | Must |
| FR-ONB-05 | Compute onboarding TAT days and RAG | TAT, RAG | Should |
| FR-ONB-06 | On Joined, increment closed positions logic | Closed Positions | Must |

## FR-DASH — Dashboard

| ID | Requirement | Excel KPI | Priority |
|----|-------------|-----------|----------|
| FR-DASH-01 | Show total requirements, positions, open/closed | KPI cards | Must |
| FR-DASH-02 | Show pending sales handoff count | Pending Sales Handoff | Must |
| FR-DASH-03 | Show candidates in pipeline, selected, offers, joined | KPI cards | Must |
| FR-DASH-04 | Show duplicate mobiles count | Duplicate Mobiles | Must |
| FR-DASH-05 | Candidate stage summary | Stage table | Must |
| FR-DASH-06 | Requirement RAG summary | RAG table | Must |
| FR-DASH-07 | At-risk / overdue / cancelled / wasted sourcing metrics | Escalation KPIs | Should |
| FR-DASH-08 | Fill rate and avg days to fill | Fill rate KPIs | Should |
| FR-DASH-09 | Filters: TA Owner, Sales Owner, Priority, Client, Job Family, date range | Filters | Must |

## FR-AUD — Audit

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUD-01 | Log create/update/status changes with actor, timestamp, before/after | Must |
| FR-AUD-02 | Admin can query audit by entity type/id | Must |

## FR-IMP — Import / export

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-IMP-01 | Import requirements/candidates from CSV mapped to Excel columns | Must |
| FR-IMP-02 | Export filtered lists to CSV | Should |
| FR-IMP-03 | Import validation report (errors/warnings) | Must |

## FR-NOT — Notifications (MVP stub)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NOT-01 | Persist in-app notifications for TA handoff and SLA breach | Should |
| FR-NOT-02 | Email channel optional and feature-flagged | Could |

## Explicitly out of scope (Future)

FR-* for Bench, Skills Matrix, Capacity Planning, Availability, Workload, Assignments — see [../04-domain/FUTURE_MODULES.md](../04-domain/FUTURE_MODULES.md).

## Examples

Creating a requirement must accept at minimum:

```json
{
  "requirementDate": "2026-07-07",
  "clientId": "...",
  "roleSkill": "Core Python Developer",
  "jobFamilyId": "...",
  "numberOfPositions": 5,
  "salesOwnerId": "...",
  "priority": "High"
}
```

## Best practices

- Prefer server-computed derived fields (age, RAG, open/closed) over trusting client.
- Never allow orphan candidates/offers without parent references.

## References

- Excel sheets Requirement Intake, TA Candidate Pipeline, Offer & Selection, HR Onboarding, Dashboard, Setup Lists  
- [BUSINESS_RULES.md](./BUSINESS_RULES.md)  
- [REQUIREMENT_TRACEABILITY_MATRIX.md](./REQUIREMENT_TRACEABILITY_MATRIX.md)  
