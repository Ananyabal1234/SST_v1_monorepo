# State Management & Data Fetching — Frontend

## Purpose

Define how server and client state are managed.

## Audience

Frontend engineers.

## Scope

TanStack Query + minimal React context.

## Definitions

| State type | Tool |
|------------|------|
| Server | TanStack Query |
| Session | Auth context |
| UI theme | Theme provider |
| Form | RHF local |

---

## 1. Query patterns

```ts
useQuery({ queryKey: ['requirements', filters], queryFn: () => api.list(filters) });
useMutation({ mutationFn: api.create, onSuccess: () => qc.invalidateQueries({ queryKey: ['requirements'] }) });
```

## 2. Query key conventions

```text
['requirements', { page, filters }]
['requirement', id]
['candidates', { requirementId, filters }]
['dashboard', 'summary', filters]
['master', 'priorities']
```

## 3. Defaults

| Option | Value |
|--------|-------|
| staleTime lists | 30s |
| staleTime masters | 10m |
| retry | 1 |
| refetchOnWindowFocus | true for dashboard |

## 4. Optimistic updates

Optional for stage select; confirm with invalidate. Prefer invalidate for MVP simplicity.

## 5. API layer

`shared/lib/axios.ts` + `features/*/api/*.ts`. Types from shared package or OpenAPI codegen later.

## Performance checklist

- Select only needed columns in table views via API `fields` if implemented  
- Parallel queries with `useQueries` for dashboard cards if split  

## References

- TanStack Query docs  
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)  
