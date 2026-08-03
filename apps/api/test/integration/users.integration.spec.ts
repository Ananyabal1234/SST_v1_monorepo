import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, adminSession, QA_PASS, unwrap } from './helpers';
import { uniqueSuffix } from './factories';

describe('Users integration (Phase E)', () => {
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    await assertApiUp();
    const admin = await adminSession();
    adminToken = admin.accessToken;
    adminId = admin.user.id;
  }, 60_000);

  it('IT-USR-001: Admin create user', async () => {
    const email = `usr.${uniqueSuffix()}@sst.test`;
    const res = await api('POST', '/users', {
      token: adminToken,
      body: {
        email,
        fullName: 'Temp User',
        role: 'TA',
        password: QA_PASS,
      },
    });
    expect([200, 201]).toContain(res.status);
  });

  it('IT-USR-002: duplicate active email → 409', async () => {
    const email = `dup.${uniqueSuffix()}@sst.test`;
    await api('POST', '/users', {
      token: adminToken,
      body: {
        email,
        fullName: 'Dup1',
        role: 'HR',
        password: QA_PASS,
      },
    });
    const again = await api('POST', '/users', {
      token: adminToken,
      body: {
        email,
        fullName: 'Dup2',
        role: 'HR',
        password: QA_PASS,
      },
    });
    expect(again.status).toBe(409);
  });

  it('IT-USR-004/005: cannot deactivate or delete self', async () => {
    const deact = await api('PATCH', `/users/${adminId}`, {
      token: adminToken,
      body: { isActive: false },
    });
    expect(deact.status).toBe(400);
    const del = await api('DELETE', `/users/${adminId}`, {
      token: adminToken,
    });
    expect(del.status).toBe(400);
  });

  it('IT-USR-007: reset password then login', async () => {
    const email = `reset.${uniqueSuffix()}@sst.test`;
    const created = await api('POST', '/users', {
      token: adminToken,
      body: {
        email,
        fullName: 'Reset Me',
        role: 'SALES',
        password: QA_PASS,
      },
    });
    const id = unwrap<any>(created.data).id;
    const newPass = 'NewPass123!';
    const reset = await api('POST', `/users/${id}/reset-password`, {
      token: adminToken,
      body: { password: newPass },
    });
    expect([200, 201]).toContain(reset.status);
    const login = await api('POST', '/auth/login', {
      body: { email, password: newPass },
    });
    expect([200, 201]).toContain(login.status);
  });

  it('IT-USR-008: non-Admin cannot list users', async () => {
    // use sales from ensure via create
    const email = `salesaz.${uniqueSuffix()}@sst.test`;
    await api('POST', '/users', {
      token: adminToken,
      body: {
        email,
        fullName: 'Sales AZ',
        role: 'SALES',
        password: QA_PASS,
      },
    });
    const sess = await api('POST', '/auth/login', {
      body: { email, password: QA_PASS },
    });
    const list = await api('GET', '/users', {
      token: sess.data.accessToken,
    });
    expect(list.status).toBe(403);
  });
});
