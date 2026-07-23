# Coding Standards — SST

## Purpose

Unify code quality across the monorepo.

## Audience

All engineers.

## Scope

TypeScript standards for api/web/packages.

## Definitions

| Term | Definition |
|------|------------|
| Pure function | No I/O side effects |

---

## 1. Language

- TypeScript `strict`  
- No `any` without eslint disable + reason  
- Prefer `unknown` + narrowing  

## 2. Naming

| Kind | Convention |
|------|------------|
| Files | `kebab-case.ts` |
| React components | `PascalCase.tsx` |
| Functions/vars | `camelCase` |
| DB tables | `snake_case` |
| Types/Interfaces | `PascalCase` |
| Env vars | `SCREAMING_SNAKE` |
| Constants | `SCREAMING_SNAKE` or const object |

## 3. NestJS

- One module per domain folder  
- Controllers thin  
- DTOs class-validator  
- No business rules in controllers  

## 4. React

- Function components  
- Feature folders  
- Hooks `useX`  
- Avoid premature memoization unless measured  

## 5. Error handling

- Throw domain errors; map in filters  
- Never swallow errors silently  

## 6. Comments

- Prefer clear names over noise comments  
- Document non-obvious Excel formula ports  

## 7. Formatting

- Prettier + ESLint  
- Import order enforced  

## Best practices

Shared RAG calculators tested with Excel golden cases.

## References

- [GIT_AND_PR.md](./GIT_AND_PR.md)  
- Clean Code / Google TS style (adapted)  
