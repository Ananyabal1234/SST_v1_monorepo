import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdSequenceService } from '../id-sequence/id-sequence.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { CreateOfferDto, UpdateOfferDto } from './dto/offers.dto';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ids: IdSequenceService,
    @Inject(forwardRef(() => OnboardingService))
    private readonly onboardings: OnboardingService,
  ) {}

  private isPublicId(id: string) {
    return /^OFF-\d+$/i.test(id);
  }

  private whereById(id: string): Prisma.OfferWhereInput {
    return this.isPublicId(id)
      ? { publicId: id.toUpperCase(), deletedAt: null }
      : { id, deletedAt: null };
  }

  private async assertOfferStatus(statusCode: string) {
    const code = statusCode.trim().toUpperCase();
    const found = await this.prisma.lookupValue.findFirst({
      where: {
        code,
        isActive: true,
        lookupType: { code: 'OFFER_STATUS' },
      },
    });
    if (!found) {
      throw new BadRequestException(
        `Invalid offer statusCode '${statusCode}'. Use an active OFFER_STATUS lookup value (e.g. RELEASED, ACCEPTED, DECLINED, HOLD, BACKOUT).`,
      );
    }
    return code;
  }

  /**
   * Derive offer status from date fields used by RecuirementDashboard PATCH.
   */
  private deriveStatusFromDates(dates: {
    offerInitiatedDate: Date | null;
    offerReleasedDate: Date | null;
    expectedDoj: Date | null;
    currentStatus: string;
  }): string {
    if (dates.expectedDoj) return 'ACCEPTED';
    if (dates.offerReleasedDate) return 'RELEASED';
    if (dates.offerInitiatedDate) return 'INITIATED';
    return dates.currentStatus;
  }

  private mapOfferRow(record: {
    id: string;
    publicId: string;
    candidateId: string;
    requirementId: string;
    statusCode: string;
    selectedDate?: Date | null;
    offerInitiatedDate?: Date | null;
    offerReleasedDate?: Date | null;
    ctcRate?: string | null;
    expectedDoj?: Date | null;
    remarks?: string | null;
    candidate: {
      id: string;
      publicId: string;
      name: string;
      email: string;
      mobile: string;
      source: string | null;
      stageCode: string;
      selected?: boolean;
    };
    requirement: {
      id?: string;
      publicId?: string;
      roleSkill: string;
      client?: { name: string } | null;
    };
  }) {
    return {
      id: record.id,
      publicId: record.publicId,
      candidateId: record.candidateId,
      requirementId: record.requirementId,
      statusCode: record.statusCode,
      offerStatus: record.statusCode,
      selectedDate: record.selectedDate ?? null,
      offerInitiatedDate: record.offerInitiatedDate ?? null,
      offerReleasedDate: record.offerReleasedDate ?? null,
      ctcRate: record.ctcRate ?? null,
      expectedDoj: record.expectedDoj ?? null,
      remarks: record.remarks ?? null,
      candidate: {
        id: record.candidate.id,
        publicId: record.candidate.publicId,
        name: record.candidate.name,
        email: record.candidate.email,
        mobile: record.candidate.mobile,
        source: record.candidate.source,
        stageCode: record.candidate.stageCode,
        selected: record.candidate.selected,
      },
      requirement: {
        id: record.requirement.id ?? record.requirementId,
        publicId: record.requirement.publicId,
        roleSkill: record.requirement.roleSkill,
        client: record.requirement.client?.name ?? null,
      },
      candidatePublicId: record.candidate.publicId,
      candidateName: record.candidate.name,
      position: record.requirement.roleSkill,
      client: record.requirement.client?.name ?? null,
      email: record.candidate.email,
      mobile: record.candidate.mobile,
      source: record.candidate.source,
      stage: record.candidate.stageCode,
      requirementPublicId: record.requirement.publicId ?? null,
    };
  }

  private offerInclude = {
    candidate: {
      select: {
        id: true,
        publicId: true,
        name: true,
        email: true,
        mobile: true,
        source: true,
        stageCode: true,
        selected: true,
      },
    },
    requirement: {
      select: {
        id: true,
        publicId: true,
        roleSkill: true,
        client: {
          select: { name: true },
        },
      },
    },
  } as const;

  /**
   * Auto-create an INITIATED offer when a candidate is marked Selected
   * (RecuirementDashboard never calls POST /offers).
   */
  async ensureForSelectedCandidate(
    candidateId: string,
    actorId: string,
  ): Promise<any | null> {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: candidateId, deletedAt: null },
      include: { offer: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (!candidate.selected) {
      throw new BadRequestException('Candidate must be selected before offer');
    }
    if (candidate.offer) {
      return this.get(candidate.offer.id);
    }
    return this.create(
      {
        candidateId: candidate.id,
        statusCode: 'INITIATED',
      },
      actorId,
    );
  }

  async list(query: Record<string, string | undefined>) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const where: Prisma.OfferWhereInput = {
      deletedAt: null,
      ...(query.statusCode ? { statusCode: query.statusCode } : {}),
      ...(query.requirementId ? { requirementId: query.requirementId } : {}),
      ...(query.withoutOnboarding === 'true' ? { onboarding: null } : {}),
      ...(query.q
        ? {
            OR: [
              { publicId: { contains: query.q, mode: 'insensitive' } },
              {
                candidate: {
                  name: { contains: query.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.offer.findMany({
        where,
        include: this.offerInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.offer.count({ where }),
    ]);

    return {
      items: records.map((record) => this.mapOfferRow(record)),
      total,
      page,
      pageSize,
    };
  }

  async listCandidates(query: Record<string, string | undefined>) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query.pageSize ?? 20) || 20),
    );
    const where: Prisma.CandidateWhereInput = {
      deletedAt: null,
      ...(query.requirementId ? { requirementId: query.requirementId } : {}),
      ...(query.stageCode ? { stageCode: query.stageCode } : {}),
      ...(query.selected !== undefined
        ? { selected: query.selected === 'true' }
        : {}),
      ...(query.q
        ? {
            OR: [
              { publicId: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { mobile: { contains: query.q } },
              {
                requirement: {
                  roleSkill: { contains: query.q, mode: 'insensitive' },
                },
              },
              {
                requirement: {
                  client: {
                    name: { contains: query.q, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          mobile: true,
          source: true,
          stageCode: true,
          feedbackCode: true,
          selected: true,
          requirement: {
            select: {
              id: true,
              publicId: true,
              roleSkill: true,
              client: { select: { id: true, name: true } },
            },
          },
          offer: {
            select: { id: true, publicId: true, statusCode: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.candidate.count({ where }),
    ]);

    const items = records.map((candidate) => ({
      id: candidate.id,
      publicId: candidate.publicId,
      candidateId: candidate.id,
      candidatePublicId: candidate.publicId,
      name: candidate.name,
      position: candidate.requirement.roleSkill,
      client: candidate.requirement.client.name,
      email: candidate.email,
      mobile: candidate.mobile,
      source: candidate.source,
      stage: candidate.stageCode,
      stageCode: candidate.stageCode,
      rag: null,
      candidateStatus: candidate.selected
        ? 'Selected'
        : candidate.feedbackCode === 'NEGATIVE'
          ? 'Rejected'
          : 'Pending',
      details: {
        candidateUuid: candidate.id,
        requirementId: candidate.requirement.id,
        requirementPublicId: candidate.requirement.publicId,
        clientId: candidate.requirement.client.id,
        offerId: candidate.offer?.id ?? null,
        offerPublicId: candidate.offer?.publicId ?? null,
        offerStatus: candidate.offer?.statusCode ?? null,
      },
    }));

    return { items, total, page, pageSize };
  }

  async get(id: string): Promise<any> {
    const row = await this.prisma.offer.findFirst({
      where: this.whereById(id),
      include: this.offerInclude,
    });
    if (!row) throw new NotFoundException('Offer not found');
    return this.mapOfferRow(row);
  }

  async create(dto: CreateOfferDto, actorId: string) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: dto.candidateId, deletedAt: null },
      include: { offer: true },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (!candidate.selected) {
      throw new BadRequestException('Candidate must be selected before offer');
    }
    if (candidate.offer) {
      throw new ConflictException('Offer already exists for candidate');
    }
    const statusCode = await this.assertOfferStatus(dto.statusCode);
    const publicId = await this.ids.next('offer', 'OFF');
    const row = await this.prisma.offer.create({
      data: {
        publicId,
        candidateId: candidate.id,
        requirementId: candidate.requirementId,
        selectedDate: candidate.selectedAt ?? new Date(),
        offerInitiatedDate: dto.offerInitiatedDate
          ? new Date(dto.offerInitiatedDate)
          : undefined,
        offerReleasedDate: dto.offerReleasedDate
          ? new Date(dto.offerReleasedDate)
          : undefined,
        statusCode,
        ctcRate: dto.ctcRate,
        expectedDoj: dto.expectedDoj ? new Date(dto.expectedDoj) : undefined,
        remarks: dto.remarks,
      },
      include: this.offerInclude,
    });
    await this.audit.log({
      entityType: 'Offer',
      entityId: row.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: row,
    });
    return this.mapOfferRow(row);
  }

  async update(id: string, dto: UpdateOfferDto, actorId: string) {
    const before = await this.prisma.offer.findFirst({
      where: this.whereById(id),
      include: { onboarding: true },
    });
    if (!before) throw new NotFoundException('Offer not found');

    const offerInitiatedDate =
      dto.offerInitiatedDate === undefined
        ? before.offerInitiatedDate
        : dto.offerInitiatedDate
          ? new Date(dto.offerInitiatedDate)
          : null;
    const offerReleasedDate =
      dto.offerReleasedDate === undefined
        ? before.offerReleasedDate
        : dto.offerReleasedDate
          ? new Date(dto.offerReleasedDate)
          : null;
    const expectedDoj =
      dto.expectedDoj === undefined
        ? before.expectedDoj
        : dto.expectedDoj
          ? new Date(dto.expectedDoj)
          : null;

    // Explicit statusCode wins; date derivation only when status omitted.
    const nextStatus = await this.assertOfferStatus(
      dto.statusCode !== undefined &&
        dto.statusCode !== null &&
        String(dto.statusCode).trim() !== ''
        ? String(dto.statusCode)
        : this.deriveStatusFromDates({
            offerInitiatedDate,
            offerReleasedDate,
            expectedDoj,
            currentStatus: before.statusCode,
          }),
    );

    // Soft-cancel paths: validate before writing offer status.
    if (nextStatus !== before.statusCode && nextStatus !== 'ACCEPTED') {
      await this.onboardings.syncFromOfferStatus(before.id, nextStatus, actorId);
    }

    const row = await this.prisma.offer.update({
      where: { id: before.id },
      data: {
        offerInitiatedDate:
          dto.offerInitiatedDate === undefined
            ? undefined
            : offerInitiatedDate,
        offerReleasedDate:
          dto.offerReleasedDate === undefined
            ? undefined
            : offerReleasedDate,
        ctcRate: dto.ctcRate,
        expectedDoj:
          dto.expectedDoj === undefined ? undefined : expectedDoj,
        remarks: dto.remarks,
        statusCode: nextStatus,
      },
      include: this.offerInclude,
    });
    await this.audit.log({
      entityType: 'Offer',
      entityId: before.id,
      action: 'UPDATE',
      actorUserId: actorId,
      before,
      after: row,
    });

    if (nextStatus === 'ACCEPTED') {
      await this.onboardings.syncFromOfferStatus(before.id, nextStatus, actorId);
    }

    return this.mapOfferRow(
      (await this.prisma.offer.findFirst({
        where: { id: before.id },
        include: this.offerInclude,
      })) ?? row,
    );
  }

  /**
   * Apply an explicit offer status change and cascade to onboarding.
   * Used by Offers PATCH/status and Onboarding PATCH offerStatus.
   */
  async applyStatusChange(
    offerIdOrPublicId: string,
    statusCode: string,
    actorId: string,
  ) {
    return this.setStatus(offerIdOrPublicId, statusCode, actorId);
  }

  async setStatus(id: string, statusCode: string, actorId: string) {
    const before = await this.prisma.offer.findFirst({
      where: this.whereById(id),
      include: { onboarding: true },
    });
    if (!before) throw new NotFoundException('Offer not found');
    const nextStatus = await this.assertOfferStatus(statusCode);

    // Soft-cancel paths: validate JOINED guard before persisting offer status.
    if (nextStatus !== before.statusCode && nextStatus !== 'ACCEPTED') {
      await this.onboardings.syncFromOfferStatus(before.id, nextStatus, actorId);
    }

    const row = await this.prisma.offer.update({
      where: { id: before.id },
      data: { statusCode: nextStatus },
      include: this.offerInclude,
    });
    await this.audit.log({
      entityType: 'Offer',
      entityId: before.id,
      action: 'STATUS',
      actorUserId: actorId,
      before: { statusCode: before.statusCode },
      after: { statusCode: row.statusCode },
    });

    // ACCEPTED create/restore requires offer.statusCode === ACCEPTED first.
    if (nextStatus === 'ACCEPTED') {
      await this.onboardings.syncFromOfferStatus(before.id, nextStatus, actorId);
    }

    return this.mapOfferRow(
      (await this.prisma.offer.findFirst({
        where: { id: before.id },
        include: this.offerInclude,
      })) ?? row,
    );
  }
}
