# SST v1 Manual Test Catalog (C + Must)

## Purpose

Delivery-ready manual test pack for Must FRs, all 7 roles, and critical business rules. Execute against a running local stack, then automate highest-risk cases (see Phase 3 in the testing plan).

## Scope

| In scope | Out of scope |
|----------|--------------|
| Must FRs (AUTH, MD, REQ, CAN, OFF, ONB, DASH, AUD, IMP) | Should / Could FRs |
| Roles: ADMIN, SALES, SALES_LEAD, TA, TA_LEAD, HR, HR_LEAD | Load / perf / full OWASP |
| Critical BRs (REQ/CAN/OFF/ONB/SEC) | Unreachable legacy RoleScreen tabs |

## Environment

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| API | http://localhost:3000 |
| Health | http://localhost:3000/health |
| Swagger | http://localhost:3000/api/docs |
| API prefix | `/api/v1` |

Bootstrap: Postgres via Compose, `pnpm db:seed`, `pnpm dev`. Test users: [00-test-data.md](./00-test-data.md).

## Case format

`TC-{SUITE}-{NNN}`

| Column | Meaning |
|--------|---------|
| ID | Unique case id |
| FR/BR | Traceability id(s) |
| Role | Actor role |
| Preconditions | Data / login state |
| Steps | UI and/or API |
| Expected | Pass criteria |
| Actual | Filled during execution |
| Status | Pass / Fail / Blocked / Skip / N/A |
| Bug | Defect id if Fail |
| Auto | `yes` + test path when automated |

## Severity

| Code | Meaning | Sign-off |
|------|---------|----------|
| S1 | Auth bypass, data loss, wrong closed-position counts | Blocks |
| S2 | Journey broken for a role, systematic 403/200 wrong | Blocks unless waived |
| S3 | Workaround exists | May ship with note |
| S4 | Cosmetic | May ship |

## Execution order

1. [00-test-data.md](./00-test-data.md)  
2. [01-smoke.md](./01-smoke.md)  
3. [02-auth-users.md](./02-auth-users.md) → [03-master-data.md](./03-master-data.md)  
4. [04-j1-sales.md](./04-j1-sales.md) → [05-ta-lead-assign.md](./05-ta-lead-assign.md) → [06-j2-ta.md](./06-j2-ta.md) → [07-j3-hr.md](./07-j3-hr.md)  
5. [08-authz-matrix.md](./08-authz-matrix.md)  
6. [09-dashboard.md](./09-dashboard.md)  
7. [10-audit-import.md](./10-audit-import.md)  
8. [11-signoff.md](./11-signoff.md)  
9. [12-ui-uat-j1-j3.md](./12-ui-uat-j1-j3.md) — **Product/QA** browser UAT  

Do not skip ahead of the vertical slice (04–07) before AuthZ/dashboard. Product signs after sheet 12.

## How to re-run automated slices

```bash
# Unit (Phase A)
pnpm --filter @sst/shared-utils test
pnpm --filter @sst/shared-types test

# API Must catalog (live API)
node apps/api/test/manual/run-v1-catalog.mjs

# Full A–F integration (API must be up) — 70+ cases
pnpm --filter @sst/api test:integration

# P1 Playwright (API + Vite; Playwright can start Vite)
pnpm --filter recruitment-dashboard test:e2e
```

Index: [af-suites/README.md](./af-suites/README.md)

## Exit criteria

- Every Must FR mapped in [TRACEABILITY.md](./TRACEABILITY.md) has Pass evidence (or N/A = defect).
- Suites 01–10 executed; no open S1/S2 without waiver.
- AuthZ matrix complete for critical mutate paths.
- J1 + TA Lead + J2 + J3 green.
- [11-signoff.md](./11-signoff.md) completed; Should deferrals listed.
- Delivery sign-off requires catalog execution; P0/P1 automation is in-repo.

## References

- [../TESTING_STRATEGY.md](../TESTING_STRATEGY.md)  
- [../../01-business-analysis/FUNCTIONAL_REQUIREMENTS.md](../../01-business-analysis/FUNCTIONAL_REQUIREMENTS.md)  
- [../../01-business-analysis/BUSINESS_RULES.md](../../01-business-analysis/BUSINESS_RULES.md)  
- [../../11-security/PERMISSION_MATRIX.md](../../11-security/PERMISSION_MATRIX.md)  
