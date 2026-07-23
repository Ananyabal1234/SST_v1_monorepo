# Dependency Graph — SST Delivery

## Purpose

Make build order explicit to avoid blocked work.

## Audience

Developers, leads.

## Scope

MVP technical & story dependencies.

## Definitions

Hard dependency = cannot start B until A done.

---

## Graph

```mermaid
flowchart TD
  mono[Monorepo_E0]
  db[Prisma_Schema]
  auth[Auth_E1]
  md[MasterData_E2]
  req[Requirements_E3]
  can[Candidates_E4]
  off[Offers_E5]
  onb[Onboarding_E6]
  dash[Dashboard_E7]
  aud[Audit_E8]
  ci[CI_E9]
  mono --> db
  db --> auth
  auth --> md
  md --> req
  req --> can
  can --> off
  off --> onb
  req --> dash
  can --> dash
  off --> dash
  onb --> dash
  auth --> aud
  req --> aud
  mono --> ci
  auth --> ci
```

## Soft dependencies

- UI shell can start after auth skeleton.  
- Dashboard stubs can return zeros before all entities exist.  
- Import after requirements+candidates stable.

## Parallelization

| Track A | Track B |
|---------|---------|
| API requirements | Web shell + design tokens |
| API candidates | Requirements UI |
| Observability compose | Feature UI |

## References

- [SPRINT_AND_MILESTONES.md](./SPRINT_AND_MILESTONES.md)  
- [TEAM_SPRINT_PLAN.md](./TEAM_SPRINT_PLAN.md)  
