import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, unwrap } from './helpers';
import {
  bootstrapPersonas,
  createActiveAssignedRequirement,
  createRequirement,
  type Persona,
  type RoleKey,
  uniqueSuffix,
} from './factories';

describe('Requirements integration (Phase C)', () => {
  let personas: Record<RoleKey, Persona>;
  let clientId: string;
  let jobFamilyId: string;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    personas = boot.personas;
    clientId = boot.clientId;
    jobFamilyId = boot.jobFamilyId;
  }, 120_000);

  it('IT-REQ-001: Sales creates ACTIVE with open positions', async () => {
    const { status, row } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: `REQ001 ${uniqueSuffix()}`,
      jobFamilyId,
      numberOfPositions: 2,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
    });
    expect([200, 201]).toContain(status);
    expect(row.status).toBe('ACTIVE');
    expect(row.openPositions).toBe(2);
    expect(row.closedPositions ?? 0).toBe(0);
  });

  it('IT-REQ-002: positions < 1 rejected', async () => {
    const { status } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: 'Bad',
      jobFamilyId,
      numberOfPositions: 0,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
    });
    expect(status).toBe(400);
  });

  it('IT-REQ-003: both taOwnerIds and taLeadIds rejected', async () => {
    const { status } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: 'Both',
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
      taOwnerIds: [personas.TA.id],
      taLeadIds: [personas.TA_LEAD.id],
    });
    expect(status).toBe(400);
  });

  it('IT-REQ-005: minBudget > maxBudget rejected', async () => {
    const { status } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: 'Budget',
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
      minBudget: 100,
      maxBudget: 50,
    });
    expect(status).toBe(400);
  });

  it('IT-REQ-010: Sales cannot PUT another owner requirement', async () => {
    const leadReq = await createRequirement(personas.SALES_LEAD.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: `Other ${uniqueSuffix()}`,
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES_LEAD.id,
      priorityCode: 'MEDIUM',
    });
    const put = await api('PUT', `/requirements/${leadReq.row.id}`, {
      token: personas.SALES.token,
      body: {
        requirementDate: new Date().toISOString().slice(0, 10),
        clientId,
        roleSkill: 'Stolen',
        jobFamilyId,
        numberOfPositions: 1,
        salesOwnerId: personas.SALES.id,
        priorityCode: 'HIGH',
      },
    });
    expect(put.status).toBe(403);
  });

  it('IT-REQ-S01/S02/S03: status transitions', async () => {
    const { row } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: `Status ${uniqueSuffix()}`,
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'LOW',
    });
    const hold = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'ON_HOLD' },
    });
    expect([200, 201]).toContain(hold.status);

    const active = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'ACTIVE' },
    });
    expect([200, 201]).toContain(active.status);

    const cancel = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'CANCELLED' },
    });
    expect([200, 201]).toContain(cancel.status);

    const fromCancel = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'ACTIVE' },
    });
    expect(fromCancel.status).toBe(400);
  });

  it('IT-REQ-S06/S07: CLOSE with open seats — non-Admin 400, Admin override', async () => {
    const { row } = await createRequirement(personas.SALES.token, {
      requirementDate: new Date().toISOString().slice(0, 10),
      clientId,
      roleSkill: `Close ${uniqueSuffix()}`,
      jobFamilyId,
      numberOfPositions: 2,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
    });
    const salesClose = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'CLOSED' },
    });
    expect(salesClose.status).toBe(400);

    const adminClose = await api('POST', `/requirements/${row.id}/status`, {
      token: personas.ADMIN.token,
      body: { status: 'CLOSED' },
    });
    expect([200, 201]).toContain(adminClose.status);
  });

  it('IT-REQ-012/014: TA and TA Lead PATCH field limits', async () => {
    const req = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      taLead: personas.TA_LEAD,
      clientId,
      jobFamilyId,
    });
    const taBad = await api('PATCH', `/requirements/${req.id}`, {
      token: personas.TA.token,
      body: { roleSkill: 'Nope' },
    });
    expect(taBad.status).toBe(403);

    const taOk = await api('PATCH', `/requirements/${req.id}`, {
      token: personas.TA.token,
      body: { remarks: 'ok' },
    });
    expect([200, 201]).toContain(taOk.status);

    const tlBad = await api('PATCH', `/requirements/${req.id}`, {
      token: personas.TA_LEAD.token,
      body: { priorityCode: 'LOW' },
    });
    expect(tlBad.status).toBe(403);
  });

  it('IT-REQ-019: unknown id → 404', async () => {
    const res = await api(
      'GET',
      '/requirements/00000000-0000-4000-8000-000000000099',
      { token: personas.SALES.token },
    );
    expect(res.status).toBe(404);
  });
});
