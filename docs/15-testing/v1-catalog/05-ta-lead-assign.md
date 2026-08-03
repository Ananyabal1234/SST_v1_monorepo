# 05 — TA Lead assign

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-TAL-001 | FR-REQ-02 | TA_LEAD | Req assigned to TA Lead or awaiting lead | Login; open Requirements & Pipeline | Sees requirements in lead queue / filters | | | | |
| TC-TAL-002 | FR-REQ-02 | TA_LEAD | Active req | PATCH assign ≥1 TA owner (`taOwnerIds` / owners multi-select) | TA owners saved; QA TA can access in Assign Task | | | | |
| TC-TAL-003 | FR-REQ-02 | TA_LEAD | — | Attempt PATCH core sales fields (client, positions) | 403 or rejected; only TA Lead allowed fields | | | | |
| TC-TAL-004 | FR-REQ-09 | TA_LEAD | — | Open pipeline modal for a requirement | Pipeline view loads (readonly or as designed) | | | | |
| TC-TAL-005 | FR-REQ-02 | TA | Non-assignee | PATCH assign owners on unassigned req | 403 | | | | |
| TC-TAL-006 | FR-REQ-02 | SALES | — | Confirm Sales cannot open lead-assign tab | Tab absent | | | | |

## Execution notes

| Date | Tester | Pass | Fail |
|------|--------|------|------|
| | | | |
