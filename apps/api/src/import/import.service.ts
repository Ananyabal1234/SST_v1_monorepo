import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { normalizeEmail, normalizeMobile } from '@sst/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdSequenceService } from '../id-sequence/id-sequence.service';

type ReqRow = {
  requirementDate: string;
  clientName: string;
  roleSkill: string;
  jobFamilyName: string;
  numberOfPositions: string;
  salesOwnerEmail: string;
  priorityCode: string;
  taOwnerEmail?: string;
};

type CanRow = {
  requirementPublicId: string;
  name: string;
  mobile: string;
  email: string;
  stageCode: string;
  feedbackCode?: string;
  source?: string;
};

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ids: IdSequenceService,
  ) {}

  private parseCsv(content: string): string[][] {
    return content
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) =>
        line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')),
      );
  }

  validateRequirements(csv: string) {
    const rows = this.parseCsv(csv);
    if (rows.length < 2) {
      throw new BadRequestException('CSV must include header and rows');
    }
    const [header, ...data] = rows;
    const required = [
      'requirementDate',
      'clientName',
      'roleSkill',
      'jobFamilyName',
      'numberOfPositions',
      'salesOwnerEmail',
      'priorityCode',
    ];
    for (const col of required) {
      if (!header.includes(col)) {
        throw new BadRequestException(`Missing column: ${col}`);
      }
    }
    const errors: { row: number; message: string }[] = [];
    const parsed: ReqRow[] = [];
    data.forEach((cells, idx) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      if (!obj.roleSkill) errors.push({ row: idx + 2, message: 'roleSkill required' });
      if (!obj.clientName) errors.push({ row: idx + 2, message: 'clientName required' });
      if (!Number(obj.numberOfPositions)) {
        errors.push({ row: idx + 2, message: 'numberOfPositions invalid' });
      }
      parsed.push(obj as unknown as ReqRow);
    });
    return {
      valid: errors.length === 0,
      rowCount: parsed.length,
      errors,
      preview: parsed.slice(0, 10),
    };
  }

  validateCandidates(csv: string) {
    const rows = this.parseCsv(csv);
    if (rows.length < 2) {
      throw new BadRequestException('CSV must include header and rows');
    }
    const [header, ...data] = rows;
    const required = [
      'requirementPublicId',
      'name',
      'mobile',
      'email',
      'stageCode',
    ];
    for (const col of required) {
      if (!header.includes(col)) {
        throw new BadRequestException(`Missing column: ${col}`);
      }
    }
    const errors: { row: number; message: string }[] = [];
    const parsed: CanRow[] = [];
    data.forEach((cells, idx) => {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      if (!obj.name) errors.push({ row: idx + 2, message: 'name required' });
      if (!obj.email) errors.push({ row: idx + 2, message: 'email required' });
      parsed.push(obj as unknown as CanRow);
    });
    return {
      valid: errors.length === 0,
      rowCount: parsed.length,
      errors,
      preview: parsed.slice(0, 10),
    };
  }

  async commitRequirements(csv: string, actorId: string) {
    const validation = this.validateRequirements(csv);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }
    const rows = this.parseCsv(csv);
    const [header, ...data] = rows;
    let created = 0;
    for (const cells of data) {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      const clientName = obj.clientName.trim();
      const client = await this.prisma.client.upsert({
        where: { nameNormalized: clientName.toLowerCase() },
        create: {
          name: clientName,
          nameNormalized: clientName.toLowerCase(),
        },
        update: {},
      });
      let jobFamily = await this.prisma.jobFamily.findFirst({
        where: { name: obj.jobFamilyName.trim(), deletedAt: null },
      });
      if (!jobFamily) {
        jobFamily = await this.prisma.jobFamily.create({
          data: { name: obj.jobFamilyName.trim() },
        });
      }
      const sales = await this.prisma.user.findFirst({
        where: { email: obj.salesOwnerEmail.toLowerCase(), deletedAt: null },
      });
      if (!sales) continue;
      let taOwnerId: string | undefined;
      if (obj.taOwnerEmail) {
        const ta = await this.prisma.user.findFirst({
          where: { email: obj.taOwnerEmail.toLowerCase(), deletedAt: null },
        });
        taOwnerId = ta?.id;
      }
      const publicId = await this.ids.next('requirement', 'REQ');
      await this.prisma.requirement.create({
        data: {
          publicId,
          requirementDate: new Date(obj.requirementDate),
          clientId: client.id,
          roleSkill: obj.roleSkill,
          jobFamilyId: jobFamily.id,
          numberOfPositions: Number(obj.numberOfPositions),
          salesOwnerId: sales.id,
          priorityCode: obj.priorityCode,
          taOwnerId,
        },
      });
      created += 1;
    }
    await this.audit.log({
      entityType: 'Import',
      entityId: 'requirements',
      action: 'COMMIT',
      actorUserId: actorId,
      after: { created },
    });
    return { created };
  }

  async commitCandidates(csv: string, actorId: string) {
    const validation = this.validateCandidates(csv);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }
    const rows = this.parseCsv(csv);
    const [header, ...data] = rows;
    let created = 0;
    for (const cells of data) {
      const obj: Record<string, string> = {};
      header.forEach((h, i) => {
        obj[h] = cells[i] ?? '';
      });
      const req = await this.prisma.requirement.findFirst({
        where: { publicId: obj.requirementPublicId, deletedAt: null },
      });
      if (!req) continue;
      const publicId = await this.ids.next('candidate', 'CAN');
      await this.prisma.candidate.create({
        data: {
          publicId,
          requirementId: req.id,
          name: obj.name,
          mobile: obj.mobile,
          mobileNormalized: normalizeMobile(obj.mobile),
          email: obj.email,
          emailNormalized: normalizeEmail(obj.email),
          stageCode: obj.stageCode,
          feedbackCode: obj.feedbackCode || null,
          source: obj.source || null,
        },
      });
      created += 1;
    }
    await this.audit.log({
      entityType: 'Import',
      entityId: 'candidates',
      action: 'COMMIT',
      actorUserId: actorId,
      after: { created },
    });
    return { created };
  }
}
