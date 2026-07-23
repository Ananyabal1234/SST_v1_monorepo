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
    { code: 'SOURCED', label: 'Sourced' },
    { code: 'SUBMITTED_TO_SPOC', label: 'Submitted to SPOC' },
    { code: 'CLIENT_SHORTLIST', label: 'Client Shortlist' },
    { code: 'INTERVIEW', label: 'Interview' },
    { code: 'SELECTED', label: 'Selected' },
    { code: 'REJECTED', label: 'Rejected' },
    { code: 'ON_HOLD', label: 'On Hold' },
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
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL ?? 'admin@sst.local'
  ).toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMeNow!';

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

  const sales = await prisma.user.upsert({
    where: { email: 'sales@sst.local' },
    create: {
      email: 'sales@sst.local',
      fullName: 'Sam Sales',
      role: Role.SALES,
      passwordHash: await bcrypt.hash('ChangeMeNow!', 10),
    },
    update: {},
  });

  const ta = await prisma.user.upsert({
    where: { email: 'ta@sst.local' },
    create: {
      email: 'ta@sst.local',
      fullName: 'Tara Talent',
      role: Role.TA,
      passwordHash: await bcrypt.hash('ChangeMeNow!', 10),
    },
    update: {},
  });

  const hr = await prisma.user.upsert({
    where: { email: 'hr@sst.local' },
    create: {
      email: 'hr@sst.local',
      fullName: 'Hank HR',
      role: Role.HR,
      passwordHash: await bcrypt.hash('ChangeMeNow!', 10),
    },
    update: {},
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

    // Deactivate obsolete HR workflow codes replaced by HOLD/BACKOUT / new onboarding states
    if (code === 'OFFER_STATUS' || code === 'ONBOARDING_STATUS') {
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

  const client = await prisma.client.upsert({
    where: { nameNormalized: 'acme corp' },
    create: { name: 'Acme Corp', nameNormalized: 'acme corp' },
    update: {},
  });

  const jobFamily = await prisma.jobFamily.upsert({
    where: { name: 'Engineering' },
    create: { name: 'Engineering' },
    update: {},
  });

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

  const existingReq = await prisma.requirement.findFirst({
    where: { publicId: 'REQ-00001' },
  });
  if (!existingReq) {
    await prisma.idSequence.update({
      where: { name: 'requirement' },
      data: { value: 1 },
    });
    await prisma.requirement.create({
      data: {
        publicId: 'REQ-00001',
        requirementDate: new Date(),
        clientId: client.id,
        roleSkill: 'Core Python Developer',
        jobFamilyId: jobFamily.id,
        numberOfPositions: 2,
        salesOwnerId: sales.id,
        taOwnerId: ta.id,
        priorityCode: 'HIGH',
        taHandoffDate: new Date(),
        targetClosureDate: new Date(Date.now() + 7 * 86400000),
        experience: '5+ years',
        jobLocation: 'Bangalore',
        minBudget: 1000000,
        maxBudget: 1500000,
        durationMonths: 12,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seeded users:', {
    admin: admin.email,
    sales: sales.email,
    ta: ta.email,
    hr: hr.email,
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
