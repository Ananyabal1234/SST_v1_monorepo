import { beforeAll, describe, expect, it } from 'vitest';
import {
  QA_PASS,
  adminSession,
  api,
  assertApiUp,
  ensureUser,
  login,
  unwrap,
} from './helpers';

describe('Pipeline J1→J3 (P0)', () => {
  let adminToken: string;
  let sales: { id: string; token: string };
  let ta: { id: string; token: string };
  let taLead: { id: string; token: string };
  let hr: { id: string; token: string };
  let clientId: string;
  let jobFamilyId: string;

  beforeAll(async () => {
    await assertApiUp();
    const admin = await adminSession();
    adminToken = admin.accessToken;

    const salesUser = await ensureUser(
      adminToken,
      'qa.sales@sst.test',
      'QA Sales',
      'SALES',
    );
    const taUser = await ensureUser(adminToken, 'qa.ta@sst.test', 'QA TA', 'TA');
    const taLeadUser = await ensureUser(
      adminToken,
      'qa.talead@sst.test',
      'QA TA Lead',
      'TA_LEAD',
    );
    const hrUser = await ensureUser(adminToken, 'qa.hr@sst.test', 'QA HR', 'HR');

    sales = {
      id: salesUser.id,
      token: (await login('qa.sales@sst.test', QA_PASS)).accessToken,
    };
    ta = {
      id: taUser.id,
      token: (await login('qa.ta@sst.test', QA_PASS)).accessToken,
    };
    taLead = {
      id: taLeadUser.id,
      token: (await login('qa.talead@sst.test', QA_PASS)).accessToken,
    };
    hr = {
      id: hrUser.id,
      token: (await login('qa.hr@sst.test', QA_PASS)).accessToken,
    };

    const clients = unwrap<any>(
      (await api('GET', '/master-data/clients', { token: adminToken })).data,
    );
    const clist = Array.isArray(clients) ? clients : (clients?.data ?? []);
    let client = clist.find((c: any) => c.name === 'QA Client Alpha');
    if (!client) {
      client = unwrap(
        (
          await api('POST', '/master-data/clients', {
            token: adminToken,
            body: { name: 'QA Client Alpha' },
          })
        ).data,
      );
    }
    clientId = client.id;

    const jfs = unwrap<any>(
      (await api('GET', '/master-data/job-families', { token: adminToken })).data,
    );
    const jlist = Array.isArray(jfs) ? jfs : (jfs?.data ?? []);
    let jf = jlist.find((j: any) => j.name === 'QA Engineering');
    if (!jf) {
      jf = unwrap(
        (
          await api('POST', '/master-data/job-families', {
            token: adminToken,
            body: { name: 'QA Engineering' },
          })
        ).data,
      );
    }
    jobFamilyId = jf.id;
  }, 60_000);

  it('TC-J1→J3: create → assign → candidate → select → offer → join → recount', async () => {
    const created = await api('POST', '/requirements', {
      token: sales.token,
      body: {
        requirementDate: new Date().toISOString().slice(0, 10),
        clientId,
        roleSkill: 'QA Vitest Pipeline',
        jobFamilyId,
        numberOfPositions: 2,
        salesOwnerId: sales.id,
        priorityCode: 'HIGH',
        taLeadIds: [taLead.id],
      },
    });
    expect([200, 201]).toContain(created.status);
    const reqRow = unwrap<any>(created.data);
    expect(reqRow.openPositions).toBe(2);

    expect(
      (
        await api('PATCH', `/requirements/${reqRow.id}`, {
          token: taLead.token,
          body: {
            taOwnerIds: [ta.id],
            taHandoffDate: new Date().toISOString().slice(0, 10),
          },
        })
      ).status,
    ).toBe(200);

    const unique = Date.now().toString().slice(-8);
    const candRes = await api('POST', '/candidates', {
      token: ta.token,
      body: {
        requirementId: reqRow.id,
        name: 'Vitest Cand',
        mobile: `9777${unique}`,
        email: `vitest.${unique}@sst.test`,
        stageCode: 'SUBMITTED_TO_SPOC',
      },
    });
    expect([200, 201]).toContain(candRes.status);
    const cand = unwrap<any>(candRes.data);

    await api('POST', `/candidates/${cand.id}/select`, {
      token: ta.token,
      body: { selected: true },
    });
    const patched = await api('PATCH', `/candidates/${cand.id}`, {
      token: ta.token,
      body: { loiStatus: 'RECEIVED' },
    });
    const candAfter = unwrap<any>(patched.data);
    let offerId: string | undefined =
      candAfter?.offer?.id ?? candAfter?.offerId;

    if (!offerId) {
      const offerCreate = await api('POST', '/offers', {
        token: hr.token,
        body: {
          candidateId: cand.id,
          statusCode: 'RELEASED',
          ctcRate: '12 LPA',
          expectedDoj: new Date(Date.now() + 20 * 864e5)
            .toISOString()
            .slice(0, 10),
        },
      });
      if ([200, 201].includes(offerCreate.status)) {
        offerId = unwrap<any>(offerCreate.data).id;
      }
    }
    if (!offerId) {
      const list = unwrap<any>(
        (await api('GET', '/offers?pageSize=50', { token: hr.token })).data,
      );
      const arr = Array.isArray(list) ? list : (list?.data ?? []);
      offerId = arr.find((o: any) => o.candidateId === cand.id)?.id;
    }
    if (!offerId) {
      const one = unwrap<any>(
        (await api('GET', `/candidates/${cand.id}`, { token: ta.token })).data,
      );
      offerId = one?.offer?.id;
    }
    expect(offerId).toBeTruthy();

    await api('PATCH', `/offers/${offerId}`, {
      token: hr.token,
      body: {
        statusCode: 'RELEASED',
        ctcRate: '12 LPA',
        expectedDoj: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10),
      },
    });

    expect(
      (
        await api('POST', `/offers/${offerId}/status`, {
          token: hr.token,
          body: { statusCode: 'ACCEPTED' },
        })
      ).status,
    ).toBeLessThan(300);

    let onbId: string | undefined;
    const onbCreate = await api('POST', '/onboardings', {
      token: hr.token,
      body: {
        offerId,
        hrOwnerId: hr.id,
        bgvStatusCode: 'NOT_STARTED',
        onboardingStatus: 'DOCS_PENDING',
      },
    });
    if ([200, 201].includes(onbCreate.status)) {
      onbId = unwrap<any>(onbCreate.data).id;
    }
    if (!onbId) {
      const listRes = await api('GET', '/onboardings?pageSize=50', {
        token: hr.token,
      });
      const body = listRes.data;
      const arr =
        body?.items ??
        body?.data?.items ??
        (Array.isArray(body?.data) ? body.data : null) ??
        (Array.isArray(body) ? body : []);
      const match = arr.find(
        (o: any) =>
          o.offerId === offerId ||
          o.offer?.id === offerId ||
          o.id,
      );
      // Prefer exact offer match; fall back to newest item if sync created it
      onbId =
        arr.find((o: any) => o.offerId === offerId || o.offer?.id === offerId)
          ?.id ?? match?.id;
    }
    if (!onbId) {
      const offerGet = unwrap<any>(
        (await api('GET', `/offers/${offerId}`, { token: hr.token })).data,
      );
      onbId = offerGet?.onboarding?.id ?? offerGet?.onboardingId;
    }
    expect(onbId).toBeTruthy();

    expect(
      (
        await api('POST', `/onboardings/${onbId}/status`, {
          token: hr.token,
          body: {
            statusCode: 'JOINED',
            actualDoj: new Date().toISOString().slice(0, 10),
          },
        })
      ).status,
    ).toBeLessThan(300);

    const finalReq = unwrap<any>(
      (
        await api('GET', `/requirements/${reqRow.id}`, {
          token: sales.token,
        })
      ).data,
    );
    expect(finalReq.closedPositions).toBe(1);
    expect(finalReq.openPositions).toBe(1);
    expect(finalReq.status).toBe('ACTIVE');
  }, 90_000);

  it('TC-J2-007: cannot add candidate on CANCELLED requirement', async () => {
    const created = await api('POST', '/requirements', {
      token: sales.token,
      body: {
        requirementDate: new Date().toISOString().slice(0, 10),
        clientId,
        roleSkill: 'QA Cancel Vitest',
        jobFamilyId,
        numberOfPositions: 1,
        salesOwnerId: sales.id,
        priorityCode: 'LOW',
        taOwnerIds: [ta.id],
        taHandoffDate: new Date().toISOString().slice(0, 10),
      },
    });
    const reqRow = unwrap<any>(created.data);
    await api('POST', `/requirements/${reqRow.id}/status`, {
      token: sales.token,
      body: { status: 'CANCELLED' },
    });
    const blocked = await api('POST', '/candidates', {
      token: ta.token,
      body: {
        requirementId: reqRow.id,
        name: 'Nope',
        mobile: '111',
        email: `nope.${Date.now()}@sst.test`,
        stageCode: 'SUBMITTED_TO_SPOC',
      },
    });
    expect(blocked.status).toBe(400);
  });
});
