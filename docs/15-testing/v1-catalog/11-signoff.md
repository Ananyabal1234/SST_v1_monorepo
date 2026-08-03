# 11 — Sign-off

## Build under test

| Field | Value |
|-------|-------|
| Date | 2026-08-03 |
| Git SHA / branch | `5372ec0` / `main` |
| Tester | Automated API runner + catalog author |
| Environment | local (Compose Postgres + pnpm dev) |
| API health | Pass (`GET /health`) |
| Web | Up (`http://localhost:5173`) |

## Suite results

| Suite | Pass | Fail | Blocked | Skip | Open S1/S2 |
|-------|------|------|---------|------|------------|
| 00 test-data | API Pass (TC-DATA-001–003) | 0 | 0 | UI notes | None |
| 01 smoke | API Pass + Playwright tab smoke | 0 | 0 | Full manual tab matrix | None |
| 02–10 | API Pass (see EXECUTION_RESULTS) | 0 | 0 | See suite files | None |
| 12 UI UAT J1→J3 | — | — | — | **Pending Product** — [12-ui-uat-j1-j3.md](./12-ui-uat-j1-j3.md) | — |
| A–F automation | Unit + 70 IT cases | 0 | 0 | — | None |

Evidence:

- [EXECUTION_RESULTS.md](./EXECUTION_RESULTS.md) — 53/53 API catalog Pass
- `pnpm --filter @sst/api test:integration` — AuthZ + pipeline + module suites
- `pnpm --filter recruitment-dashboard test:e2e` — login / role tabs / open J1–J3 screens
- Full index: [af-suites/README.md](./af-suites/README.md)

## Defects

| Bug ID | Severity | Suite/TC | Summary | Status |
|--------|----------|----------|---------|--------|
| — | — | — | No S1/S2 found in API catalog run | — |

## Accepted v1 deferrals (Should / Could — not Fail)

| ID | Title | Reason deferred |
|----|-------|-----------------|
| FR-AUTH-06 | Failed login rate limiting | Should |
| FR-REQ-04 | Optional intake fields depth | Should |
| FR-CAN-04 | Profile/shortlist dates depth | Should |
| FR-CAN-08 | Pipeline age / candidate RAG | Should |
| FR-OFF-04 | Offer TAT / RAG | Should |
| FR-ONB-05 | Onboarding TAT / RAG | Should |
| FR-DASH-07 | Escalation KPIs depth | Should |
| FR-DASH-08 | Fill rate / avg days to fill | Should |
| FR-IMP-02 | Export CSV | Should |
| FR-NOT-01 | In-app notifications | Should |
| FR-NOT-02 | Email channel | Could |

## Remaining for Product UI UAT

Execute [12-ui-uat-j1-j3.md](./12-ui-uat-j1-j3.md) end-to-end in the browser, then sign below.

## Automation schedule (Phase 3)

| Priority | Scope | Owner | Target date | Status |
|----------|-------|-------|-------------|--------|
| P0 | AuthZ API + pipeline + shared-utils Vitest | Engineering | 2026-08-03 | **Done** |
| P1 | Playwright J1–J3 smoke | Engineering | 2026-08-03 | **Done** |
| A–F | Expanded unit + integration suites | Engineering | 2026-08-03 | **Done** |

## Sign-off

| Role | Name | Date | Decision |
|------|------|------|----------|
| Engineering | Auto catalog + A–F suites | 2026-08-03 | **Pass with waivers** (UI UAT sheet pending Product; Should deferred) |
| Product / QA | _(fill after 12-ui-uat)_ | | Pass / Pass with waivers / Fail |

### How Product / QA signs

1. Run [12-ui-uat-j1-j3.md](./12-ui-uat-j1-j3.md) against the agreed environment.
2. Fill name, date, and decision in the table above.
3. Attach or paste any Fail notes under Defects.

### Waivers (engineering)

| ID | Justification |
|----|---------------|
| UI full AuthZ matrix / UsersScreen depth | Playwright smoke + API AuthZ; full click matrix is Product sheet 12 |
| Should/Could FRs | Explicitly out of Must delivery bar |

Delivery sign-off for **API Must path**: complete, no unwaived S1/S2.  
**Product UI journey**: pending completion of sheet 12.
