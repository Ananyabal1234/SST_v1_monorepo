import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const LOOKUPS: Record<string, { code: string; label: string }[]> = {
  PRIORITY: [
    { code: 'CRITICAL', label: 'Critical' },
    { code: 'HIGH', label: 'High' },
    { code: 'MEDIUM', label: 'Medium' },
    { code: 'LOW', label: 'Low' },
  ],
  CANDIDATE_STAGE: [
    { code: 'SUBMITTED_TO_SPOC', label: 'Submitted to SPOC' },
    { code: 'CLIENT_SHORTLIST', label: 'Client Shortlist' },
    { code: 'HOLD', label: 'Hold' },
    { code: 'REJECT', label: 'Reject' },
  ],
  INTERVIEW_ROUND: [
    { code: 'L1', label: 'L1' },
    { code: 'L2', label: 'L2' },
    { code: 'L3', label: 'L3' },
    { code: 'L4', label: 'L4' },
    { code: 'COMPLETED', label: 'Completed' },
  ],
  FEEDBACK: [
    { code: 'PENDING', label: 'Pending' },
    { code: 'POSITIVE', label: 'Positive' },
    { code: 'NEGATIVE', label: 'Negative' },
    { code: 'HOLD', label: 'Hold' },
  ],
  OFFER_STATUS: [
    { code: 'INITIATED', label: 'Initiated' },
    { code: 'RELEASED', label: 'Released' },
    { code: 'ACCEPTED', label: 'Accepted' },
    { code: 'DECLINED', label: 'Declined' },
    { code: 'HOLD', label: 'Hold' },
    { code: 'BACKOUT', label: 'Backout' },
  ],
  ONBOARDING_STATUS: [
    { code: 'DOCS_PENDING', label: 'Docs Pending' },
    { code: 'BGV_IN_PROGRESS', label: 'BGV in Progress' },
    { code: 'BGV_CLEARED', label: 'BGV Cleared' },
    { code: 'OFFER_LETTER_SIGNED', label: 'Offer Letter Signed' },
    { code: 'JOINED', label: 'Joined' },
    { code: 'DELAYED', label: 'Delayed' },
    { code: 'BACKOUT', label: 'Backout' },
    // UI-facing codes used by RecuirementDashboard Onboarding screen
    { code: 'IN_PROGRESS', label: 'In Progress' },
    { code: 'ON_HOLD', label: 'On Hold' },
    { code: 'COMPLETED', label: 'Completed' },
  ],
  BGV_STATUS: [
    { code: 'NOT_STARTED', label: 'Not Started' },
    { code: 'IN_PROGRESS', label: 'In Progress' },
    { code: 'CLEARED', label: 'Cleared' },
    { code: 'FAILED', label: 'Failed' },
  ],
  REQUIREMENT_STATUS: [
    { code: 'ACTIVE', label: 'Active' },
    { code: 'ON_HOLD', label: 'On Hold' },
    { code: 'CANCELLED', label: 'Cancelled' },
    { code: 'CLOSED', label: 'Closed' },
  ],
};

