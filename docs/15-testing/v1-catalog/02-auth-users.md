# 02 — Auth & Users (FR-AUTH Must)

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-AUTH-001 | FR-AUTH-01 | SALES | User active | POST `/api/v1/auth/login` with valid email/password | 201; body has `accessToken`, `refreshToken`, `user.role=SALES` | | | | |
| TC-AUTH-002 | FR-AUTH-02 | SALES | Login ok | Decode/use access token on GET `/api/v1/auth/me` | 200; email/role match | | | | |
| TC-AUTH-003 | FR-AUTH-02, FR-AUTH-03 | SALES | Login ok | POST `/api/v1/auth/refresh` with refreshToken | New accessToken returned | | | | |
| TC-AUTH-004 | FR-AUTH-03 | SALES | Login ok | POST `/api/v1/auth/logout` with Bearer; then refresh with old token | Logout 200; subsequent refresh fails | | | | |
| TC-AUTH-005 | FR-AUTH-04 | ADMIN | Admin token | POST `/api/v1/users` create user | 201; user listed in GET `/users` | | | | |
| TC-AUTH-006 | FR-AUTH-04 | ADMIN | Target user | PATCH user `isActive=false`; attempt login as that user | Login rejected | | | | |
| TC-AUTH-007 | FR-AUTH-04 | ADMIN | Target user | PATCH role change (e.g. TA→HR); login; check tabs | Role/tabs match new role | | | | |
| TC-AUTH-008 | FR-AUTH-04 | ADMIN | Target user | POST `/users/:id/reset-password`; login with new password | Success | | | | |
| TC-AUTH-009 | FR-AUTH-04 | ADMIN | Other user | DELETE `/users/:id` (soft); login | Rejected / inactive | | | | |
| TC-AUTH-010 | FR-AUTH-04 | ADMIN | Self | Attempt deactivate or delete self in UI/API | Blocked with clear error | | | | |
| TC-AUTH-011 | FR-AUTH-04 | SALES | Sales token | POST `/api/v1/users` | 403 | | | | |
| TC-AUTH-012 | FR-AUTH-05 | ADMIN | Create user | Inspect DB or ensure plaintext password not returned in API responses | No password/hash in JSON responses | | | | |
| TC-AUTH-013 | BR-SEC-01 | TA | TA token | GET `/api/v1/users` (admin list) | 403 | | | | |

## UI (UsersScreen)

| ID | FR/BR | Role | Preconditions | Steps | Expected | Actual | Status | Bug | Auto |
|----|-------|------|---------------|-------|----------|--------|--------|-----|------|
| TC-AUTH-020 | FR-AUTH-04 | ADMIN | Users tab | Create user via form (password &lt; 8) | Validation error | | | | |
| TC-AUTH-021 | FR-AUTH-04 | ADMIN | Users tab | Search/filter/paginate users | Results match filter | | | | |

## Execution notes

| Date | Tester | Pass | Fail |
|------|--------|------|------|
| | | | |
