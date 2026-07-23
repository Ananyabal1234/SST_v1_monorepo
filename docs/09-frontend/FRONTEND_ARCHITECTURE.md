# Frontend Architecture — SST Web

## Purpose

Define React/Vite application structure and conventions.

## Audience

Frontend engineers.

## Scope

`apps/web` MVP.

## Definitions

| Term | Definition |
|------|------------|
| Feature folder | Vertical slice by domain |
| Shared | Cross-feature utilities |

---

## 1. Folder structure

```text
apps/web/src/
  main.tsx
  app/
    App.tsx
    router.tsx
    providers.tsx          # QueryClient, Theme, Auth
  features/
    auth/
    dashboard/
    requirements/
    candidates/
    offers/
    onboarding/
    admin/
  shared/
    components/            # shadcn wrappers
    hooks/
    lib/                   # axios, cn, dates
    types/
    constants/
  styles/
    index.css              # tokens
```

## 2. Feature module internals

```text
features/requirements/
  api/requirements.api.ts
  hooks/use-requirements.ts
  components/requirements-table.tsx
  components/requirement-form.tsx
  pages/requirements-page.tsx
  pages/requirement-detail-page.tsx
  schema.ts                # Zod
```

## 3. Routing

React Router v6+/v7 data routers. Protected layout route checks auth.

## 4. Forms

React Hook Form + Zod resolver; shared schemas optionally from `@sst/shared-types`.

## 5. Styling

Tailwind + CSS variables from Design System; ShadCN components.

## 6. Performance

- Route-level code splitting (`lazy`)  
- TanStack Query staleTimes for masters (5–10 min)  
- Debounced filter queries  
- Virtualize tables if >500 rows visible  

## 7. Error handling

- Query `error` → banner  
- Axios interceptor on 401 → refresh → retry; fail → logout  
- Route errorElement  

## Trade-offs

No Redux; server state in TanStack Query; minimal client atom/context for auth session + UI prefs.

## References

- [FEATURE_MODULES.md](./FEATURE_MODULES.md)  
- [AUTH_AND_ROUTING.md](./AUTH_AND_ROUTING.md)  
- [STATE_AND_DATA_FETCHING.md](./STATE_AND_DATA_FETCHING.md)  
