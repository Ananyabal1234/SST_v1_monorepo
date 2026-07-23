# Project Charter — Service Staffing Tracker

## Purpose

Authorize and bound the SST program for engineering delivery.

## Audience

Sponsors, engineering manager, architects.

## Scope

Charter elements: problem, goals, constraints, risks, timeline, open questions. Not detailed specs.

## Definitions

See [../README.md](../README.md).

---

## 1. Project identity

| Field | Value |
|-------|-------|
| Name | Service Staffing Tracker (SST) |
| Type | Internal enterprise web application |
| Architecture | Modular monolith monorepo |
| Phase 1 environment | Local / Docker Compose |

## 2. Objectives

1. Deliver MVP replacing Excel pipeline operations.  
2. Establish enterprise-ready codebase (tests, CI, observability, security).  
3. Document extension points for Future workforce modules.

## 3. In scope (MVP)

- Requirement Intake CRUD + SLA/RAG  
- TA Candidate Pipeline + stages + selection + duplicate checks  
- Offer & Selection  
- HR Onboarding  
- Setup / master lists  
- Dashboard KPIs and filters  
- JWT + refresh, RBAC, audit logs  
- Excel/CSV import path  
- Local Docker + monitoring stack documented  

## 4. Out of scope (MVP)

- Cloud production deployment  
- Redis-backed runtime caching (interface only)  
- Client external portal  
- Full ATS / resume parsing AI  
- Payroll / HRIS  
- Bench, skills, capacity, availability, workload, assignments  
- Native mobile apps  
- SSO (documented as Future)

## 5. Assumptions

| ID | Assumption |
|----|------------|
| A-1 | MVP = Excel pipeline parity + hardening |
| A-2 | Internal users only |
| A-3 | English UI; primary timezone IST |
| A-4 | Solo developer initially; docs enterprise-grade |
| A-5 | Excel sample/history importable |
| A-6 | Email/password identity first |

## 6. Constraints

| Type | Constraint |
|------|------------|
| Stack | Turborepo, pnpm, React/Vite/NestJS/Prisma/PostgreSQL as specified |
| Security | OWASP-aligned; PII protection |
| Delivery | Docs-first blueprint; then implement |
| Cloud | Not until Phase 19 readiness |

## 7. Risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-1 | Scope creep into workforce | Strict MVP labeling |
| R-2 | Formula semantic drift | RTM + Business Rules |
| R-3 | PII exposure | Auth + audit from day one |
| R-4 | Dirty master data (`xebia`/`Xebia`) | Normalization + unique masters |
| R-5 | Over-engineering | Modular monolith, YAGNI |

## 8. Timeline (planning)

| Stage | Estimate |
|-------|----------|
| Documentation complete | This `docs/` tree |
| Milestone 1: Auth + Master + Requirements | Sprint 1–2 |
| Milestone 2: Candidates + Offers | Sprint 3–4 |
| Milestone 3: Onboarding + Dashboard | Sprint 5–6 |
| Milestone 4: Import, hardening, CI/observability | Sprint 7–8 |

Exact calendar dates TBD by capacity.

## 9. Open questions (defaults applied)

| # | Question | Default |
|---|----------|---------|
| 1 | SSO timing | Post-MVP |
| 2 | Compliance (DPDP/GDPR) | Treat candidate PII as confidential; retention TBD 24 months |
| 3 | Notification channels | In-app first |
| 4 | Cutover strategy | Parallel run then freeze Excel |

## 10. Approval

Documentation plan approved for generation. Implementation begins after engineering consumption of this charter + PRD.

## References

- [VISION.md](./VISION.md)  
- Excel workbook  
- [../03-prd/PRD.md](../03-prd/PRD.md)  
