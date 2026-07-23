# Support, Disaster Recovery & Incident Response — SST

## Purpose

Maintenance SOPs for supporting SST after MVP.

## Audience

Ops, on-call, engineering manager.

## Scope

Local and future cloud operations.

## Definitions

| Term | Definition |
|------|------------|
| RPO | Max tolerable data loss |
| RTO | Max tolerable downtime |
| Incident | User-impacting failure |

---

## 1. Support guide

| Severity | Example | Response |
|----------|---------|----------|
| S1 | Login down, data corruption | Immediate |
| S2 | Dashboard wrong KPIs | Same day |
| S3 | UI glitch | Next sprint |
| S4 | Cosmetic | Backlog |

Channels: issue tracker; internal chat.

## 2. Backup strategy

- Daily `pg_dump`  
- Pre-migration dump  
- Retention 14–30 days local; longer in cloud  

Restore drill quarterly.

## 3. Disaster recovery

| Scenario | Action |
|----------|--------|
| DB volume lost | Restore latest dump to new Postgres |
| Bad migration | Restore dump; pin previous app |
| Secret leak | Rotate JWT+DB passwords; revoke refresh tokens |

Target local: RPO 24h, RTO 2h. Cloud targets set at migration.

## 4. Incident response

```text
Detect → Triage → Contain → Diagnose → Fix → Verify → Postmortem
```

1. Check Grafana/Loki: error spikes  
2. Check `/health` `/ready`  
3. Freeze deploys  
4. Communicate status  
5. Apply fix/rollback  
6. Blameless postmortem within 72h for S1/S2  

## 5. Version upgrade strategy

- Dependabot/Renovate PRs weekly  
- Prisma/Nest major upgrades via ADR  
- Node LTS cadence  

## 6. Technical debt management

Debt log in issues labeled `tech-debt`; budget ≤20% sprint capacity.

## 7. Monitoring SOP

- Daily glance at error rate & RAG red count  
- Weekly disk/backup verification  
- Alert ownership: engineering  

## References

- [../18-monitoring/OBSERVABILITY.md](../18-monitoring/OBSERVABILITY.md)  
- [../07-database/MIGRATION_AND_BACKUP.md](../07-database/MIGRATION_AND_BACKUP.md)  
- Google SRE incident practices  
