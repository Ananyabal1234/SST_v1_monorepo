import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, '../..');
const MONOREPO_ROOT = path.resolve(API_ROOT, '../..');

function loadEnv(filePath: string, overlay = false) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (overlay || process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv(path.join(MONOREPO_ROOT, '.env'));
loadEnv(path.join(API_ROOT, '.env'), true);

export const API_BASE = process.env.SST_API_BASE || 'http://localhost:3000';
export const PREFIX = `${API_BASE}/api/v1`;
export const QA_PASS = process.env.SST_QA_PASSWORD || 'TestUser123!';

export async function api(
  method: string,
  urlPath: string,
  opts: { token?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${PREFIX}${urlPath}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers };
}

export async function apiMultipart(
  method: string,
  urlPath: string,
  opts: {
    token?: string;
    fieldName?: string;
    fileName: string;
    mimeType: string;
    content: Buffer | Uint8Array | string;
  },
) {
  const form = new FormData();
  const blob = new Blob([opts.content], { type: opts.mimeType });
  form.append(opts.fieldName || 'resume', blob, opts.fileName);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${PREFIX}${urlPath}`, {
    method,
    headers,
    body: form,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data, headers: res.headers, raw: text };
}

export function unwrap<T = any>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

export async function assertApiUp() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(
      `API not reachable at ${API_BASE}/health — start pnpm dev first`,
    );
  }
}

export async function login(email: string, password: string) {
  const res = await api('POST', '/auth/login', { body: { email, password } });
  expect([200, 201]).toContain(res.status);
  return res.data as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: string };
  };
}

export async function ensureUser(
  adminToken: string,
  email: string,
  fullName: string,
  role: string,
  password = QA_PASS,
) {
  const list = await api('GET', '/users?pageSize=100', { token: adminToken });
  const items = unwrap<any>(list.data);
  const arr = Array.isArray(items) ? items : (items?.items ?? items?.data ?? []);
  const found = arr.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (found) {
    await api('POST', `/users/${found.id}/reset-password`, {
      token: adminToken,
      body: { password },
    });
    return found as { id: string; email: string; role: string };
  }
  const created = await api('POST', '/users', {
    token: adminToken,
    body: { email, fullName, role, password },
  });
  expect([200, 201]).toContain(created.status);
  return unwrap<{ id: string; email: string; role: string }>(created.data);
}

export async function adminSession() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD required');
  }
  return login(email, password);
}
