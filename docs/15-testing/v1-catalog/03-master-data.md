# 03 — Master data (FR-MD Must)

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-MD-001 | FR-MD-01 | ADMIN | Admin token | POST lookup PRIORITY value; GET list | Created; visible | | | | |
| TC-MD-002 | FR-MD-02 | ADMIN | Admin token | Ensure CANDIDATE_STAGE values exist (seed or POST) | Stages available for candidate form | | | | |
| TC-MD-003 | FR-MD-03 | ADMIN | Admin token | FEEDBACK lookups readable | Values present | | | | |
| TC-MD-004 | FR-MD-04 | ADMIN | Admin token | OFFER_STATUS lookups readable | Values present | | | | |
| TC-MD-005 | FR-MD-05 | ADMIN | Admin token | ONBOARDING_STATUS lookups readable | Values present | | | | |
| TC-MD-006 | FR-MD-06 | ADMIN | Admin token | BGV_STATUS lookups readable | Values present | | | | |
| TC-MD-007 | FR-MD-07 | ADMIN | Admin token | REQUIREMENT_STATUS lookups readable | Values present | | | | |
| TC-MD-008 | FR-MD-08, BR-MD-02 | SALES | Sales token | POST `/master-data/clients` with name `  Qa Dup Client  `; try duplicate casefold | First succeeds; duplicate rejected or normalized unique | | | | |
| TC-MD-009 | FR-MD-08 | TA | TA token | POST `/master-data/clients` | 403 | | | | |
| TC-MD-010 | FR-MD-09 | SALES_LEAD | Lead token | POST `/master-data/job-families` | 201; appears in GET | | | | |
| TC-MD-011 | FR-MD-09 | HR | HR token | POST `/master-data/job-families` | 403 | | | | |
| TC-MD-012 | FR-MD-10 | ANY auth | — | GET ta-members, sales-members, hr-members, ta-lead-members | 200; directories non-empty after DATA setup | | | | |
| TC-MD-013 | FR-MD-11 | ANY | — | Boolean-like fields in UI/API use Yes/No or boolean consistently | Forms accept expected values | | | | |
| TC-MD-014 | FR-MD-01 | TA | TA token | POST `/master-data/lookups/PRIORITY` | 403 | | | | |
| TC-MD-015 | FR-MD-02 | TA / TA_LEAD | — | GET `/master-data/candidate-status` | 200 | | | | |

## Execution notes

| Date | Tester | Pass | Fail |
|------|--------|------|------|
| | | | |
