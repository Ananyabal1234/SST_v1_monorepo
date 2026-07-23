# Authentication & Protected Routes — Frontend

## Purpose

Specify SPA auth flow and route protection.

## Audience

Frontend engineers.

## Scope

JWT access + refresh cookie/token flow for MVP.

## Definitions

| Term | Definition |
|------|------------|
| Access token | Short-lived; Authorization Bearer |
| Refresh token | HttpOnly cookie preferred |

---

## 1. Recommended storage

| Token | Storage |
|-------|---------|
| Access | Memory (React context) — XSS resistant vs localStorage |
| Refresh | HttpOnly Secure SameSite cookie |
| Fallback | If cookie hard on Vite cross-port, refresh in memory+sessionStorage for local only with documented risk |

## 2. Auth provider

Holds `user`, `accessToken`, `login`, `logout`, `refresh`.

## 3. Axios interceptor

```text
request → attach Bearer
response 401 → try refresh once → retry
refresh fail → logout → /login
```

## 4. Protected routes

```tsx
<Route element={<ProtectedLayout />}>
  <Route element={<RoleRoute roles={['ADMIN']} />}>
    <Route path="/admin/*" />
  </Route>
  ...
</Route>
```

`PermissionGate` hides buttons; server still enforces.

## 5. Login sequence

Matches backend sequence diagram; redirect `from` query param.

## References

- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)  
- [STATE_AND_DATA_FETCHING.md](./STATE_AND_DATA_FETCHING.md)  
