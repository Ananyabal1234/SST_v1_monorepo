# Business Processes — SST MVP

## Purpose

Describe process-level behavior bridging workflows and domain services.

## Audience

Analysts, backend, QA.

## Scope

MVP staffing processes.

## Definitions

| Process ID | Name |
|------------|------|
| BP-01 | Requirement lifecycle |
| BP-02 | Candidate sourcing |
| BP-03 | Selection to offer |
| BP-04 | Offer to join |
| BP-05 | Dashboard refresh |

---

## BP-01 Requirement lifecycle

1. Sales creates Requirement (Active).  
2. Optionally completes budget/location/experience.  
3. Assigns TA Owner + TA Handoff Date → appears in TA ready queue.  
4. SLA RAG updates daily/on-read.  
5. Terminal: Closed (filled) or Cancelled.

**Actors:** Sales, Admin (override).  
**Systems:** Staffing Pipeline, Audit, Notifications (handoff).

## BP-02 Candidate sourcing

1. TA opens requirement.  
2. Adds candidates with contact + source.  
3. Advances stage / feedback.  
4. System evaluates duplicates.  
5. Marks selected when client agrees.

## BP-03 Selection to offer

1. Candidate.selected = true.  
2. HR/TA creates Offer (or auto-draft).  
3. Offer Released with CTC + Expected DOJ.  
4. Status transitions to Accepted/Rejected.

**Excel note:** Selected flow is direct row mapping when Selected?=Yes and Candidate ID filled.

## BP-04 Offer to join

1. On Accepted → Onboarding record.  
2. HR completes docs/BGV/formalities.  
3. Actual DOJ + Joined.  
4. Position accounting updates; requirement may Close.

## BP-05 Dashboard refresh

On each dashboard request (or cached short TTL later):

1. Apply filters.  
2. Aggregate KPIs and breakdowns.  
3. Return JSON for cards/tables.

---

## Process SLA map

| Process step | SLA signal |
|--------------|------------|
| Req without handoff aging | TA Handoff RAG |
| Candidate aging | Candidate RAG |
| Offer turnaround | Offer RAG |
| Onboarding turnaround | Onboarding RAG |
| Past target with open seats | Overdue |

## References

- [../01-business-analysis/WORKFLOWS.md](../01-business-analysis/WORKFLOWS.md)  
- [DOMAIN_MODEL.md](./DOMAIN_MODEL.md)  
