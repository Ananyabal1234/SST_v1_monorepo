import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, adminSession, QA_PASS } from './helpers';
import { bootstrapPersonas, uniqueSuffix, type Persona, type RoleKey } from './factories';

describe('Master-data integration (Phase E)', () => {
  let adminToken: string;
  let personas: Record<RoleKey, Persona>;

  beforeAll(async () => {
    await assertApiUp();
    const boot = await bootstrapPersonas();
    adminToken = boot.adminToken;
    personas = boot.personas;
  }, 120_000);

  it('IT-MD-001: seeded lookup types return values', async () => {
    for (const t of [
      'PRIORITY',
      'CANDIDATE_STAGE',
      'OFFER_STATUS',
      'ONBOARDING_STATUS',
      'BGV_STATUS',
      'REQUIREMENT_STATUS',
      'FEEDBACK',
    ]) {
      const res = await api('GET', `/master-data/lookups/${t}`, {
        token: adminToken,
      });
      expect(res.status).toBe(200);
      const vals = res.data?.data ?? res.data;
      expect(Array.isArray(vals) ? vals.length : 1).toBeGreaterThan(0);
    }
  });

  it('IT-MD-002: unknown lookup type POST → 404', async () => {
    const res = await api('POST', '/master-data/lookups/NOT_A_TYPE', {
      token: adminToken,
      body: { code: 'X', label: 'X' },
    });
    expect(res.status).toBe(404);
  });

  it('IT-MD-003: duplicate client name returns existing', async () => {
    const name = `MD Client ${uniqueSuffix()}`;
    const a = await api('POST', '/master-data/clients', {
      token: adminToken,
      body: { name },
    });
    const b = await api('POST', '/master-data/clients', {
      token: adminToken,
      body: { name },
    });
    expect([200, 201]).toContain(a.status);
    expect([200, 201]).toContain(b.status);
    const idA = (a.data?.data ?? a.data).id;
    const idB = (b.data?.data ?? b.data).id;
    expect(idA).toBe(idB);
  });

  it('IT-MD-004: PATCH missing client → 404', async () => {
    const res = await api(
      'PATCH',
      '/master-data/clients/00000000-0000-4000-8000-000000000099',
      { token: adminToken, body: { name: 'Nope' } },
    );
    expect(res.status).toBe(404);
  });

  it('IT-MD-005: member create Admin; duplicate email 409', async () => {
    const email = `mem.${uniqueSuffix()}@sst.test`;
    const a = await api('POST', '/master-data/ta-members', {
      token: adminToken,
      body: { email, fullName: 'Mem', password: QA_PASS },
    });
    expect([200, 201]).toContain(a.status);
    const b = await api('POST', '/master-data/ta-members', {
      token: adminToken,
      body: { email, fullName: 'Mem2', password: QA_PASS },
    });
    expect(b.status).toBe(409);
  });

  it('IT-MD-006: candidate-status fixed list', async () => {
    const res = await api('GET', '/master-data/candidate-status', {
      token: personas.TA.token,
    });
    expect(res.status).toBe(200);
    const list = res.data?.data ?? res.data;
    expect(list).toEqual(
      expect.arrayContaining(['Selected', 'Rejected', 'Pending']),
    );
  });

  it('IT-MD-007: TA cannot create clients', async () => {
    const res = await api('POST', '/master-data/clients', {
      token: personas.TA.token,
      body: { name: 'Forbidden' },
    });
    expect(res.status).toBe(403);
  });
});
