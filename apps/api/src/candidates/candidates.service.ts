import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { normalizeEmail, normalizeMobile } from '@sst/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdSequenceService } from '../id-sequence/id-sequence.service';
import { OffersService } from '../offers/offers.service';
import { RequirementsService } from '../requirements/requirements.service';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
} from './dto/candidates.dto';

type StatusFields = {
  selected?: boolean;
  selectedAt?: Date | null;
  feedbackCode?: string | null;
};

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ids: IdSequenceService,
    private readonly offers: OffersService,
    private readonly requirements: RequirementsService,
  ) {}

  private isPublicId(id: string) {
    return /^CAN-\d+$/i.test(id);
  }

  private whereById(id: string): Prisma.CandidateWhereInput {
    return this.isPublicId(id)
      ? { publicId: id.toUpperCase(), deletedAt: null }
      : { id, deletedAt: null };
  }

  private deriveCandidateStatus(
    selected: boolean,
    feedbackCode: string | null | undefined,
  ): string {
    if (selected) return 'Selected';
    if ((feedbackCode ?? '').toUpperCase() === 'NEGATIVE') return 'Rejected';
    return 'Pending';
  }

  private toCandidateResponse(row: Record<string, unknown>) {
    const selected = Boolean(row.selected);
    const feedbackCode = (row.feedbackCode as string | null) ?? null;
    return {
      ...row,
      id: row.id,
      publicId: row.publicId,
      requirementId: row.requirementId,
      stageCode: row.stageCode,
      feedbackCode,
      selected,
      candidateStatus: this.deriveCandidateStatus(selected, feedbackCode),
    };
  }

  private wrapCandidate(
    mapped: Record<string, unknown>,
    message: string,
  ): Record<string, unknown> {
    return {
      ...mapped,
      candidate: mapped,
      message,
    };
  }

  private async assertLookupCode(
    lookupType: string,
    value: string,
    fieldLabel: string,
  ): Promise<string> {
    const code = value.trim().toUpperCase();
    const found = await this.prisma.lookupValue.findFirst({
      where: {
        code,
        isActive: true,
        lookupType: { code: lookupType },
      },
    });
    if (!found) {
      throw new BadRequestException(
        `Invalid ${fieldLabel} '${value}'. Use an active ${lookupType} lookup value.`,
      );
    }
    return code;
  }

  private async assertStageCode(stageCode: string): Promise<string> {
    return this.assertLookupCode('CANDIDATE_STAGE', stageCode, 'stageCode');
  }

  private static readonly INTERVIEW_ROUND_VALUES: {
    code: string;
    label: string;
  }[] = [
    { code: 'L1', label: 'L1' },
    { code: 'L2', label: 'L2' },
    { code: 'L3', label: 'L3' },
    { code: 'L4', label: 'L4' },
    { code: 'COMPLETED', label: 'Completed' },
  ];

  /** Map legacy numeric / free-text interview rounds onto L1–L4 / COMPLETED. */
  private normalizeInterviewRound(raw: string): string {
    const value = raw.trim().toUpperCase().replace(/\s+/g, ' ');
    if (/^L[1-4]$/.test(value) || value === 'COMPLETED') return value;

    const aliasMap: Record<string, string> = {
      '1': 'L1',
      R1: 'L1',
      'ROUND 1': 'L1',
      ROUND1: 'L1',
      '2': 'L2',
      R2: 'L2',
      'ROUND 2': 'L2',
      ROUND2: 'L2',
      '3': 'L3',
      R3: 'L3',
      'ROUND 3': 'L3',
      ROUND3: 'L3',
      '4': 'L4',
      R4: 'L4',
      'ROUND 4': 'L4',
      ROUND4: 'L4',
      FINAL: 'L4',
      COMPLETED: 'COMPLETED',
      COMPLETE: 'COMPLETED',
      DONE: 'COMPLETED',
    };
    return aliasMap[value] ?? value;
  }

  private async ensureInterviewRoundLookups(): Promise<void> {
    const activeCount = await this.prisma.lookupValue.count({
      where: {
        isActive: true,
        lookupType: { code: 'INTERVIEW_ROUND' },
      },
    });
    if (activeCount > 0) return;

    const type = await this.prisma.lookupType.upsert({
      where: { code: 'INTERVIEW_ROUND' },
      create: { code: 'INTERVIEW_ROUND', label: 'INTERVIEW ROUND' },
      update: {},
    });

    for (let i = 0; i < CandidatesService.INTERVIEW_ROUND_VALUES.length; i++) {
      const v = CandidatesService.INTERVIEW_ROUND_VALUES[i];
      await this.prisma.lookupValue.upsert({
        where: {
          lookupTypeId_code: { lookupTypeId: type.id, code: v.code },
        },
        create: {
          lookupTypeId: type.id,
          code: v.code,
          label: v.label,
          sortOrder: i + 1,
          isActive: true,
        },
        update: { label: v.label, sortOrder: i + 1, isActive: true },
      });
    }
  }

  private async assertInterviewRound(
    interviewRound: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (interviewRound === undefined) return undefined;
    if (interviewRound === null || String(interviewRound).trim() === '') {
      return null;
    }
    const normalized = this.normalizeInterviewRound(String(interviewRound));
    await this.ensureInterviewRoundLookups();
    return this.assertLookupCode(
      'INTERVIEW_ROUND',
      normalized,
      'interviewRound',
    );
  }

  /**
   * Maps RecuirementDashboard `candidateStatus` labels onto selected + feedbackCode.
   */
  private resolveStatusFields(
    dto: { candidateStatus?: string; feedbackCode?: string | null },
    hadOffer: boolean,
  ): StatusFields {
    const label = dto.candidateStatus?.trim().toLowerCase();
    if (label === 'selected') {
      return {
        selected: true,
        selectedAt: new Date(),
        feedbackCode: dto.feedbackCode ?? 'PENDING',
      };
    }
    if (label === 'rejected') {
      if (hadOffer) {
        throw new BadRequestException(
          'Cannot unselect candidate with an existing offer',
        );
      }
      return {
        selected: false,
        selectedAt: null,
        feedbackCode: dto.feedbackCode ?? 'NEGATIVE',
      };
    }
    if (label === 'pending') {
      if (hadOffer) {
        throw new BadRequestException(
          'Cannot unselect candidate with an existing offer',
        );
      }
      return {
        selected: false,
        selectedAt: null,
        feedbackCode: dto.feedbackCode ?? 'PENDING',
      };
    }
    if (dto.feedbackCode !== undefined) {
      return { feedbackCode: dto.feedbackCode };
    }
    return {};
  }

  private async duplicateFlags(
    mobileNorm: string,
    emailNorm: string,
    excludeId?: string,
  ) {
    const [mobileDupes, emailDupes] = await Promise.all([
      this.prisma.candidate.count({
        where: {
          mobileNormalized: mobileNorm,
          deletedAt: null,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      }),
      this.prisma.candidate.count({
        where: {
          emailNormalized: emailNorm,
          deletedAt: null,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
      }),
    ]);
    return {
      duplicateMobile: mobileDupes > 0,
      duplicateEmail: emailDupes > 0,
      duplicateMobileCount: mobileDupes,
      duplicateEmailCount: emailDupes,
    };
  }

  async list(query: Record<string, string | undefined>) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const stageFilter = query.stageCode ?? query.candidateStage;
    const where: Prisma.CandidateWhereInput = {
      deletedAt: null,
      ...(query.requirementId ? { requirementId: query.requirementId } : {}),
      ...(stageFilter ? { stageCode: stageFilter } : {}),
      ...(query.selected !== undefined
        ? { selected: query.selected === 'true' }
        : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { publicId: { contains: query.q, mode: 'insensitive' } },
              { mobile: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        include: {
          requirement: {
            select: {
              id: true,
              publicId: true,
              roleSkill: true,
              client: { select: { name: true } },
            },
          },
          offer: { select: { id: true, publicId: true, statusCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.candidate.count({ where }),
    ]);
    return {
      items: items.map((row) => this.toCandidateResponse(row)),
      total,
      page,
      pageSize,
    };
  }

  async get(id: string): Promise<any> {
    const row = await this.prisma.candidate.findFirst({
      where: this.whereById(id),
      include: {
        requirement: {
          include: { client: true },
        },
        offer: true,
      },
    });
    if (!row) throw new NotFoundException('Candidate not found');
    const flags = await this.duplicateFlags(
      row.mobileNormalized,
      row.emailNormalized,
      row.id,
    );
    return { ...this.toCandidateResponse(row), ...flags };
  }

  async create(dto: CreateCandidateDto, actorId: string): Promise<any> {
    // Heal wrongly CLOSED requirements that still have open seats (JOINED < positions).
    await this.requirements.syncFillStatus(dto.requirementId, actorId);

    const req = await this.prisma.requirement.findFirst({
      where: { id: dto.requirementId, deletedAt: null },
    });
    if (!req) throw new NotFoundException('Requirement not found');
    if (req.status === 'CANCELLED' || req.status === 'CLOSED') {
      throw new BadRequestException(
        'Cannot add candidates to a Cancelled or Closed requirement',
      );
    }

    const mobileNormalized = normalizeMobile(dto.mobile);
    const emailNormalized = normalizeEmail(dto.email);
    const flags = await this.duplicateFlags(mobileNormalized, emailNormalized);
    const publicId = await this.ids.next('candidate', 'CAN');
    const statusFields = this.resolveStatusFields(dto, false);
    const stageCode = await this.assertStageCode(dto.stageCode);
    const interviewRound = await this.assertInterviewRound(dto.interviewRound);

    const row = await this.prisma.candidate.create({
      data: {
        publicId,
        requirementId: dto.requirementId,
        name: dto.name,
        mobile: dto.mobile,
        mobileNormalized,
        email: dto.email,
        emailNormalized,
        source: dto.source,
        position: dto.position,
        jobFamily: dto.jobFamily,
        stageCode,
        feedbackCode: statusFields.feedbackCode ?? dto.feedbackCode,
        selected: statusFields.selected ?? false,
        selectedAt: statusFields.selectedAt ?? null,
        profileSubmittedDate: dto.profileSubmittedDate
          ? new Date(dto.profileSubmittedDate)
          : undefined,
        clientShortlistDate:
          dto.clientShortlistDate === undefined
            ? undefined
            : dto.clientShortlistDate
              ? new Date(dto.clientShortlistDate)
              : null,
        interviewRound,
        remarks: dto.remarks,
      },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    await this.audit.log({
      entityType: 'Candidate',
      entityId: row.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: row,
    });

    if (row.selected) {
      await this.offers.ensureForSelectedCandidate(row.id, actorId);
    }

    const refreshed = await this.prisma.candidate.findFirst({
      where: { id: row.id },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    const mapped = {
      ...this.toCandidateResponse(refreshed ?? row),
      ...flags,
    };
    return this.wrapCandidate(mapped, 'Candidate created successfully');
  }

  async update(
    id: string,
    dto: UpdateCandidateDto,
    actorId: string,
  ): Promise<any> {
    const before = await this.prisma.candidate.findFirst({
      where: this.whereById(id),
      include: { offer: true },
    });
    if (!before) throw new NotFoundException('Candidate not found');

    const mobileNormalized = dto.mobile
      ? normalizeMobile(dto.mobile)
      : before.mobileNormalized;
    const emailNormalized = dto.email
      ? normalizeEmail(dto.email)
      : before.emailNormalized;

    const statusFields = this.resolveStatusFields(dto, Boolean(before.offer));
    const stageCode =
      dto.stageCode !== undefined
        ? await this.assertStageCode(dto.stageCode)
        : undefined;
    const interviewRound =
      dto.interviewRound !== undefined
        ? await this.assertInterviewRound(dto.interviewRound)
        : undefined;

    const row = await this.prisma.candidate.update({
      where: { id: before.id },
      data: {
        name: dto.name,
        mobile: dto.mobile,
        mobileNormalized: dto.mobile ? mobileNormalized : undefined,
        email: dto.email,
        emailNormalized: dto.email ? emailNormalized : undefined,
        source: dto.source,
        position: dto.position,
        jobFamily: dto.jobFamily,
        stageCode,
        feedbackCode:
          statusFields.feedbackCode !== undefined
            ? statusFields.feedbackCode
            : dto.feedbackCode,
        ...(statusFields.selected !== undefined
          ? {
              selected: statusFields.selected,
              selectedAt: statusFields.selectedAt,
            }
          : {}),
        profileSubmittedDate:
          dto.profileSubmittedDate === undefined
            ? undefined
            : dto.profileSubmittedDate
              ? new Date(dto.profileSubmittedDate)
              : null,
        clientShortlistDate:
          dto.clientShortlistDate === undefined
            ? undefined
            : dto.clientShortlistDate
              ? new Date(dto.clientShortlistDate)
              : null,
        interviewRound,
        remarks: dto.remarks,
      },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    const flags = await this.duplicateFlags(
      row.mobileNormalized,
      row.emailNormalized,
      row.id,
    );
    await this.audit.log({
      entityType: 'Candidate',
      entityId: before.id,
      action: 'UPDATE',
      actorUserId: actorId,
      before,
      after: row,
    });

    if (row.selected && !before.offer) {
      await this.offers.ensureForSelectedCandidate(row.id, actorId);
    }

    const refreshed = await this.prisma.candidate.findFirst({
      where: { id: row.id },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    const mapped = {
      ...this.toCandidateResponse(refreshed ?? row),
      ...flags,
    };
    return this.wrapCandidate(mapped, 'Candidate updated successfully');
  }

  async select(id: string, selected: boolean, actorId: string): Promise<any> {
    const before = await this.prisma.candidate.findFirst({
      where: this.whereById(id),
      include: { offer: true },
    });
    if (!before) throw new NotFoundException('Candidate not found');
    if (!selected && before.offer) {
      throw new BadRequestException(
        'Cannot unselect candidate with an existing offer',
      );
    }
    const row = await this.prisma.candidate.update({
      where: { id: before.id },
      data: {
        selected,
        selectedAt: selected ? new Date() : null,
      },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    await this.audit.log({
      entityType: 'Candidate',
      entityId: before.id,
      action: 'SELECT',
      actorUserId: actorId,
      before: { selected: before.selected },
      after: { selected: row.selected },
    });

    if (selected) {
      await this.offers.ensureForSelectedCandidate(row.id, actorId);
    }

    const refreshed = await this.prisma.candidate.findFirst({
      where: { id: row.id },
      include: {
        requirement: {
          select: { id: true, publicId: true, roleSkill: true },
        },
        offer: { select: { id: true, publicId: true, statusCode: true } },
      },
    });
    return this.toCandidateResponse(refreshed ?? row);
  }
}
