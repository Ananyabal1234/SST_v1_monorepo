# Administrator Guide — SST

## Purpose

Day-2 operations guide for system admins.

## Audience

Admin role users, IT operators.

## Scope

MVP admin capabilities.

## Definitions

Admin = `ADMIN` role.

---

## 1. First login

Use seeded admin credentials from environment; change password immediately after go-live.

## 2. User management

- Create users with roles: SALES, TA, HR, LEADERSHIP_READONLY, ADMIN  
- Disable users instead of deleting when possible  
- Reset passwords via admin action  

## 3. Master data

Maintain Setup Lists equivalents:

- Priorities, stages, feedback, offer/onboarding/BGV/requirement statuses  
- Clients (fix duplicates with different casing)  
- Job families  
- Prefer deactivate over delete  

## 4. Import from Excel

1. Export sheets to CSV  
2. Admin → Import → Validate  
3. Review error report  
4. Commit  
5. Spot-check dashboard vs Excel  

## 5. Audit

Filter by entity/user/date when investigating changes.

## 6. Operational checks

- `/health`, `/ready`  
- Grafana scrapes up  
- Disk for uploads/backups  

## 7. Security hygiene

- Least privilege roles  
- No shared admin accounts  
- Rotate secrets with engineering  

## References

- [../11-security/PERMISSION_MATRIX.md](../11-security/PERMISSION_MATRIX.md)  
- [../17-local-deployment/SEED_AND_MIGRATION.md](../17-local-deployment/SEED_AND_MIGRATION.md)  