async function main() {
  const adminEmailRaw = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmailRaw || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in the environment before seeding',
    );
  }
  const adminEmail = adminEmailRaw.toLowerCase();

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      fullName: 'SST Admin',
      role: Role.ADMIN,
      passwordHash,
    },
    update: { passwordHash, isActive: true, deletedAt: null },
  });

  for (const [code, values] of Object.entries(LOOKUPS)) {
    const type = await prisma.lookupType.upsert({
      where: { code },
      create: { code, label: code.replace(/_/g, ' ') },
      update: {},
    });
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      await prisma.lookupValue.upsert({
        where: {
          lookupTypeId_code: { lookupTypeId: type.id, code: v.code },
        },
        create: {
          lookupTypeId: type.id,
          code: v.code,
          label: v.label,
          sortOrder: i + 1,
        },
        update: { label: v.label, sortOrder: i + 1, isActive: true },
      });
    }

    // Deactivate obsolete codes replaced by the current lookup set
    if (
      code === 'OFFER_STATUS' ||
      code === 'ONBOARDING_STATUS' ||
      code === 'CANDIDATE_STAGE'
    ) {
      const keep = new Set(values.map((v) => v.code));
      await prisma.lookupValue.updateMany({
        where: {
          lookupTypeId: type.id,
          code: { notIn: [...keep] },
        },
        data: { isActive: false },
      });
    }
  }

  // Migrate legacy status codes on live rows
  await prisma.offer.updateMany({
    where: { statusCode: 'WITHDRAWN' },
    data: { statusCode: 'BACKOUT' },
  });
  await prisma.onboarding.updateMany({
    where: { statusCode: 'DROPPED' },
    data: { statusCode: 'BACKOUT' },
  });
  // IN_PROGRESS is a first-class UI onboarding status — do not migrate away

  // Migrate legacy candidate stage codes
  await prisma.candidate.updateMany({
    where: { stageCode: 'ON_HOLD' },
    data: { stageCode: 'HOLD' },
  });
  await prisma.candidate.updateMany({
    where: { stageCode: 'REJECTED' },
    data: { stageCode: 'REJECT' },
  });
  await prisma.candidate.updateMany({
    where: { stageCode: { in: ['SOURCED', 'INTERVIEW', 'SELECTED'] } },
    data: { stageCode: 'SUBMITTED_TO_SPOC' },
  });

  // Normalize free-text interview rounds to L1–L4 / COMPLETED where practical
  const roundMigrations: { match: string[]; code: string }[] = [
    { match: ['L1', 'ROUND 1', 'ROUND1', 'R1'], code: 'L1' },
    { match: ['L2', 'ROUND 2', 'ROUND2', 'R2'], code: 'L2' },
    { match: ['L3', 'ROUND 3', 'ROUND3', 'R3'], code: 'L3' },
    { match: ['L4', 'ROUND 4', 'ROUND4', 'R4', 'FINAL'], code: 'L4' },
    { match: ['COMPLETED', 'COMPLETE', 'DONE'], code: 'COMPLETED' },
  ];
  const candidatesWithRound = await prisma.candidate.findMany({
    where: { interviewRound: { not: null }, deletedAt: null },
    select: { id: true, interviewRound: true },
  });
  for (const cand of candidatesWithRound) {
    const raw = (cand.interviewRound ?? '').trim().toUpperCase();
    if (!raw) continue;
    if (['L1', 'L2', 'L3', 'L4', 'COMPLETED'].includes(raw)) {
      if (cand.interviewRound !== raw) {
        await prisma.candidate.update({
          where: { id: cand.id },
          data: { interviewRound: raw },
        });
      }
      continue;
    }
    const mapped = roundMigrations.find((m) => m.match.includes(raw));
    await prisma.candidate.update({
      where: { id: cand.id },
      data: { interviewRound: mapped ? mapped.code : null },
    });
  }

  await prisma.idSequence.upsert({
    where: { name: 'requirement' },
    create: { name: 'requirement', value: 0 },
    update: {},
  });
  await prisma.idSequence.upsert({
    where: { name: 'candidate' },
    create: { name: 'candidate', value: 0 },
    update: {},
  });
  await prisma.idSequence.upsert({
    where: { name: 'offer' },
    create: { name: 'offer', value: 0 },
    update: {},
  });
  await prisma.idSequence.upsert({
    where: { name: 'onboarding' },
    create: { name: 'onboarding', value: 0 },
    update: {},
  });

  let taLeadEmail: string | null = null;
  const taLeadEmailRaw = process.env.SEED_TA_LEAD_EMAIL?.trim();
  const taLeadPassword = process.env.SEED_TA_LEAD_PASSWORD;
  if (taLeadEmailRaw && taLeadPassword) {
    const email = taLeadEmailRaw.toLowerCase();
    const taLeadHash = await bcrypt.hash(taLeadPassword, 10);
    const taLead = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        fullName: 'SST TA Lead',
        role: Role.TA_LEAD,
        passwordHash: taLeadHash,
      },
      update: {
        passwordHash: taLeadHash,
        role: Role.TA_LEAD,
        isActive: true,
        deletedAt: null,
      },
    });
    taLeadEmail = taLead.email;
  }

  // eslint-disable-next-line no-console
  console.log('Seeded users:', {
    admin: admin.email,
    ...(taLeadEmail ? { taLead: taLeadEmail } : {}),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
