# 10 — Audit & Import (FR-AUD / FR-IMP Must)

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-AUD-001 | FR-AUD-01 | ADMIN | After J1 create/update/status | GET `/api/v1/audit-logs` (filter entity if supported) | Entries show actor, timestamp, entity, before/after or change summary | | | | |
| TC-AUD-002 | FR-AUD-02 | ADMIN | — | Query by entity type/id for the fixture requirement | Matching logs returned | | | | |
| TC-AUD-003 | FR-AUD-02 | SALES | — | GET `/audit-logs` | 403 | | | | |
| TC-IMP-001 | FR-IMP-03 | ADMIN | Sample CSV with 1 valid + 1 invalid row | POST `/imports/validate` | Report lists errors/warnings; does not commit | | | | |
| TC-IMP-002 | FR-IMP-01 | ADMIN | Valid CSV | POST `/imports/commit` | Rows imported; requirements/candidates visible | | | | |
| TC-IMP-003 | FR-IMP-01 | TA | — | POST `/imports/validate` | 403 | | | | |
| TC-IMP-004 | FR-IMP-01 | ADMIN | If UI import exists | Run import from UI | Same validation/commit behavior | | | | |

## Sample validate payload notes

Use API docs / Swagger for exact multipart or JSON shape. If import UI is absent, API-only execution is acceptable; mark TC-IMP-004 Skip.

## Execution notes

| Date | Tester | Pass | Fail | Skips |
|------|--------|------|------|-------|
| | | | | |
