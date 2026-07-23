# Test Structure & Coverage — SST

## Purpose

Define folders, naming, and coverage tooling.

## Audience

Engineers, SDET.

## Scope

Monorepo test layout.

## Definitions

| Pattern | Example |
|---------|---------|
| Unit file | `sla.calculator.spec.ts` |
| E2E file | `requirement-to-join.spec.ts` |

---

## Folder structure

```text
apps/api/
  src/**/*.spec.ts                 # unit colocated
  test/
    integration/
    fixtures/
apps/web/
  src/**/*.test.tsx
  e2e/
    journeys/
packages/shared-utils/
  src/**/*.spec.ts
```

## Naming convention

- `*.spec.ts` API/unit  
- `*.test.tsx` React  
- `describe('RequirementsService')` / `it('computes open positions')`  

## Coverage commands (planned)

```bash
pnpm --filter api test:cov
pnpm --filter web test:cov
```

Fail CI under threshold (nyc/vitest coverage).

## Golden Excel fixtures

Store anonymized rows under `apps/api/test/fixtures/excel-parity.json` for RAG assertions.

## References

- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)  
