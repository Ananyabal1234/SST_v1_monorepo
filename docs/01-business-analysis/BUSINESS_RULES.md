# Business Rules — SST MVP

## Purpose

Codify operational logic from Excel formulas and process notes so API/UI behave deterministically.

## Audience

Backend engineers, QA, product.

## Scope

MVP pipeline rules. Future module rules are out of scope.

## Definitions

| Term | Definition |
|------|------------|
| Derived field | Server-computed; not user-editable |
| RAG | Green / Amber / Red |

---

## BR-REQ — Requirements

| ID | Rule |
|----|------|
| BR-REQ-01 | `numberOfPositions` ≥ 1 |
| BR-REQ-02 | `openPositions = max(0, numberOfPositions - closedPositions)` |
| BR-REQ-03 | `closedPositions` equals count of candidates for Req that reached Joined (or explicitly closed fills per product) — Excel: COUNTIFS from pipeline selections feeding closure |
| BR-REQ-04 | `requirementAgeDays = today - requirementDate` (date-only) |
| BR-REQ-05 | **TA Handoff SLA RAG** (Excel parity): if no handoff date: age≤2 Green, ≤5 Amber, else Red; if handoff present, compute against handoff timing / escalation rules as implemented in Excel (document exact branch in service tests) |
| BR-REQ-06 | Status ∈ {Active, On Hold, Cancelled, Closed} |
| BR-REQ-07 | Cancelled/Closed requirements cannot add new candidates unless Admin override |
| BR-REQ-08 | `taReadyReqId` helper: expose Req ID when TA handoff date set (for TA queues) |
| BR-REQ-09 | Closure Status warning when target date past and openPositions > 0 and not Cancelled/Closed |

## BR-CAN — Candidates

| ID | Rule |
|----|------|
| BR-CAN-01 | Candidate must reference existing Requirement |
| BR-CAN-02 | Client, Role, Job Family, Sales/TA Owner default from parent Requirement; may be snapshot-copied |
| BR-CAN-03 | Mobile and Email stored separately; trimmed; E.164-ish validation recommended |
| BR-CAN-04 | `duplicateMobile = count(other candidates with same normalized mobile) > 0` |
| BR-CAN-05 | `duplicateEmail = count(other candidates with same normalized email) > 0` |
| BR-CAN-06 | Stage ∈ master Candidate Stage list (default: Submitted to SPOC, Client Shortlist, Hold, Reject, …) |
| BR-CAN-07 | Feedback ∈ master list (Pending, Selected, …) |
| BR-CAN-08 | `selected = true` requires Candidate ID assigned |
| BR-CAN-09 | Setting `selected=true` triggers offer eligibility (auto-create offer row optional; must be creatable) |
| BR-CAN-10 | Reject/Hold stages cannot be Selected without clearing stage conflict (validate) |
| BR-CAN-11 | Pipeline age = today − profileSubmittedDate (or createdAt if missing) |

## BR-OFF — Offers

| ID | Rule |
|----|------|
| BR-OFF-01 | Offer requires Candidate with `selected=true` |
| BR-OFF-02 | At most one Active offer per candidate (Released/Pending); historical retained |
| BR-OFF-03 | Status ∈ {Released, Accepted, Rejected, Withdrawn, …} per master |
| BR-OFF-04 | Offer TAT = days between offerInitiatedDate and offerReleasedDate (or today if open) |
| BR-OFF-05 | Offer RAG thresholds configurable; default align Excel (document in seed config) |
| BR-OFF-06 | Only Accepted offers can spawn Onboarding |
| BR-OFF-07 | CTC/Rate visible per RBAC (HR/Admin/Sales as matrixed) |

## BR-ONB — Onboarding

| ID | Rule |
|----|------|
| BR-ONB-01 | Onboarding requires Offer.status = Accepted |
| BR-ONB-02 | One active onboarding per accepted offer |
| BR-ONB-03 | DocsPending boolean; BGV status from master; JoiningFormalities tracked |
| BR-ONB-04 | Onboarding TAT = days since offerAcceptedDate (or onboarding created) |
| BR-ONB-05 | Status Joined requires actualDoj set |
| BR-ONB-06 | Joined increments closed position accounting for parent Req |

## BR-DASH — Metrics

| ID | Rule |
|----|------|
| BR-DASH-01 | Filters apply consistently across all KPI queries |
| BR-DASH-02 | Date filter on requirementDate (From/To inclusive); blank = no date filter |
| BR-DASH-03 | Fill rate = closedPositions / totalPositions (guard divide-by-zero) |
| BR-DASH-04 | Duplicate Mobiles = count distinct mobiles with frequency > 1 in filtered set |
| BR-DASH-05 | Wasted sourcing = cancelled requirements that had TA activity |

## BR-MD — Master data

| ID | Rule |
|----|------|
| BR-MD-01 | Soft-disable masters rather than hard-delete if referenced |
| BR-MD-02 | Client names normalized (trim, casefold for uniqueness; display preserves preferred casing) |
| BR-MD-03 | Priority order for sort: Critical > High > Medium > Low (configurable) |

## BR-SEC — Access

| ID | Rule |
|----|------|
| BR-SEC-01 | Server enforces permissions; UI hiding is not sufficient |
| BR-SEC-02 | Leadership readonly cannot mutate |

## Examples

Duplicate check (pseudo):

```ts
const normalized = mobile.replace(/\D/g, '');
const dup = await countCandidates({ mobileNormalized: normalized, notId: candidateId });
isDuplicate = dup > 0;
```

## Trade-offs

Exact Excel nested IF branches for SLA should be ported via golden tests using fixture rows, not approximated.

## References

- Excel formula columns on Requirement Intake / Pipeline / Offer / Onboarding  
- Data Dictionary sheet notes on selected-candidate flow  
- [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md)  
