# 09 — Dashboard (FR-DASH Must)

Use known fixture counts from the J1–J3 requirement after at least one join.

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-DSH-001 | FR-DASH-01 | ADMIN | Fixture data | Open Dashboard overview | totalRequirements, totalPositions, openPositions, closedPositions cards show numbers consistent with data | | | | |
| TC-DSH-002 | FR-DASH-02 | ADMIN | Req without handoff exists | Check pending sales handoff KPI | Count ≥1 for unhanded reqs | | | | |
| TC-DSH-003 | FR-DASH-03 | ADMIN | Pipeline + selected + offers + joined | KPI cards candidatesInPipeline, selected, offers, joined | Match fixture | | | | |
| TC-DSH-004 | FR-DASH-04 | ADMIN | Duplicate mobile from J2 | Duplicate mobiles KPI | ≥1 | | | | |
| TC-DSH-005 | FR-DASH-05 | ADMIN | Candidates with stages | Stage summary table/chart | Stages reflected | | | | |
| TC-DSH-006 | FR-DASH-06 | ADMIN | Reqs with RAG | Requirement RAG summary | GREEN/AMBER/RED buckets present | | | | |
| TC-DSH-007 | FR-DASH-09, BR-DASH-01 | ADMIN | Filters | Filter by Client = QA Client Alpha | KPIs recount for filtered set only | | | | |
| TC-DSH-008 | FR-DASH-09 | ADMIN | — | Filter TA Owner, Sales Owner, Priority, Job Family, date range | Each filter changes or correctly no-ops when All | | | | |
| TC-DSH-009 | FR-DASH-01 | SALES | — | POST /dashboard as Sales | 200; data returns (scoping per product) | | | | |
| TC-DSH-010 | FR-DASH-01 | ALL | — | Click KPI card opens detail list | Modal/list matches KPI | | | | |

## Execution notes

| Date | Tester | Pass | Fail |
|------|--------|------|------|
| | | | |
