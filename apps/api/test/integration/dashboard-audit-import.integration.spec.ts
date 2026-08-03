import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp } from './helpers';
import {
  addCandidate,
  acceptOffer,
  bootstrapPersonas,
  createActiveAssignedRequirement,
  createOnboarding,
  ensureOfferReleased,
  selectWithEligibleLoi,
  type Persona,
  type RoleKey,
} from './factories';

describe('Dashboard / Audit / Import (Phase E)', () => {
  let personas: Record<RoleKey, Persona>;
  let clientId: string;
  let jobFamilyId: string;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    personas = boot.personas;
    clientId = boot.clientId;
    jobFamilyId = boot.jobFamilyId;

    // seed one joined for KPI assertions
    const req = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      taLead: personas.TA_LEAD,
      clientId,
      jobFamilyId,
      positions: 2,
    });
    const { row } = await addCandidate(personas.TA.token, req.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    const offerId = await ensureOfferReleased(personas.HR.token, row.id);
    await acceptOffer(personas.HR.token, offerId);
    const { onbId } = await createOnboarding(personas.HR, offerId);
    await api('POST', `/onboardings/${onbId}/status`, {
      token: personas.HR.token,
      body: {
        statusCode: 'JOINED',
        actualDoj: new Date().toISOString().slice(0, 10),
      },
    });
  }, 180_000);

  it('IT-DSH-001: POST dashboard any role returns 2xx', async () => {
    const res = await api('POST', '/dashboard', {
      token: personas.SALES.token,
      body: {},
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect(res.data).toBeTruthy();
  });

  it('IT-DSH-002: filters accepted without error', async () => {
    const res = await api('POST', '/dashboard', {
      token: personas.ADMIN.token,
      body: {
        clientId,
        salesOwnerId: personas.SALES.id,
        taOwnerId: personas.TA.id,
        priorityCode: 'HIGH',
      },
    });
    expect(res.status).toBeLessThan(300);
  });

  it('IT-AUD-001/003: Admin sees audit; Sales 403', async () => {
    const ok = await api('GET', '/audit-logs?pageSize=5', {
      token: personas.ADMIN.token,
    });
    expect(ok.status).toBe(200);
    const deny = await api('GET', '/audit-logs', {
      token: personas.SALES.token,
    });
    expect(deny.status).toBe(403);
  });

  it('IT-IMP-001: validate missing columns → 400', async () => {
    const res = await api('POST', '/imports/validate', {
      token: personas.ADMIN.token,
      body: {
        entity: 'requirements',
        csv: 'foo,bar\n1,2\n',
      },
    });
    expect(res.status).toBe(400);
  });

  it('IT-IMP-002: validate too few rows → 400', async () => {
    const res = await api('POST', '/imports/validate', {
      token: personas.ADMIN.token,
      body: {
        entity: 'requirements',
        csv: 'requirementDate,clientName,roleSkill,jobFamilyName,numberOfPositions,salesOwnerEmail,priorityCode\n',
      },
    });
    expect(res.status).toBe(400);
  });

  it('IT-IMP-003: validate with row error returns report', async () => {
    const res = await api('POST', '/imports/validate', {
      token: personas.ADMIN.token,
      body: {
        entity: 'requirements',
        csv: 'requirementDate,clientName,roleSkill,jobFamilyName,numberOfPositions,salesOwnerEmail,priorityCode\n2026-01-01,QA Client Alpha,,QA Engineering,1,qa.sales@sst.test,HIGH\n',
      },
    });
    expect([200, 201]).toContain(res.status);
  });

  it('IT-IMP-008: non-Admin import 403', async () => {
    const res = await api('POST', '/imports/validate', {
      token: personas.TA.token,
      body: { entity: 'requirements', csv: 'a\nb\n' },
    });
    expect(res.status).toBe(403);
  });
});
