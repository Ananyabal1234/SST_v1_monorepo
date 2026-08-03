# 04 — Journey J1 Sales (FR-REQ Must)

Vertical slice start: Sales creates and owns a requirement.

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-J1-001 | FR-REQ-01 | SALES | TC-DATA client/JF | UI Add Request: client, role/skill, job family, positions=2, priority, sales owner=self | Requirement created ACTIVE; publicId like REQ-#####; openPositions=2, closedPositions=0 | | | | |
| TC-J1-002 | FR-REQ-01, BR-REQ-01 | SALES | — | Attempt create with positions=0 or missing client | Validation error | | | | |
| TC-J1-003 | FR-REQ-03 | SALES | Own req | Set target closure date on create or edit | Saved; visible on detail | | | | |
| TC-J1-004 | FR-REQ-05 | SALES | Own req | View requirement age | Age days ≈ today − requirementDate | | | | |
| TC-J1-005 | FR-REQ-06, BR-REQ-05 | SALES | No handoff yet | View TA Handoff SLA RAG | GREEN/AMBER/RED by age (≤2 / ≤5 / else) | | | | |
| TC-J1-006 | FR-REQ-09 | SALES | Own + others exist | Requirements list as Sales | Sees own requirements (not other sales owners') | | | | |
| TC-J1-007 | FR-REQ-09 | SALES_LEAD | Same data | Requirements list as Sales Lead | Sees all requirements | | | | |
| TC-J1-008 | FR-REQ-01 | SALES | Other sales owns req | PUT full edit on another owner's requirement | 403 | | | | |
| TC-J1-009 | FR-REQ-01 | SALES | Own req | PUT edit role/skill, remarks | 200; fields updated | | | | |
| TC-J1-010 | FR-REQ-08 | SALES | Own ACTIVE | Status → ON_HOLD → ACTIVE | Transitions succeed | | | | |
| TC-J1-011 | FR-REQ-08, FR-REQ-10 | SALES | Own ACTIVE | Status → CANCELLED (confirm) | CANCELLED; audited | | | | |
| TC-J1-012 | FR-REQ-02 | SALES | Own ACTIVE (use non-cancelled fixture) | Assign mode to TA Lead(s) or TA Owner(s) + handoff date | Handoff set; taReadyReqId set; SLA freezes per BR-REQ-05 | | | | |
| TC-J1-013 | FR-REQ-02 | SALES_LEAD | Any ACTIVE | Reassign salesOwnerId to another sales user | Allowed for lead/admin | | | | |
| TC-J1-014 | BR-REQ-02 | SALES | New req positions=2 | Check open/closed before any joins | open=2, closed=0 | | | | |
| TC-J1-015 | FR-REQ-08 | HR | — | POST `/requirements/:id/status` | 403 | | | | |

## Keep for pipeline

Record `REQ_ID` / `publicId` of the ACTIVE requirement used for TA Lead → J2 → J3 (do not cancel that one).

## Execution notes

| Date | Tester | REQ_ID | Pass | Fail |
|------|--------|--------|------|------|
| | | | | |
