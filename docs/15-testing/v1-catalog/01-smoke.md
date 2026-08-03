# 01 — Smoke

## Purpose

Verify boot, health, login, and role-correct sidebar tabs.

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-SMK-001 | — | — | Stack running | GET http://localhost:3000/health | 200 `{ "status":"ok" }` | | | | |
| TC-SMK-002 | — | — | Stack running | Open http://localhost:5173/login | Login form renders | | | | |
| TC-SMK-003 | FR-AUTH-01 | ADMIN | Valid admin creds | Login with SEED_ADMIN_* | Lands on Dashboard; role pill Admin | | | | |
| TC-SMK-004 | FR-AUTH-01 | SALES | TC-DATA-001 | Login qa.sales | Tabs: Dashboard, Add Request, Requirements, Task History; no Users/Offer/Assign | | | | |
| TC-SMK-005 | FR-AUTH-01 | SALES_LEAD | TC-DATA-001 | Login qa.saleslead | Same tabs as Sales | | | | |
| TC-SMK-006 | FR-AUTH-01 | TA | TC-DATA-001 | Login qa.ta | Tabs: Dashboard, Assign Task only | | | | |
| TC-SMK-007 | FR-AUTH-01 | TA_LEAD | TC-DATA-001 | Login qa.talead | Tabs: Dashboard, Requirements & Pipeline, Assign Task | | | | |
| TC-SMK-008 | FR-AUTH-01 | HR | TC-DATA-001 | Login qa.hr | Tabs: Dashboard, Offer, Onboarding | | | | |
| TC-SMK-009 | FR-AUTH-01 | HR_LEAD | TC-DATA-001 | Login qa.hrlead | Tabs: Dashboard, Offer, Onboarding | | | | |
| TC-SMK-010 | FR-AUTH-01 | ADMIN | Admin login | Confirm tabs include Add, Requirements, Assign Task, Offer, Onboarding, Users | All present | | | | |
| TC-SMK-011 | FR-AUTH-01 | ALL | Each role | Logout; session cleared; redirect to login | Cannot open /dashboard without auth | | | | |
| TC-SMK-012 | FR-AUTH-01 | — | — | Login with wrong password | Error; no dashboard | | | | |

## Execution notes

| Date | Tester | Pass count | Fail count |
|------|--------|------------|------------|
| | | | |
