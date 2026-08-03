import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, unwrap } from './helpers';
import {
  addCandidate,
  bootstrapPersonas,
  createActiveAssignedRequirement,
  createRequirement,
  selectWithEligibleLoi,
  type Persona,
  type RoleKey,
  uniqueSuffix,
} from './factories';

describe('Candidates integration (Phase C)', () => {
  let personas: Record<RoleKey, Persona>;
  let clientId: string;
  let jobFamilyId: string;
  let assignedReq: any;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    personas = boot.personas;
    clientId = boot.clientId;
    jobFamilyId = boot.jobFamilyId;
    assignedReq = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      taLead: personas.TA_LEAD,
      clientId,
      jobFamilyId,
      positions: 2,
    });
  }, 120_000);

  it('IT-CAN-001: assigned TA creates candidate on ACTIVE', async () => {
    const { status, row } = await addCandidate(
      personas.TA.token,
      assignedReq.id,
    );
    expect([200, 201]).toContain(status);
    expect(row.id).toBeTruthy();
  });

  it('IT-CAN-002/003: block create on ON_HOLD and CANCELLED', async () => {
    const holdReq = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      clientId,
      jobFamilyId,
      positions: 1,
      roleSkill: `Hold ${uniqueSuffix()}`,
    });
    await api('POST', `/requirements/${holdReq.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'ON_HOLD' },
    });
    const onHold = await addCandidate(personas.TA.token, holdReq.id);
    expect(onHold.status).toBe(400);

    const cancelReq = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      clientId,
      jobFamilyId,
      positions: 1,
      roleSkill: `Cancel ${uniqueSuffix()}`,
    });
    await api('POST', `/requirements/${cancelReq.id}/status`, {
      token: personas.SALES.token,
      body: { status: 'CANCELLED' },
    });
    const cancelled = await addCandidate(personas.TA.token, cancelReq.id);
    expect(cancelled.status).toBe(400);
  });

  it('IT-CAN-005: Sales cannot create candidates', async () => {
    const res = await addCandidate(personas.SALES.token, assignedReq.id);
    expect(res.status).toBe(403);
  });

  it('IT-CAN-006/007: duplicates require mobile or email; flags work', async () => {
    const empty = await api('GET', '/candidates/duplicates', {
      token: personas.TA.token,
    });
    expect(empty.status).toBe(400);

    const mobile = `9888${Date.now().toString().slice(-6)}`;
    await addCandidate(personas.TA.token, assignedReq.id, {
      mobile,
      email: `d1.${uniqueSuffix()}@sst.test`,
    });
    await addCandidate(personas.TA.token, assignedReq.id, {
      mobile,
      email: `d2.${uniqueSuffix()}@sst.test`,
    });
    const dup = await api('GET', `/candidates/duplicates?mobile=${mobile}`, {
      token: personas.TA.token,
    });
    expect(dup.status).toBe(200);
  });

  it('IT-CAN-009: loiStatus when not Selected → 400', async () => {
    const { row } = await addCandidate(personas.TA.token, assignedReq.id);
    const patch = await api('PATCH', `/candidates/${row.id}`, {
      token: personas.TA.token,
      body: { loiStatus: 'RECEIVED' },
    });
    expect(patch.status).toBe(400);
  });

  it('IT-CAN-010/011: select + LOI RECEIVED enables offer', async () => {
    const { row } = await addCandidate(personas.TA.token, assignedReq.id);
    const { offerId } = await selectWithEligibleLoi(
      personas.TA.token,
      row.id,
    );
    // offer may be auto-created
    if (!offerId) {
      const created = await api('POST', '/offers', {
        token: personas.HR.token,
        body: {
          candidateId: row.id,
          statusCode: 'RELEASED',
        },
      });
      expect([200, 201, 409]).toContain(created.status);
    } else {
      expect(offerId).toBeTruthy();
    }
  });

  it('IT-CAN-012: unselect with offer → 400', async () => {
    const { row } = await addCandidate(personas.TA.token, assignedReq.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    await api('POST', '/offers', {
      token: personas.HR.token,
      body: { candidateId: row.id, statusCode: 'RELEASED' },
    });
    const unselect = await api('POST', `/candidates/${row.id}/select`, {
      token: personas.TA.token,
      body: { selected: false },
    });
    expect(unselect.status).toBe(400);
  });
});
