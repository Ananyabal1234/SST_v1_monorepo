import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

function loadEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
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
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv('.env');
loadEnv('apps/api/.env');

const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
const pass = process.env.SEED_ADMIN_PASSWORD;
if (!email || !pass) {
  console.error('missing seed admin env');
  process.exit(1);
}

const prisma = new PrismaClient();
const hash = await bcrypt.hash(pass, 10);
const u = await prisma.user.upsert({
  where: { email },
  create: {
    email,
    fullName: 'SST Admin',
    role: 'ADMIN',
    passwordHash: hash,
    isActive: true,
  },
  update: { passwordHash: hash, isActive: true, deletedAt: null },
});
console.log(
  'admin_reset_ok',
  u.role,
  'email_len=' + email.length,
  'pass_len=' + pass.length,
);
await prisma.$disconnect();
