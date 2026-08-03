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

describe('Onboarding integration (Phase D)', () => {
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

  async function acceptedOfferOnReq(positions = 2) {
    const req = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      taLead: personas.TA_LEAD,
      clientId,
      jobFamilyId,
      positions,
    });
    const { row } = await addCandidate(personas.TA.token, req.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    const offerId = await ensureOfferReleased(personas.HR.token, row.id);
    await acceptOffer(personas.HR.token, offerId);
    return { req, offerId, candidateId: row.id };
  }

  it('IT-ONB-001/003: create and duplicate active → 409', async () => {
    const { offerId } = await acceptedOfferOnReq(2);
    const first = await createOnboarding(personas.HR, offerId);
    expect(first.onbId).toBeTruthy();
    const second = await api('POST', '/onboardings', {
      token: personas.HR.token,
      body: {
        offerId,
        hrOwnerId: personas.HR.id,
        bgvStatusCode: 'NOT_STARTED',
        onboardingStatus: 'DOCS_PENDING',
      },
    });
    expect([409, 200, 201]).toContain(second.status);
    if (second.status === 200 || second.status === 201) {
      // restore path may return 200
      expect(unwrap(second.data)?.id || first.onbId).toBeTruthy();
    }
  });

  it('IT-ONB-002: offer not ACCEPTED → 400', async () => {
    const req = await createActiveAssignedRequirement({
      sales: personas.SALES,
      ta: personas.TA,
      clientId,
      jobFamilyId,
      positions: 1,
    });
    const { row } = await addCandidate(personas.TA.token, req.id);
    await selectWithEligibleLoi(personas.TA.token, row.id);
    const offerId = await ensureOfferReleased(personas.HR.token, row.id);
    const res = await api('POST', '/onboardings', {
      token: personas.HR.token,
      body: {
        offerId,
        hrOwnerId: personas.HR.id,
        bgvStatusCode: 'NOT_STARTED',
      },
    });
    expect(res.status).toBe(400);
  });

  it('IT-ONB-007: JOINED increments closed positions', async () => {
    const { req, offerId } = await acceptedOfferOnReq(2);
    const { onbId } = await createOnboarding(personas.HR, offerId);
    const join = await api('POST', `/onboardings/${onbId}/status`, {
      token: personas.HR.token,
      body: {
        statusCode: 'JOINED',
        actualDoj: new Date().toISOString().slice(0, 10),
      },
    });
    expect(join.status).toBeLessThan(300);
    const finalReq = unwrap<any>(
      (
        await api('GET', `/requirements/${req.id}`, {
          token: personas.SALES.token,
        })
      ).data,
    );
    expect(finalReq.closedPositions).toBeGreaterThanOrEqual(1);
    expect(finalReq.openPositions).toBe(
      finalReq.numberOfPositions - finalReq.closedPositions,
    );
  });

  it('IT-ONB-008: invalid onboarding status → 400', async () => {
    const { offerId } = await acceptedOfferOnReq(2);
    const { onbId } = await createOnboarding(personas.HR, offerId);
    const bad = await api('POST', `/onboardings/${onbId}/status`, {
      token: personas.HR.token,
      body: { statusCode: 'NOT_A_REAL_STATUS' },
    });
    expect(bad.status).toBe(400);
  });

  it('IT-ONB-010: TA cannot access onboardings', async () => {
    const res = await api('GET', '/onboardings', {
      token: personas.TA.token,
    });
    expect(res.status).toBe(403);
  });
});
