# Requirement Traceability Matrix (RTM)

## Purpose

Trace Excel fields and FR IDs to domain entities, APIs, and UI screens for MVP completeness.

## Audience

Engineers, QA, auditors of scope.

## Scope

MVP only. Future modules not traced here.

## Definitions

| Column | Meaning |
|--------|---------|
| Excel | Source sheet/column |
| FR | Functional requirement ID |
| Entity | Domain/DB entity |
| API | Primary endpoint family |
| UI | Screen |

---

## Requirement Intake

| Excel column | FR | Entity.field | API | UI |
|--------------|----|--------------|-----|-----|
| Req ID | FR-REQ-01 | Requirement.publicId | `/requirements` | Requirements list/detail |
| Requirement Date | FR-REQ-01 | requirementDate | same | form |
| Client Name | FR-REQ-01 | clientId | same | form select |
| Role/Skill | FR-REQ-01 | roleSkill | same | form |
| Job Family | FR-REQ-01 | jobFamilyId | same | form |
| Number Of Positions | FR-REQ-01 | numberOfPositions | same | form |
| Sales Owner | FR-REQ-01 | salesOwnerId | same | form |
| Priority | FR-REQ-01 | priority | same | form |
| TA Owner | FR-REQ-02 | taOwnerId | same | form |
| TA Handoff Date | FR-REQ-02 | taHandoffDate | same | form |
| Target Closure Date | FR-REQ-03 | targetClosureDate | same | form |
| Requirement Age | FR-REQ-05 | derived | GET detail | read-only |
| TA Handoff SLA | FR-REQ-06 | derived RAG | GET detail | badge |
| Open Positions | FR-REQ-07 | derived | GET detail | read-only |
| Closed Positions | FR-REQ-07 | derived | GET detail | read-only |
| Remarks | FR-REQ-04 | remarks | same | form |
| Experience | FR-REQ-04 | experience | same | form |
| Job Location | FR-REQ-04 | jobLocation | same | form |
| Min/Max Budget | FR-REQ-04 | minBudget/maxBudget | same | form |
| Duration of Project | FR-REQ-04 | durationMonths | same | form |
| Requirement Status | FR-REQ-08 | status | PATCH status | status control |
| Has TA Activity | helper | derived | GET | hidden/debug |
| Closure Status | helper | derived | GET | warning |

## TA Candidate Pipeline

| Excel column | FR | Entity.field | API | UI |
|--------------|----|--------------|-----|-----|
| Candidate ID | FR-CAN-01 | Candidate.publicId | `/candidates` | Candidates |
| Req ID | FR-CAN-01 | requirementId | same | form |
| Client/Role/Job Family/Owners | FR-CAN-09 | snapshot/FK | same | read-only |
| Candidate Name | FR-CAN-02 | name | same | form |
| Mobile Number | FR-CAN-02 | mobile | same | form |
| Email Address | FR-CAN-02 | email | same | form |
| Source | FR-CAN-02 | source | same | form |
| Candidate Stage | FR-CAN-03 | stage | same | select |
| Profile Submitted Date | FR-CAN-04 | profileSubmittedDate | same | form |
| Client Shortlist Date | FR-CAN-04 | clientShortlistDate | same | form |
| Interview Round | FR-CAN-04 | interviewRound | same | form |
| Latest Feedback | FR-CAN-03 | feedback | same | select |
| Selected? | FR-CAN-05 | selected | same | toggle |
| Duplicate Mobile/Email? | FR-CAN-06/07 | derived | same | warning badge |
| Pipeline Age / Candidate RAG | FR-CAN-08 | derived | same | badges |
| Remarks | — | remarks | same | form |

## Offer & Selection

| Excel column | FR | Entity.field | API | UI |
|--------------|----|--------------|-----|-----|
| Offer ID | FR-OFF-01 | Offer.publicId | `/offers` | Offers |
| Candidate ID / Req ID | FR-OFF-01 | FKs | same | read-only |
| Candidate Name/Mobile/Email | snapshot | snapshot | same | read-only |
| Selected Date | — | selectedDate | same | |
| Offer Initiated/Released Date | FR-OFF-02 | dates | same | form |
| Offer Status | FR-OFF-02 | status | same | select |
| CTC/Rate | FR-OFF-03 | ctcRate | same | form |
| Offer TAT / RAG | FR-OFF-04 | derived | same | badges |
| Expected DOJ | FR-OFF-03 | expectedDoj | same | form |
| Remarks | — | remarks | same | form |

## HR Onboarding

| Excel column | FR | Entity.field | API | UI |
|--------------|----|--------------|-----|-----|
| Onboarding ID | FR-ONB-01 | Onboarding.publicId | `/onboardings` | Onboarding |
| Candidate/Req | FR-ONB-01 | FKs | same | |
| HR Owner | FR-ONB-02 | hrOwnerId | same | select |
| Offer Accepted Date | — | offerAcceptedDate | same | |
| Expected/Actual DOJ | FR-ONB-04 | doj fields | same | form |
| Docs Pending? | FR-ONB-03 | docsPending | same | toggle |
| BGV Status | FR-ONB-03 | bgvStatus | same | select |
| Joining Formalities | FR-ONB-03 | joiningFormalities | same | form |
| Onboarding Status | FR-ONB-04 | status | same | select |
| Onboarding TAT / RAG | FR-ONB-05 | derived | same | badges |

## Dashboard KPIs

| Excel KPI | FR | API | UI |
|-----------|----|-----|-----|
| Total Requirements/Positions/Open/Closed | FR-DASH-01 | `/dashboard` | Dashboard |
| Pending Sales Handoff | FR-DASH-02 | same | card |
| Candidates/Selected/Offers/Joined | FR-DASH-03 | same | cards |
| Duplicate Mobiles | FR-DASH-04 | same | card |
| Stage summary / RAG summary | FR-DASH-05/06 | `/dashboard` | tables |
| At risk / overdue / cancelled / wasted | FR-DASH-07 | same | escalations |
| Fill rate / avg days to fill | FR-DASH-08 | same | KPIs |
| Filters | FR-DASH-09 | query params | filter bar |

## Setup Lists / Auth / Audit

| Capability | FR | API | UI |
|------------|----|-----|-----|
| Masters | FR-MD-* | `/master-data/*` | Admin |
| Auth | FR-AUTH-* | `/auth/*` | Login |
| Users | FR-AUTH-04 | `/users` | Admin users |
| Audit | FR-AUD-* | `/audit-logs` | Admin audit |
| Import | FR-IMP-* | `/imports` | Admin import |

## Coverage statement

All Excel operational columns required for MVP flow are mapped. Helper-only Excel columns become derived API fields (not editable inputs).

## References

- [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md)  
- Excel workbook sheets  
