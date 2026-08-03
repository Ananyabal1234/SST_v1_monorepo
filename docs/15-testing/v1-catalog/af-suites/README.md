# Full A–F automated suite index

Tests only — no product code changes. Live API + Postgres required for IT-*.

## Commands

```bash
pnpm --filter @sst/shared-utils test
pnpm --filter @sst/shared-types test
# API must be up:
pnpm --filter @sst/api test:integration
```

## Phase A — Unit

| IDs | File |
|-----|------|
| UT-NORM, UT-DAY, UT-OPEN, UT-SLA, UT-CLS, UT-DER, UT-PID | `packages/shared-utils/src/requirement-metrics.spec.ts` |
| UT-ZOD-* | `packages/shared-types/src/requirement.schema.spec.ts` |

## Phase B — AuthZ

| IDs | File |
|-----|------|
| IT-AZ-001…024 | `apps/api/test/integration/authz.integration.spec.ts` |

## Phase C — Requirements / Candidates

| IDs | File |
|-----|------|
| IT-REQ-* | `apps/api/test/integration/requirements.integration.spec.ts` |
| IT-CAN-* | `apps/api/test/integration/candidates.integration.spec.ts` |
| J1→J3 happy path | `apps/api/test/integration/pipeline.integration.spec.ts` |

## Phase D — Offers / Onboarding

| IDs | File |
|-----|------|
| IT-OFF-* | `apps/api/test/integration/offers.integration.spec.ts` |
| IT-ONB-* | `apps/api/test/integration/onboarding.integration.spec.ts` |

## Phase E — Auth / Users / Master / Dashboard / Audit / Import

| IDs | File |
|-----|------|
| IT-AUTH-* | `apps/api/test/integration/auth.integration.spec.ts` |
| IT-USR-* | `apps/api/test/integration/users.integration.spec.ts` |
| IT-MD-* | `apps/api/test/integration/master-data.integration.spec.ts` |
| IT-DSH / IT-AUD / IT-IMP | `apps/api/test/integration/dashboard-audit-import.integration.spec.ts` |

## Factories

`apps/api/test/integration/factories.ts` — 7 personas, client/JF, requirement/candidate/offer helpers.

## N/A

| Item | Reason |
|------|--------|
| BR-SEC-02 / LEADERSHIP_READONLY | Role not in current Prisma/shared-types enum |
| Product source changes | Explicitly forbidden for this suite |

## Auto: yes

All IDs above are automated in the listed files.
