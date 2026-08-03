# 00 — Test data setup

## Purpose

Create the seven role personas and shared masters used by all suites.

## Default passwords

Use a single strong password for all test personas (example: `TestUser123!`). Do not commit real production secrets.

| Email | Role | Notes |
|-------|------|-------|
| from `SEED_ADMIN_EMAIL` | ADMIN | Created by `pnpm db:seed` |
| `qa.sales@sst.test` | SALES | Create via Admin Users |
| `qa.saleslead@sst.test` | SALES_LEAD | Create via Admin Users |
| `qa.ta@sst.test` | TA | Create via Admin Users |
| `qa.talead@sst.test` | TA_LEAD | Create via Admin or `SEED_TA_LEAD_*` |
| `qa.hr@sst.test` | HR | Create via Admin Users |
| `qa.hrlead@sst.test` | HR_LEAD | Create via Admin Users |

## Cases

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-DATA-001 | FR-AUTH-04 | ADMIN | Seed complete; admin can login | Login as admin; open Users; create the six QA emails with roles above; password ≥ 8 chars | All six users exist, active, correct role | | | | |
| TC-DATA-002 | FR-MD-08, FR-MD-09 | ADMIN/SALES | Users exist | Create client `QA Client Alpha` and job family `QA Engineering` (UI Add Request or master-data API) | Client and job family listed in dropdowns | | | | |
| TC-DATA-003 | FR-MD-01–07 | ADMIN | Seed lookups | GET `/api/v1/master-data/lookups/PRIORITY` (and REQUIREMENT_STATUS, CANDIDATE_STAGE, OFFER_STATUS, ONBOARDING_STATUS, BGV_STATUS, FEEDBACK) | Each returns ≥1 active values | | | | |
| TC-DATA-004 | FR-MD-10 | ADMIN | Users exist | GET `ta-members`, `ta-lead-members`, `sales-members`, `hr-members` | QA TA/TA_LEAD/SALES/HR appear in directories | | | | |
| TC-DATA-005 | — | ADMIN | Ready for journeys | Note fixture ids: `CLIENT_ID`, `JOB_FAMILY_ID`, user ids for sales/ta/talead/hr | Recorded in execution notes below | | | | |

## Fixture for KPI assertions (after J1–J3)

Use one end-to-end requirement created in suites 04–07:

| Field | Suggested value |
|-------|-----------------|
| Client | QA Client Alpha |
| Role/skill | QA Pipeline Engineer |
| Positions | 2 |
| Sales owner | qa.sales@sst.test |
| Priority | High |
| After J3 | 1 Joined → openPositions=1, closedPositions=1, status still ACTIVE |
| Optional second join | 2nd Joined → CLOSED / FILLED |

## Execution notes

| Date | Tester | Notes |
|------|--------|-------|
| | | |

## API helpers

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "<admin>", "password": "<seed>" }
```

```http
POST /api/v1/users
Authorization: Bearer <token>
Content-Type: application/json

{ "email": "qa.sales@sst.test", "fullName": "QA Sales", "role": "SALES", "password": "TestUser123!" }
```
