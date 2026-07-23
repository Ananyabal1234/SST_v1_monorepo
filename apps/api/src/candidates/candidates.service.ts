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
        stageCode: dto.stageCode,
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
        interviewRound: dto.interviewRound,
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
        stageCode: dto.stageCode,
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
        interviewRound: dto.interviewRound,
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
