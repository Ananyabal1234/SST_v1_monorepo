# 12 — Product / QA UI UAT (J1→J3)

Short click-path for stakeholder sign-off. Run against a live stack (`pnpm dev` or Docker prod Compose).

## Preconditions

| Item | Value |
|------|-------|
| Web | http://localhost:5173 (dev) or http://localhost (Docker web port 80) |
| API | http://localhost:3000/health → `ok` |
| QA password | From [00-test-data.md](./00-test-data.md) (default used in automation: `TestUser123!`) |
| Users | `qa.sales@sst.test`, `qa.talead@sst.test`, `qa.ta@sst.test`, `qa.hr@sst.test` (create via Admin Users if missing) |

Create client **QA Client Alpha** and job family **QA Engineering** if not present (Add Request or Admin).

## Results legend

Pass / Fail / Blocked — fill **Actual** and **Notes**.

---

## A. Role smoke (tabs)

| ID | Role | Login | Expected tabs (besides Dashboard) | Actual | Status | Notes |
|----|------|-------|-------------------------------------|--------|--------|-------|
| UAT-SMK-01 | SALES | qa.sales@sst.test | Add Request, Requirements, Task History | | | |
| UAT-SMK-02 | TA_LEAD | qa.talead@sst.test | Requirements & Pipeline, Assign Task | | | |
| UAT-SMK-03 | TA | qa.ta@sst.test | Assign Task | | | |
| UAT-SMK-04 | HR | qa.hr@sst.test | Offer, Onboarding | | | |
| UAT-SMK-05 | — | Wrong password | Error; stay on login | | | |

---

## B. J1 — Sales creates requirement

| ID | Steps | Expected | Actual | Status | Notes |
|----|-------|----------|--------|--------|-------|
| UAT-J1-01 | Login as Sales → **Add Request** | Form loads | | | |
| UAT-J1-02 | Fill client, role/skill, job family, positions=2, priority, sales owner=self → submit | Success; requirement appears under **Requirements** | | | |
| UAT-J1-03 | Open requirement; note public id (e.g. REQ-…) | ACTIVE; open positions = 2 | | | |
| UAT-J1-04 | Assign to TA Lead(s) or set handoff + owners as UI allows | Handoff / owners saved | | | |

Record requirement id / public id: _______________

---

## C. TA Lead assign

| ID | Steps | Expected | Actual | Status | Notes |
|----|-------|----------|--------|--------|-------|
| UAT-TAL-01 | Login as TA Lead → **Requirements & Pipeline** | Sees queue / list | | | |
| UAT-TAL-02 | Open fixture req → assign **QA TA** as owner → save | TA can later open it in Assign Task | | | |

---

## D. J2 — TA pipeline

| ID | Steps | Expected | Actual | Status | Notes |
|----|-------|----------|--------|--------|-------|
| UAT-J2-01 | Login as TA → **Assign Task** → select fixture requirement | Pipeline / table loads | | | |
| UAT-J2-02 | Add candidate (name, mobile, email, stage) | Candidate saved | | | |
| UAT-J2-03 | Mark Selected; set LOI to Received (or equivalent so offer can proceed) | Selected; offer eligible | | | |

---

## E. J3 — HR offer → join

| ID | Steps | Expected | Actual | Status | Notes |
|----|-------|----------|--------|--------|-------|
| UAT-J3-01 | Login as HR → **Offer** | See / open offer for selected candidate | | | |
| UAT-J3-02 | Update CTC / dates; set status **Accepted** | Moves toward onboarding | | | |
| UAT-J3-03 | Open **Onboarding**; set BGV/docs as needed; set actual DOJ; status **Joined** | Joined succeeds | | | |
| UAT-J3-04 | As Sales or Admin, reopen requirement | closedPositions ≥ 1; open reduced; still ACTIVE if positions=2 | | | |

---

## F. Dashboard

| ID | Steps | Expected | Actual | Status | Notes |
|----|-------|----------|--------|--------|-------|
| UAT-DSH-01 | Any role → Dashboard overview | KPI cards render | | | |
| UAT-DSH-02 | Apply one filter (e.g. Client = QA Client Alpha) | UI refreshes without crash | | | |
| UAT-DSH-03 | Click one KPI card | Detail list/modal opens | | | |

---

## Sign-off for this sheet

| Field | Value |
|-------|-------|
| Tester name | |
| Date | |
| Environment (dev / Docker) | |
| Overall | Pass / Pass with waivers / Fail |
| Blocking issues | |

Engineering automation already covers API Must path and Playwright login/tab smoke (`pnpm --filter recruitment-dashboard test:e2e`). This sheet is for **human Product/QA** confirmation of the full UI journey.
