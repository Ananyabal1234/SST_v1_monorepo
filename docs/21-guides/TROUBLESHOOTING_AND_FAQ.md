# Troubleshooting & FAQ — SST

## Purpose

Resolve common developer and operator issues.

## Audience

Developers, admins, users.

## Scope

MVP local and application FAQ.

## Definitions

N/A.

---

## Developer troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| API won't start | Invalid env / missing secrets | Validate `.env` vs example |
| Prisma P1001 | Postgres down | `docker compose up -d postgres` |
| Migration drift | Manual SQL edits | Reset or create reconcile migration |
| CORS errors | Origin mismatch | Align `CORS_ORIGIN` and Vite URL |
| 401 loops | Refresh cookie blocked | Check SameSite/proxy; local fallback |
| Empty masters | Seed not run | `prisma db seed` |

## Operator FAQ

**Q: Why can’t I edit Open Positions?**  
A: It is derived from positions and joined fills (Excel gray field).

**Q: Why is SLA Red?**  
A: Requirement aging past handoff SLA thresholds; assign handoff or progress fill.

**Q: Duplicate mobile warning but I need to proceed?**  
A: Allowed with warning; confirm contact is intentional.

**Q: Offer create fails**  
A: Candidate must be Selected.

**Q: Dashboard differs slightly from Excel**  
A: Report with filters/screenshot; compare against documented business rules and seed set.

## FAQ — product scope

**Q: Where is bench/skills/capacity?**  
A: Future modules — see domain Future Modules doc. Not in MVP.

**Q: Can clients log in?**  
A: Not in MVP (internal only).

## Escalation

S1 issues → engineering on-call / project owner with correlation ID from error banner.

## References

- [../17-local-deployment/LOCAL_SETUP.md](../17-local-deployment/LOCAL_SETUP.md)  
- [../01-business-analysis/BUSINESS_RULES.md](../01-business-analysis/BUSINESS_RULES.md)  
- [../DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md)  
