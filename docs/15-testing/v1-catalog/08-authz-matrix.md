# 08 — AuthZ matrix (7 roles × critical actions)

Legend: **A** = allow (2xx), **D** = deny (403), **—** = not applicable.

Roles: ADM=ADMIN, SAL=SALES, SL=SALES_LEAD, TA=TA, TL=TA_LEAD, HR=HR, HL=HR_LEAD.

Ground truth: Nest `@Roles` on controllers + row-level rules in `requirements.service.ts`. UI: `SECONDARY_TABS` in `Dashboard.jsx`.

## API mutate / sensitive

| ID | Action | Endpoint | ADM | SAL | SL | TA | TL | HR | HL | FR/BR | Actual notes | Status | Bug | Auto |
|----|--------|----------|-----|-----|----|----|----|----|----|-------|--------------|--------|-----|------|
| TC-AZ-001 | Login public | POST /auth/login | A | A | A | A | A | A | A | FR-AUTH-01 | | | | |
| TC-AZ-002 | Users list | GET /users | A | D | D | D | D | D | D | FR-AUTH-04 | | Pass | | yes — authz.integration.spec.ts |
| TC-AZ-003 | Users create | POST /users | A | D | D | D | D | D | D | FR-AUTH-04 | | Pass | | yes — authz.integration.spec.ts |
| TC-AZ-004 | Directory | GET /users/directory | A | A | A | A | A | A | A | FR-MD-10 | | | | |
| TC-AZ-005 | Req create | POST /requirements | A | A | A | D | D | D | D | FR-REQ-01 | | | | |
| TC-AZ-006 | Req PUT | PUT /requirements/:id | A | A* | A | D | D | D | D | FR-REQ-01 | *owner only for SAL | | | |
| TC-AZ-007 | Req PATCH | PATCH /requirements/:id | A | A* | A | A† | A‡ | D | D | FR-REQ-02 | †TA fields; ‡TA Lead fields | | | |
| TC-AZ-008 | Req status | POST /requirements/:id/status | A | A | A | D | D | D | D | FR-REQ-08 | | | | |
| TC-AZ-009 | Pipeline GET | GET /requirements/:id/pipeline | A | A | A | A | A | D | D | FR-CAN-10 | | | | |
| TC-AZ-010 | Cand create | POST /candidates | A | D | D | A | A | D | D | FR-CAN-01 | | | | |
| TC-AZ-011 | Cand select | POST /candidates/:id/select | A | D | D | A | A | D | D | FR-CAN-05 | | | | |
| TC-AZ-012 | Dupes GET | GET /candidates/duplicates | A | D | D | A | A | D | D | FR-CAN-06 | | | | |
| TC-AZ-013 | Offer create | POST /offers | A | D | D | A | A | A | A | FR-OFF-01 | | | | |
| TC-AZ-014 | Offer PATCH | PATCH /offers/:id | A | D | D | D | D | A | A | FR-OFF-02 | | | | |
| TC-AZ-015 | Offer status | POST /offers/:id/status | A | D | D | D | D | A | A | FR-OFF-02 | | | | |
| TC-AZ-016 | Onb create | POST /onboardings | A | D | D | D | D | A | A | FR-ONB-01 | | | | |
| TC-AZ-017 | Onb PATCH | PATCH /onboardings/:id | A | D | D | D | D | A | A | FR-ONB-03 | | | | |
| TC-AZ-018 | Lookup POST | POST /master-data/lookups/:type | A | D | D | D | D | D | D | FR-MD-01 | | | | |
| TC-AZ-019 | Client POST | POST /master-data/clients | A | A | A | D | D | D | D | FR-MD-08 | | | | |
| TC-AZ-020 | Audit GET | GET /audit-logs | A | D | D | D | D | D | D | FR-AUD-02 | | | | |
| TC-AZ-021 | Import validate | POST /imports/validate | A | D | D | D | D | D | D | FR-IMP-01 | | | | |
| TC-AZ-022 | Dashboard | POST /dashboard | A | A | A | A | A | A | A | FR-DASH-01 | JWT any role | | | |

\* Sales PUT/PATCH only own `salesOwnerId` (row-level). Document Fail if other owner's edit returns 200.

## UI tab ACL

| ID | Tab | ADM | SAL | SL | TA | TL | HR | HL | Status | Bug |
|----|-----|-----|-----|----|----|----|----|----|--------|-----|
| TC-AZ-030 | Add Request | Y | Y | Y | N | N | N | N | | |
| TC-AZ-031 | Requirements (Sales) | Y | Y | Y | N | N | N | N | | |
| TC-AZ-032 | Task History | N | Y | Y | N | N | N | N | | |
| TC-AZ-033 | Requirements & Pipeline (Lead) | N | N | N | N | Y | N | N | | |
| TC-AZ-034 | Assign Task | Y | N | N | Y | Y | N | N | | |
| TC-AZ-035 | Offer | Y | N | N | N | N | Y | Y | | |
| TC-AZ-036 | Onboarding | Y | N | N | N | N | Y | Y | | |
| TC-AZ-037 | Users | Y | N | N | N | N | N | N | | |

## Row-level extras (BR-SEC-01)

| ID | FR/BR | Role | Steps | Expected | Status | Bug | Auto |
|----|-------|------|-------|----------|--------|-----|------|
| TC-AZ-040 | BR-SEC-01 | SALES | PUT another sales owner's requirement | 403 | | | |
| TC-AZ-041 | BR-SEC-01 | TA | Access requirement not assigned to self (if enforced) | 403 or filtered out | | | |
| TC-AZ-042 | BR-SEC-01 | HR | Bypass UI: POST /requirements | 403 | | | |

## Execution notes

| Date | Tester | API pass | API fail | UI pass | UI fail |
|------|--------|----------|----------|---------|---------|
| | | | | | |
