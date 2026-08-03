# Execution results — API catalog run

| Field | Value |
|-------|-------|
| Date | 2026-08-03T07:21:55.269Z |
| API | http://localhost:3000 |
| Pass | 53 |
| Fail | 0 |
| Skip | 0 |
| Runner | apps/api/test/manual/run-v1-catalog.mjs |

| ID | Status | Detail |
|----|--------|--------|
| TC-SMK-001 | Pass | {"status":"ok","service":"sst-api"} |
| TC-SMK-003 | Pass | role=ADMIN |
| TC-AUTH-001 | Pass | admin login |
| TC-AUTH-002 | Pass |  |
| TC-AUTH-003 | Pass |  |
| TC-DATA-001 | Pass | 6 QA users ensured |
| TC-DATA-003 | Pass |  |
| TC-MD-002 | Pass |  |
| TC-MD-003 | Pass |  |
| TC-MD-004 | Pass |  |
| TC-MD-005 | Pass |  |
| TC-MD-006 | Pass |  |
| TC-MD-007 | Pass |  |
| TC-DATA-002 | Pass | client=3b57137f-f845-4a70-85d3-6695c7c91eaa jf=8248ea45-a881-4668-9dbc-13d776359716 |
| TC-SMK-login-SALES | Pass |  |
| TC-SMK-login-SALES_LEAD | Pass |  |
| TC-SMK-login-TA | Pass |  |
| TC-SMK-login-TA_LEAD | Pass |  |
| TC-SMK-login-HR | Pass |  |
| TC-SMK-login-HR_LEAD | Pass |  |
| TC-AUTH-011 | Pass | 403 |
| TC-AUTH-013 | Pass | 403 |
| TC-MD-009 | Pass | 403 |
| TC-MD-011 | Pass | 403 |
| TC-MD-014 | Pass | 403 |
| TC-J1-015 | Pass | 403 |
| TC-J2-009 | Pass | 403 |
| TC-AZ-020 | Pass | 403 |
| TC-AZ-021 | Pass | 403 |
| TC-AZ-003 | Pass | 403 |
| TC-AZ-004 | Pass |  |
| TC-AZ-022 | Pass |  |
| TC-DSH-009 | Pass |  |
| TC-J1-001 | Pass | id=af674d14-2fd2-426d-8030-f49826ef8639 open=2 closed=0 status=ACTIVE |
| TC-J1-014 | Pass | open=2 closed=0 |
| TC-TAL-002 | Pass |  |
| TC-J1-012 | Pass |  |
| TC-TAL-003 | Pass | status=403 |
| TC-J2-001 | Pass | cand=0f0bae82-4056-4e39-bf33-7a420fbeac5d |
| TC-J2-003 | Pass | status=200 |
| TC-J2-005 | Pass |  |
| TC-J3-001 | Pass | offer=ff93bc23-cdb1-40ef-8e94-87afad5bfd64 |
| TC-J3-003 | Pass |  |
| TC-J3-004 | Pass |  |
| TC-J3-005 | Pass | onb=e95e273a-ef68-4d8f-bcd4-47c05d28d99b status=409 |
| TC-J3-006 | Pass |  |
| TC-J3-008 | Pass |  |
| TC-J3-010 | Pass | open=1 closed=1 status=ACTIVE |
| TC-J1-014b | Pass | recount after join |
| TC-J2-007 | Pass | status=400 |
| TC-AUD-001 | Pass | status=200 |
| TC-IMP-001 | Pass | status=201 |
| TC-AZ-005-deny-TA | Pass | status=403 |

UI-only cases (smoke tabs, UsersScreen validation, KPI modals) remain manual in suite markdown files.
