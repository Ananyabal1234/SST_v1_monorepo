import { beforeAll, describe, expect, it } from 'vitest';
import { api, assertApiUp, adminSession, login, QA_PASS } from './helpers';

describe('Auth integration (Phase E)', () => {
  let adminEmail: string;
  let adminPassword: string;

  beforeAll(async () => {
    await assertApiUp();
    adminEmail = process.env.SEED_ADMIN_EMAIL!.trim();
    adminPassword = process.env.SEED_ADMIN_PASSWORD!;
  });

  it('IT-AUTH-001: valid login', async () => {
    const res = await api('POST', '/auth/login', {
      body: { email: adminEmail, password: adminPassword },
    });
    expect([200, 201]).toContain(res.status);
    expect(res.data.accessToken).toBeTruthy();
    expect(res.data.refreshToken).toBeTruthy();
  });

  it('IT-AUTH-002: bad password → 401', async () => {
    const res = await api('POST', '/auth/login', {
      body: { email: adminEmail, password: 'WrongPass999' },
    });
    expect(res.status).toBe(401);
  });

  it('IT-AUTH-003: short password → 400', async () => {
    const res = await api('POST', '/auth/login', {
      body: { email: adminEmail, password: 'short' },
    });
    expect(res.status).toBe(400);
  });

  it('IT-AUTH-004/007: refresh rotates; logout then refresh fails', async () => {
    const sess = await login(adminEmail, adminPassword);
    const refreshed = await api('POST', '/auth/refresh', {
      body: { refreshToken: sess.refreshToken },
    });
    expect([200, 201]).toContain(refreshed.status);
    const newRefresh = refreshed.data.refreshToken;

    await api('POST', '/auth/logout', {
      token: refreshed.data.accessToken,
      body: { refreshToken: newRefresh },
    });

    const afterLogout = await api('POST', '/auth/refresh', {
      body: { refreshToken: newRefresh },
    });
    expect(afterLogout.status).toBe(401);
  });

  it('IT-AUTH-005: refresh missing → 401', async () => {
    const res = await api('POST', '/auth/refresh', { body: {} });
    expect(res.status).toBe(401);
  });

  it('IT-AUTH-008: /me valid and invalid', async () => {
    const sess = await adminSession();
    const me = await api('GET', '/auth/me', { token: sess.accessToken });
    expect(me.status).toBe(200);
    const bad = await api('GET', '/auth/me', { token: 'invalid.token' });
    expect(bad.status).toBe(401);
  });
});
