# Sequence Diagrams — SST

## Purpose

Document key runtime sequences for implementers and reviewers.

## Audience

Backend/frontend engineers, QA.

## Scope

MVP critical paths.

## Definitions

Access token: short-lived JWT. Refresh token: longer-lived, rotatable.

---

## 1. Login

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB
  UI->>API: POST /auth/login
  API->>DB: find user + verify hash
  API-->>UI: accessToken + set refresh cookie
```

## 2. Create requirement

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant Domain
  participant DB
  participant Audit
  UI->>API: POST /requirements JWT
  API->>API: RBAC guard Sales|Admin
  API->>Domain: validate + create
  Domain->>DB: insert requirement
  Domain->>Audit: record create
  API-->>UI: 201 RequirementDto
```

## 3. Select candidate → create offer

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant CanSvc
  participant OffSvc
  UI->>API: PATCH /candidates/:id {selected:true}
  API->>CanSvc: markSelected
  CanSvc-->>API: ok
  UI->>API: POST /offers {candidateId}
  API->>OffSvc: createIfEligible
  OffSvc-->>API: Offer
  API-->>UI: 201
```

## 4. Accept offer → onboarding → joined

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant Off
  participant Onb
  participant Pos
  UI->>API: PATCH /offers/:id {status:Accepted}
  API->>Off: transition
  UI->>API: POST /onboardings
  API->>Onb: create
  UI->>API: PATCH /onboardings/:id {status:Joined, actualDoj}
  API->>Onb: complete
  API->>Pos: recount closed/open
  API-->>UI: 200
```

## 5. Dashboard query

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant Agg
  participant DB
  UI->>API: GET /dashboard?filters
  API->>Agg: aggregate
  Agg->>DB: SQL group by / counts
  API-->>UI: DashboardDto
```

## 6. Token refresh

```mermaid
sequenceDiagram
  participant UI
  participant API
  UI->>API: POST /auth/refresh cookie
  API-->>UI: new accessToken
```

## References

- [../10-api/API_CATALOG.md](../10-api/API_CATALOG.md)  
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)  
