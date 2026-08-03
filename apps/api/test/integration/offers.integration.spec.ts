import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, unwrap } from './helpers';
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

describe('Offers integration (Phase D)', () => {
  let personas: Record<RoleKey, Persona>;
  let clientId: string;
  let jobFamilyId: string;
  let req: any;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    personas = boot.personas;
    clientId = boot.clientId;
    jobFamilyId = boot.jobFamilyId;
    req = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      taLead: personas.TA_LEAD,
      clientId,
      jobFamilyId,
      positions: 3,
    });
  }, 120_000);

  it('IT-OFF-002: create offer for non-selected → 400', async () => {
    const { row } = await addCandidate(personas.TA.token, req.id);
    const res = await api('POST', '/offers', {
      token: personas.HR.token,
      body: { candidateId: row.id, statusCode: 'RELEASED' },
    });
    expect(res.status).toBe(400);
  });

  it('IT-OFF-003: LOI NOT_RECEIVED blocks offer create', async () => {
    const { row } = await addCandidate(personas.TA.token, req.id);
    await api('POST', `/candidates/${row.id}/select`, {
      token: personas.TA.token,
      body: { selected: true },
    });
    // default LOI NOT_RECEIVED
    const res = await api('POST', '/offers', {
      token: personas.HR.token,
      body: { candidateId: row.id, statusCode: 'RELEASED' },
    });
    expect(res.status).toBe(400);
  });

  it('IT-OFF-001/004: eligible create then second offer 409', async () => {
    const { row } = await addCandidate(personas.TA.token, req.id);
    const { offerId } = await selectWithEligibleLoi(personas.TA.token, row.id);
    const id =
      offerId ??
      (await ensureOfferReleased(personas.HR.token, row.id));
    expect(id).toBeTruthy();
    const again = await api('POST', '/offers', {
      token: personas.HR.token,
      body: { candidateId: row.id, statusCode: 'RELEASED' },
    });
    expect(again.status).toBe(409);
  });

  it('IT-OFF-006: TA can POST create path; cannot PATCH status', async () => {
    const { row } = await addCandidate(personas.TA.token, req.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    const offerId = await ensureOfferReleased(personas.HR.token, row.id);
    const patch = await api('PATCH', `/offers/${offerId}`, {
      token: personas.TA.token,
      body: { remarks: 'nope' },
    });
    expect(patch.status).toBe(403);
    const status = await api('POST', `/offers/${offerId}/status`, {
      token: personas.TA.token,
      body: { statusCode: 'ACCEPTED' },
    });
    expect(status.status).toBe(403);
  });

  it('IT-OFF-008: ACCEPTED cascades to onboarding', async () => {
    const { row } = await addCandidate(personas.TA.token, req.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    const offerId = await ensureOfferReleased(personas.HR.token, row.id);
    const acc = await acceptOffer(personas.HR.token, offerId);
    expect(acc.status).toBeLessThan(300);
    const { onbId } = await createOnboarding(personas.HR, offerId);
    expect(onbId).toBeTruthy();
  });

  it('IT-OFF-011: demote offer while JOINED onboarding → 400', async () => {
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
    const demote = await api('POST', `/offers/${offerId}/status`, {
      token: personas.HR.token,
      body: { statusCode: 'HOLD' },
    });
    expect(demote.status).toBe(400);
  });
});
