# Git Strategy, Branching & Pull Requests — SST

## Purpose

Define VCS workflow for solo-now / team-later.

## Audience

All contributors.

## Scope

GitHub flow variant.

## Definitions

| Branch | Purpose |
|--------|---------|
| `main` | Protected, releasable |
| `feat/*` | Features |
| `fix/*` | Bugfixes |
| `chore/*` | Tooling |
| `docs/*` | Documentation |

---

## 1. Branching strategy

GitHub Flow:

1. Branch from `main`  
2. PR with CI green  
3. Squash merge  
4. Delete branch  

## 2. Conventional Commits

```text
feat(requirements): add SLA RAG on detail response
fix(candidates): normalize mobile before duplicate check
docs(api): document dashboard filters
chore(ci): add typecheck job
refactor(auth): extract refresh rotation
test(offers): cover ineligible create
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`.

## 3. PR guidelines

- Small PRs (<400 lines ideal)  
- Link story ID  
- Screenshots for UI  
- Migration notes if schema changes  
- Checklist completed  

## 4. Code review checklist

- [ ] Correctness vs Business Rules / RTM  
- [ ] AuthZ on new endpoints  
- [ ] Validation present  
- [ ] Tests added/updated  
- [ ] No secrets  
- [ ] Docs updated if contract changes  
- [ ] Audit on mutations  

## 5. Documentation standards

- Update `docs/` when behavior changes  
- ADRs for cross-cutting decisions  

## References

- Conventional Commits  
- [ADR_TEMPLATE.md](./ADR_TEMPLATE.md)  
