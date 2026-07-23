# OWASP & Secrets Management — SST

## Purpose

Map OWASP Top 10 mitigations and secret handling for MVP.

## Audience

Security, all engineers.

## Scope

Application-level controls for SST MVP.

## Definitions

OWASP Top 10 (2021) referenced.

---

## Mitigations

| OWASP | Risk in SST | Mitigation |
|-------|-------------|------------|
| A01 Broken Access Control | Role bypass | Guards + matrix tests |
| A02 Cryptographic Failures | Password/PII | Hash passwords; TLS later; redact logs |
| A03 Injection | Prisma SQL | Parameterized Prisma only; no raw string concat |
| A04 Insecure Design | Missing threat model | Pipeline threat notes; abuse cases in tests |
| A05 Security Misconfiguration | Open CORS, default secrets | Config validation; refuse start if weak secrets |
| A06 Vulnerable Components | Deps | `pnpm audit` in CI |
| A07 Auth Failures | Brute force | Rate limit login; refresh rotation |
| A08 Software/Data Integrity | Supply chain | Lockfile committed; CI digest images later |
| A09 Logging/Monitoring Failures | Silent attacks | Structured logs + alerts |
| A10 SSRF | Import URLs | No URL fetch for imports; file upload only |

## Secrets

| Secret | Where |
|--------|-------|
| `JWT_*` | `.env` local; GH Actions secrets CI |
| `DATABASE_URL` | env |
| Seed admin password | `SEED_ADMIN_PASSWORD` |

Rules:

- Never commit `.env`  
- Provide `.env.example` without values  
- Rotate JWT secrets invalidates sessions  

## PII handling

Candidates’ mobile/email = confidential. Limit export to authorized roles; mask in UI lists optionally (`••••`).

## Recommendations

Add security checklist to PR template.

## References

- OWASP Top 10  
- [AUTH_RBAC.md](./AUTH_RBAC.md)  
- [AUDIT_LOGGING.md](./AUDIT_LOGGING.md)  
