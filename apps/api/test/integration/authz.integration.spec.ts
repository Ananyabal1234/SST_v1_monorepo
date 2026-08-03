import { beforeAll, describe, expect, it } from 'vitest';
import { assertApiUp, api } from './helpers';
import { bootstrapPersonas, type Persona, type RoleKey } from './factories';

/**
 * IT-AZ-001…024 — full AuthZ matrix against live API (current @Roles behavior).
 */
describe('AuthZ matrix full (Phase B)', () => {
  let personas: Record<RoleKey, Persona>;
  let clientId: string;
  let jobFamilyId: string;
  let sampleReqId: string;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    personas = boot.personas;
    clientId = boot.clientId;
    jobFamilyId = boot.jobFamilyId;

    const created = await api('POST', '/requirements', {
      token: personas.SALES.token,
      body: {
        requirementDate: new Date().toISOString().slice(0, 10),
        clientId,
        roleSkill: 'AZ Fixture',
        jobFamilyId,
        numberOfPositions: 1,
        salesOwnerId: personas.SALES.id,
        priorityCode: 'HIGH',
        taOwnerIds: [personas.TA.id],
        taHandoffDate: new Date().toISOString().slice(0, 10),
      },
    });
    sampleReqId = (created.data?.data ?? created.data).id;
  }, 120_000);

  const deny = async (
    role: RoleKey,
    method: string,
    path: string,
    body?: unknown,
  ) => {
    const res = await api(method, path, {
      token: personas[role].token,
      body,
    });
    expect(res.status).toBe(403);
  };

  const allow2xx = async (
    role: RoleKey,
    method: string,
    path: string,
    body?: unknown,
  ) => {
    const res = await api(method, path, {
      token: personas[role].token,
      body,
    });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
  };

  it('IT-AZ-001/002: users list/create Admin only', async () => {
    await allow2xx('ADMIN', 'GET', '/users?pageSize=5');
    for (const r of [
      'SALES',
      'SALES_LEAD',
      'TA',
      'TA_LEAD',
      'HR',
      'HR_LEAD',
    ] as RoleKey[]) {
      await deny(r, 'GET', '/users');
    }
    await deny('SALES', 'POST', '/users', {
      email: `deny.${Date.now()}@sst.test`,
      fullName: 'X',
      role: 'TA',
      password: 'TestUser123!',
    });
  });

  it('IT-AZ-004: directory allowed for all roles', async () => {
    for (const r of Object.keys(personas) as RoleKey[]) {
      await allow2xx(r, 'GET', '/users/directory');
    }
  });

  it('IT-AZ-005: lookup POST Admin only', async () => {
    await deny('TA', 'POST', '/master-data/lookups/PRIORITY', {
      code: 'X',
      label: 'X',
    });
    await deny('SALES', 'POST', '/master-data/lookups/PRIORITY', {
      code: 'X',
      label: 'X',
    });
  });

  it('IT-AZ-006/007: clients/job-families mutate Sales+Lead+Admin', async () => {
    await deny('TA', 'POST', '/master-data/clients', { name: 'No' });
    await deny('HR', 'POST', '/master-data/job-families', { name: 'No' });
    const c = await api('POST', '/master-data/clients', {
      token: personas.SALES.token,
      body: { name: `AZ Client ${Date.now()}` },
    });
    expect([200, 201]).toContain(c.status);
  });

  it('IT-AZ-008: ta-members POST Admin only', async () => {
    await deny('SALES_LEAD', 'POST', '/master-data/ta-members', {
      email: `m.${Date.now()}@sst.test`,
      fullName: 'M',
      password: 'TestUser123!',
    });
  });

  it('IT-AZ-009: candidate-status Admin/TA/TA_LEAD', async () => {
    await allow2xx('ADMIN', 'GET', '/master-data/candidate-status');
    await allow2xx('TA', 'GET', '/master-data/candidate-status');
    await allow2xx('TA_LEAD', 'GET', '/master-data/candidate-status');
    await deny('SALES', 'GET', '/master-data/candidate-status');
    await deny('HR', 'GET', '/master-data/candidate-status');
  });

  it('IT-AZ-010: requirement create Sales+Lead+Admin only', async () => {
    await deny('TA', 'POST', '/requirements', {
      requirementDate: '2026-08-01',
      clientId,
      roleSkill: 'X',
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
    });
    await deny('HR', 'POST', '/requirements', {
      requirementDate: '2026-08-01',
      clientId,
      roleSkill: 'X',
      jobFamilyId,
      numberOfPositions: 1,
      salesOwnerId: personas.SALES.id,
      priorityCode: 'HIGH',
    });
  });

  it('IT-AZ-012: TA cannot PATCH core fields; TA Lead field limit', async () => {
    const taCore = await api('PATCH', `/requirements/${sampleReqId}`, {
      token: personas.TA.token,
      body: { roleSkill: 'Hacked' },
    });
    expect(taCore.status).toBe(403);

    const tlCore = await api('PATCH', `/requirements/${sampleReqId}`, {
      token: personas.TA_LEAD.token,
      body: { roleSkill: 'Hacked' },
    });
    expect(tlCore.status).toBe(403);
  });

  it('IT-AZ-013: requirement status Sales/Admin only', async () => {
    await deny('TA', 'POST', `/requirements/${sampleReqId}/status`, {
      status: 'ON_HOLD',
    });
    await deny('HR', 'POST', `/requirements/${sampleReqId}/status`, {
      status: 'ON_HOLD',
    });
  });

  it('IT-AZ-014: pipeline excludes HR', async () => {
    await deny('HR', 'GET', `/requirements/${sampleReqId}/pipeline`);
    await deny('HR_LEAD', 'GET', `/requirements/${sampleReqId}/pipeline`);
    await allow2xx('TA', 'GET', `/requirements/${sampleReqId}/pipeline`);
  });

  it('IT-AZ-015/016: candidates mutate TA family only', async () => {
    await deny('SALES', 'POST', '/candidates', {
      requirementId: sampleReqId,
      name: 'X',
      mobile: '1',
      email: 'x@y.com',
      stageCode: 'SUBMITTED_TO_SPOC',
    });
    await deny('HR', 'POST', '/candidates', {
      requirementId: sampleReqId,
      name: 'X',
      mobile: '1',
      email: 'x@y.com',
      stageCode: 'SUBMITTED_TO_SPOC',
    });
  });

  it('IT-AZ-017: duplicates Admin/TA/TA_LEAD', async () => {
    await allow2xx('TA', 'GET', '/candidates/duplicates?mobile=999');
    await deny('SALES', 'GET', '/candidates/duplicates?mobile=999');
    await deny('HR', 'GET', '/candidates/duplicates?mobile=999');
  });

  it('IT-AZ-018..020: offers create vs patch/status', async () => {
    // PATCH/status denied for TA/Sales
    const fakeId = '00000000-0000-4000-8000-000000000099';
    await deny('TA', 'PATCH', `/offers/${fakeId}`, { remarks: 'x' });
    await deny('SALES', 'POST', `/offers/${fakeId}/status`, {
      statusCode: 'ACCEPTED',
    });
    // Class allows TA to POST create — will 404/400 on fake candidate, not 403
    const taCreate = await api('POST', '/offers', {
      token: personas.TA.token,
      body: {
        candidateId: fakeId,
        statusCode: 'RELEASED',
      },
    });
    expect(taCreate.status).not.toBe(403);
  });

  it('IT-AZ-021: onboardings HR family only', async () => {
    await deny('TA', 'POST', '/onboardings', {
      offerId: '00000000-0000-4000-8000-000000000001',
      hrOwnerId: personas.HR.id,
      bgvStatusCode: 'NOT_STARTED',
    });
    await deny('SALES', 'GET', '/onboardings');
  });

  it('IT-AZ-022/023: audit and import Admin only', async () => {
    await allow2xx('ADMIN', 'GET', '/audit-logs?pageSize=1');
    await deny('SALES', 'GET', '/audit-logs');
    await deny('TA', 'POST', '/imports/validate', {
      entity: 'requirements',
      csv: 'a\n',
    });
  });

  it('IT-AZ-024: dashboard all authenticated roles', async () => {
    for (const r of Object.keys(personas) as RoleKey[]) {
      const res = await api('POST', '/dashboard', {
        token: personas[r].token,
        body: {},
      });
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    }
  });
});
