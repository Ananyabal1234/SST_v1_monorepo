# ADR-0001: MVP Pipeline-First Scope

- Status: Accepted  
- Date: 2026-07-15  
- Deciders: Product + Engineering (project initiation)

## Context

The legacy Excel workbook implements a hiring pipeline (Requirement → Candidate → Offer → Onboarding → Dashboard). The broader product vision also includes workforce modules (bench, skills, capacity, assignments). Building all at once delays replacing a live operational Excel process and increases delivery risk for a solo/small team.

## Decision

MVP implements Excel pipeline parity plus Auth/RBAC/Audit/Import. Workforce modules are documented as Future with architectural seams only (no MVP UI/API commitment).

## Consequences

### Positive

- Faster Excel replacement  
- Clear RTM against known sheets  
- Lower cognitive load  

### Negative

- Workforce stakeholders wait  
- Risk of rework if seams poorly designed  

### Neutral

- Monorepo still structured for later packages/modules  

## Alternatives considered

1. **Full platform MVP** — rejected for schedule/risk.  
2. **Dashboard-only app** — rejected; does not replace Excel data entry.  

## References

- [../../00-initiation/VISION.md](../../00-initiation/VISION.md)  
- [../../04-domain/FUTURE_MODULES.md](../../04-domain/FUTURE_MODULES.md)  
