import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RequirementStatus, Role } from '../prisma/client';
import { deriveRequirementMetrics } from '@sst/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdSequenceService } from '../id-sequence/id-sequence.service';
import {
  CreateRequirementDto,
  TA_UPDATE_FIELDS,
  UpdateRequirementDto,
} from './dto/requirements.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  derivePipelineStage,
  type PipelineStageCode,
} from '../common/pipeline-stage';

const requirementInclude = {
  client: true,
  jobFamily: true,
  salesOwner: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  taOwner: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  taAssignments: {
    include: {
      user: {
        select: { id: true, fullName: true, email: true, role: true },
      },
    },
    orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }],
  },
} satisfies Prisma.RequirementInclude;

type RequirementRow = Prisma.RequirementGetPayload<{
  include: typeof requirementInclude;
}>;

type TxClient = Prisma.TransactionClient;

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ids: IdSequenceService,
  ) {}

  private isPublicId(id: string) {
    return /^REQ-\d+$/i.test(id);
  }

  private whereById(id: string): Prisma.RequirementWhereInput {
    return this.isPublicId(id)
      ? { publicId: id.toUpperCase(), deletedAt: null }
      : { id, deletedAt: null };
  }

  private async findRequirementOrThrow(id: string) {
    const row = await this.prisma.requirement.findFirst({
      where: this.whereById(id),
      include: requirementInclude,
    });
    if (!row) throw new NotFoundException('Requirement not found');
    return row;
  }

  private async closedCounts(requirementIds: string[]) {
    if (!requirementIds.length) return new Map<string, number>();
    const groups = await this.prisma.onboarding.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirementIds },
        statusCode: 'JOINED',
        deletedAt: null,
      },
      _count: { _all: true },
    });
    return new Map(groups.map((g) => [g.requirementId, g._count._all]));
  }

  private withDerived(req: RequirementRow, closedPositions: number) {
    const metrics = deriveRequirementMetrics({
      publicId: req.publicId,
      requirementDate: req.requirementDate,
      taHandoffDate: req.taHandoffDate,
      targetClosureDate: req.targetClosureDate,
      status: req.status,
      numberOfPositions: req.numberOfPositions,
      closedPositions,
    });
    const taOwners = this.mapTaOwners(req);
    const taOwnerIds = taOwners.map((t) => t.id);
    const primary =
      taOwners.find((t) => t.id === req.taOwnerId) ?? taOwners[0] ?? null;
    const { taAssignments: _assignments, ...rest } = req as RequirementRow & {
      taAssignments?: unknown;
    };
    return {
      ...rest,
      ...metrics,
      taOwners,
      taOwnerIds,
      taOwner: primary
        ? {
            id: primary.id,
            fullName: primary.fullName,
            email: primary.email,
            role: (req.taOwner as { role?: string } | null)?.role ?? Role.TA,
          }
        : null,
      taOwnerId: primary?.id ?? null,
    };
  }

  private mapTaOwners(req: {
    taAssignments?: Array<{
      isPrimary: boolean;
      user: { id: string; fullName: string; email: string };
    }>;
    taOwner?: { id: string; fullName: string; email: string } | null;
  }) {
    const fromAssignments = (req.taAssignments ?? []).map((a) => ({
      id: a.user.id,
      fullName: a.user.fullName,
      email: a.user.email,
      isPrimary: a.isPrimary,
    }));
    if (fromAssignments.length) {
      return fromAssignments.map(({ id, fullName, email }) => ({
        id,
        fullName,
        email,
      }));
    }
    if (req.taOwner) {
      return [
        {
          id: req.taOwner.id,
          fullName: req.taOwner.fullName,
          email: req.taOwner.email,
        },
      ];
    }
    return [];
  }

  /** Normalize create/update TA fields into a deduped id list (primary first). */
  private normalizeTaOwnerIds(input: {
    taOwnerIds?: string[] | null;
    taOwnerId?: string | null;
  }): string[] | undefined {
    if (input.taOwnerIds !== undefined) {
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const id of input.taOwnerIds ?? []) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        ids.push(id);
      }
      return ids;
    }
    if (input.taOwnerId !== undefined) {
      return input.taOwnerId ? [input.taOwnerId] : [];
    }
    return undefined;
  }

  private async syncTaAssignments(
    requirementId: string,
    taOwnerIds: string[],
    tx: TxClient,
  ): Promise<string | null> {
    for (const id of taOwnerIds) {
      await this.assertOwner(id, Role.TA, 'taOwnerIds');
    }
    await tx.requirementTaAssignment.deleteMany({ where: { requirementId } });
    if (taOwnerIds.length) {
      await tx.requirementTaAssignment.createMany({
        data: taOwnerIds.map((userId, index) => ({
          requirementId,
          userId,
          isPrimary: index === 0,
        })),
      });
    }
    const primaryId = taOwnerIds[0] ?? null;
    await tx.requirement.update({
      where: { id: requirementId },
      data: { taOwnerId: primaryId },
    });
    return primaryId;
  }

  private async isAssignedTa(
    requirementId: string,
    userId: string,
  ): Promise<boolean> {
    const row = await this.prisma.requirementTaAssignment.findUnique({
      where: {
        requirementId_userId: { requirementId, userId },
      },
    });
    if (row) return true;
    // Compat: legacy primary-only row before backfill catch-up
    const req = await this.prisma.requirement.findFirst({
      where: { id: requirementId, taOwnerId: userId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(req);
  }

  private async assertTaCanAccessRequirement(
    requirementId: string,
    actor: AuthUser,
  ) {
    if (actor.role !== Role.TA) return;
    const ok = await this.isAssignedTa(requirementId, actor.id);
    if (!ok) {
      throw new ForbiddenException(
        'TA may only access requirements assigned to them',
      );
    }
  }

  private async assertActiveClient(clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) throw new BadRequestException('Invalid clientId');
  }

  private async assertActiveJobFamily(jobFamilyId: string) {
    const family = await this.prisma.jobFamily.findFirst({
      where: { id: jobFamilyId, deletedAt: null },
    });
    if (!family) throw new BadRequestException('Invalid jobFamilyId');
  }

  private async assertPriorityCode(priorityCode: string) {
    const lookupType = await this.prisma.lookupType.findUnique({
      where: { code: 'PRIORITY' },
    });
    if (!lookupType) return;
    const value = await this.prisma.lookupValue.findFirst({
      where: {
        lookupTypeId: lookupType.id,
        code: priorityCode,
        isActive: true,
      },
    });
    if (!value) {
      throw new BadRequestException(`Invalid priorityCode: ${priorityCode}`);
    }
  }

  private async assertOwner(
    userId: string,
    expectedRole: Role,
    field: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new BadRequestException(`Invalid ${field}`);
    if (user.role !== expectedRole && user.role !== Role.ADMIN) {
      throw new BadRequestException(
        `${field} must reference an active ${expectedRole} user`,
      );
    }
  }

  private validateBudgets(
    minBudget?: number | null,
    maxBudget?: number | null,
  ) {
    if (
      minBudget != null &&
      maxBudget != null &&
      Number(minBudget) > Number(maxBudget)
    ) {
      throw new BadRequestException('minBudget must be <= maxBudget');
    }
  }

  private validateDates(opts: {
    requirementDate?: string | Date | null;
    taHandoffDate?: string | Date | null;
    targetClosureDate?: string | Date | null;
  }) {
    const reqDate = opts.requirementDate
      ? new Date(opts.requirementDate)
      : null;
    const handoff = opts.taHandoffDate ? new Date(opts.taHandoffDate) : null;
    const target = opts.targetClosureDate
      ? new Date(opts.targetClosureDate)
      : null;

    if (reqDate && handoff && handoff < reqDate) {
      throw new BadRequestException(
        'taHandoffDate cannot be before requirementDate',
      );
    }
    if (reqDate && target && target < reqDate) {
      throw new BadRequestException(
        'targetClosureDate cannot be before requirementDate',
      );
    }
  }

  private pickTaUpdate(dto: UpdateRequirementDto): UpdateRequirementDto {
    const allowed = new Set<string>(TA_UPDATE_FIELDS);
    const filtered: UpdateRequirementDto = {};
    for (const key of Object.keys(dto) as (keyof UpdateRequirementDto)[]) {
      if (allowed.has(key) && dto[key] !== undefined) {
        (filtered as Record<string, unknown>)[key] = dto[key];
      }
    }
    const forbidden = Object.keys(dto).filter(
      (k) =>
        (dto as Record<string, unknown>)[k] !== undefined && !allowed.has(k),
    );
    if (forbidden.length) {
      throw new ForbiddenException(
        `TA may only update: ${TA_UPDATE_FIELDS.join(', ')}`,
      );
    }
    return filtered;
  }

  private assertStatusTransition(
    from: RequirementStatus,
    to: RequirementStatus,
  ) {
    if (from === to) return;
    const allowed: Record<RequirementStatus, RequirementStatus[]> = {
      ACTIVE: ['ON_HOLD', 'CANCELLED', 'CLOSED'],
      ON_HOLD: ['ACTIVE', 'CANCELLED', 'CLOSED'],
      CANCELLED: [],
      CLOSED: ['ACTIVE'],
    };
    if (!allowed[from].includes(to)) {
      throw new BadRequestException(
        `Cannot transition requirement status from ${from} to ${to}`,
      );
    }
  }

  async list(
    query: Record<string, string | undefined>,
    actor?: AuthUser,
  ): Promise<any> {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 25) || 25));
    const where: Prisma.RequirementWhereInput = {
      deletedAt: null,
      ...(query.status
        ? { status: query.status as RequirementStatus }
        : {}),
      ...(query.taOwnerId
        ? { taAssignments: { some: { userId: query.taOwnerId } } }
        : {}),
      ...(query.salesOwnerId ? { salesOwnerId: query.salesOwnerId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.jobFamilyId ? { jobFamilyId: query.jobFamilyId } : {}),
      ...(query.priorityCode ? { priorityCode: query.priorityCode } : {}),
      ...(actor?.role === Role.TA
        ? { taAssignments: { some: { userId: actor.id } } }
        : {}),
      ...(actor?.role === Role.SALES
        ? { salesOwnerId: actor.id }
        : {}),
      ...(query.q
        ? {
            OR: [
              { roleSkill: { contains: query.q, mode: 'insensitive' } },
              { publicId: { contains: query.q, mode: 'insensitive' } },
              { client: { name: { contains: query.q, mode: 'insensitive' } } },
              {
                salesOwner: {
                  fullName: { contains: query.q, mode: 'insensitive' },
                },
              },
              {
                taOwner: {
                  fullName: { contains: query.q, mode: 'insensitive' },
                },
              },
              {
                taAssignments: {
                  some: {
                    user: {
                      fullName: { contains: query.q, mode: 'insensitive' },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            requirementDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    let orderBy: Prisma.RequirementOrderByWithRelationInput = {
      requirementDate: 'desc',
    };
    if (query.sort) {
      const [field, dir] = query.sort.split(':');
      const direction = dir === 'asc' ? 'asc' : 'desc';
      const sortable = new Set([
        'requirementDate',
        'createdAt',
        'updatedAt',
        'priorityCode',
        'status',
        'publicId',
        'numberOfPositions',
      ]);
      if (sortable.has(field)) {
        orderBy = { [field]: direction };
      }
    }

    const [rows, total] = await Promise.all([
      this.prisma.requirement.findMany({
        where,
        include: requirementInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.requirement.count({ where }),
    ]);

    const counts = await this.closedCounts(rows.map((r) => r.id));
    const items = rows.map((r) =>
      this.withDerived(r, counts.get(r.id) ?? 0),
    );
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async get(id: string): Promise<any> {
    const row = await this.findRequirementOrThrow(id);
    const counts = await this.closedCounts([row.id]);
    return this.withDerived(row, counts.get(row.id) ?? 0);
  }

  /** Candidate pipeline board payload for Sales (own) / assigned TA / Admin. */
  async getPipeline(id: string, actor: AuthUser): Promise<any> {
    const row = await this.findRequirementOrThrow(id);
    if (actor.role === Role.SALES && row.salesOwnerId !== actor.id) {
      throw new ForbiddenException(
        'You can only view the pipeline for your own requirements',
      );
    }
    if (actor.role === Role.HR) {
      throw new ForbiddenException(
        'HR does not have access to the recruiting pipeline',
      );
    }
    await this.assertTaCanAccessRequirement(row.id, actor);

    const counts = await this.closedCounts([row.id]);
    const requirement = this.withDerived(row, counts.get(row.id) ?? 0);

    const candidates = await this.prisma.candidate.findMany({
      where: { requirementId: row.id, deletedAt: null },
      include: {
        offer: { select: { id: true, publicId: true, statusCode: true } },
        onboarding: {
          select: {
            id: true,
            publicId: true,
            statusCode: true,
            bgvStatusCode: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const mapped = candidates.map((c) => {
      const pipeline = derivePipelineStage({
        selected: c.selected,
        stageCode: c.stageCode,
        feedbackCode: c.feedbackCode,
        interviewRound: c.interviewRound,
        offer: c.offer,
        onboarding: c.onboarding,
      });
      return {
        ...c,
        pipelineStage: pipeline.pipelineStage,
        pipelineLabel: pipeline.pipelineLabel,
        candidateStatus: c.selected
          ? 'Selected'
          : (c.feedbackCode ?? '').toUpperCase() === 'NEGATIVE'
            ? 'Rejected'
            : 'Pending',
      };
    });

    const countsByStage = mapped.reduce(
      (acc, c) => {
        const key = c.pipelineStage as PipelineStageCode;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      requirement,
      summary: {
        countsByStage,
        totalCandidates: mapped.length,
        openPositions: requirement.openPositions,
        closedPositions: requirement.closedPositions,
        numberOfPositions: requirement.numberOfPositions,
      },
      candidates: mapped,
    };
  }

  async create(dto: CreateRequirementDto, actor: AuthUser): Promise<any> {
    await this.assertActiveClient(dto.clientId);
    await this.assertActiveJobFamily(dto.jobFamilyId);
    await this.assertPriorityCode(dto.priorityCode);
    await this.assertOwner(dto.salesOwnerId, Role.SALES, 'salesOwnerId');
    const taOwnerIds = this.normalizeTaOwnerIds(dto) ?? [];
    for (const id of taOwnerIds) {
      await this.assertOwner(id, Role.TA, 'taOwnerIds');
    }
    this.validateBudgets(dto.minBudget, dto.maxBudget);
    this.validateDates({
      requirementDate: dto.requirementDate,
      taHandoffDate: dto.taHandoffDate,
      targetClosureDate: dto.targetClosureDate,
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const publicId = await this.ids.next('requirement', 'REQ', tx);
      const primaryTaId = taOwnerIds[0] ?? null;
      const created = await tx.requirement.create({
        data: {
          publicId,
          requirementDate: new Date(dto.requirementDate),
          clientId: dto.clientId,
          roleSkill: dto.roleSkill.trim(),
          jobFamilyId: dto.jobFamilyId,
          numberOfPositions: dto.numberOfPositions,
          salesOwnerId: dto.salesOwnerId,
          priorityCode: dto.priorityCode,
          taOwnerId: primaryTaId || undefined,
          taHandoffDate: dto.taHandoffDate
            ? new Date(dto.taHandoffDate)
            : undefined,
          targetClosureDate: dto.targetClosureDate
            ? new Date(dto.targetClosureDate)
            : undefined,
          remarks: dto.remarks?.trim() || undefined,
          experience: dto.experience?.trim() || undefined,
          jobLocation: dto.jobLocation?.trim() || undefined,
          minBudget: dto.minBudget ?? undefined,
          maxBudget: dto.maxBudget ?? undefined,
          durationMonths: dto.durationMonths ?? undefined,
        },
        include: requirementInclude,
      });
      if (taOwnerIds.length) {
        await this.syncTaAssignments(created.id, taOwnerIds, tx);
      }
      const refreshed = await tx.requirement.findFirst({
        where: { id: created.id },
        include: requirementInclude,
      });
      await this.audit.log(
        {
          entityType: 'Requirement',
          entityId: created.id,
          action: 'CREATE',
          actorUserId: actor.id,
          after: refreshed ?? created,
        },
        tx,
      );
      return refreshed ?? created;
    });

    return this.withDerived(row, 0);
  }

  private pickSalesUpdate(dto: UpdateRequirementDto): UpdateRequirementDto {
    const { salesOwnerId: _ignored, ...rest } = dto;
    return rest;
  }

  /** Full-body edit after creation (Sales/Admin). Sales cannot reassign owner. */
  async replace(id: string, dto: CreateRequirementDto, actor: AuthUser): Promise<any> {
    const before = await this.findRequirementOrThrow(id);
    if (actor.role === Role.SALES && before.salesOwnerId !== actor.id) {
      throw new ForbiddenException(
        'Sales may only update requirements they own',
      );
    }

    const payload: UpdateRequirementDto = {
      requirementDate: dto.requirementDate,
      clientId: dto.clientId,
      roleSkill: dto.roleSkill,
      jobFamilyId: dto.jobFamilyId,
      numberOfPositions: dto.numberOfPositions,
      priorityCode: dto.priorityCode,
      taOwnerIds: this.normalizeTaOwnerIds(dto) ?? [],
      taHandoffDate: dto.taHandoffDate ?? null,
      targetClosureDate: dto.targetClosureDate ?? null,
      remarks: dto.remarks ?? null,
      experience: dto.experience ?? null,
      jobLocation: dto.jobLocation ?? null,
      minBudget: dto.minBudget ?? null,
      maxBudget: dto.maxBudget ?? null,
      durationMonths: dto.durationMonths ?? null,
      salesOwnerId:
        actor.role === Role.ADMIN ? dto.salesOwnerId : before.salesOwnerId,
    };

    return this.update(id, payload, actor);
  }

  async update(id: string, dto: UpdateRequirementDto, actor: AuthUser): Promise<any> {
    const before = await this.findRequirementOrThrow(id);

    let payload = dto;
    if (actor.role === Role.SALES) {
      if (before.salesOwnerId !== actor.id) {
        throw new ForbiddenException(
          'Sales may only update requirements they own',
        );
      }
      payload = this.pickSalesUpdate(dto);
    } else if (actor.role === Role.TA) {
      await this.assertTaCanAccessRequirement(before.id, actor);
      payload = this.pickTaUpdate(dto);
    }

    if (payload.clientId) await this.assertActiveClient(payload.clientId);
    if (payload.jobFamilyId)
      await this.assertActiveJobFamily(payload.jobFamilyId);
    if (payload.priorityCode)
      await this.assertPriorityCode(payload.priorityCode);
    if (payload.salesOwnerId)
      await this.assertOwner(payload.salesOwnerId, Role.SALES, 'salesOwnerId');

    const nextTaOwnerIds = this.normalizeTaOwnerIds(payload);
    if (nextTaOwnerIds) {
      for (const taId of nextTaOwnerIds) {
        await this.assertOwner(taId, Role.TA, 'taOwnerIds');
      }
    }

    const minBudget =
      payload.minBudget !== undefined
        ? payload.minBudget
        : before.minBudget != null
          ? Number(before.minBudget)
          : null;
    const maxBudget =
      payload.maxBudget !== undefined
        ? payload.maxBudget
        : before.maxBudget != null
          ? Number(before.maxBudget)
          : null;
    this.validateBudgets(minBudget, maxBudget);
    this.validateDates({
      requirementDate: payload.requirementDate ?? before.requirementDate,
      taHandoffDate:
        payload.taHandoffDate !== undefined
          ? payload.taHandoffDate
          : before.taHandoffDate,
      targetClosureDate:
        payload.targetClosureDate !== undefined
          ? payload.targetClosureDate
          : before.targetClosureDate,
    });

    if (payload.numberOfPositions !== undefined) {
      const counts = await this.closedCounts([before.id]);
      const closed = counts.get(before.id) ?? 0;
      if (payload.numberOfPositions < closed) {
        throw new BadRequestException(
          `numberOfPositions cannot be less than closedPositions (${closed})`,
        );
      }
    }

    const data: Prisma.RequirementUpdateInput = {};
    if (payload.requirementDate !== undefined)
      data.requirementDate = new Date(payload.requirementDate);
    if (payload.roleSkill !== undefined)
      data.roleSkill = payload.roleSkill.trim();
    if (payload.clientId !== undefined)
      data.client = { connect: { id: payload.clientId } };
    if (payload.jobFamilyId !== undefined)
      data.jobFamily = { connect: { id: payload.jobFamilyId } };
    if (payload.numberOfPositions !== undefined)
      data.numberOfPositions = payload.numberOfPositions;
    if (payload.salesOwnerId !== undefined)
      data.salesOwner = { connect: { id: payload.salesOwnerId } };
    if (payload.priorityCode !== undefined)
      data.priorityCode = payload.priorityCode;
    if (payload.taHandoffDate !== undefined)
      data.taHandoffDate = payload.taHandoffDate
        ? new Date(payload.taHandoffDate)
        : null;
    if (payload.targetClosureDate !== undefined)
      data.targetClosureDate = payload.targetClosureDate
        ? new Date(payload.targetClosureDate)
        : null;
    if (payload.remarks !== undefined)
      data.remarks = payload.remarks?.trim() || null;
    if (payload.experience !== undefined)
      data.experience = payload.experience?.trim() || null;
    if (payload.jobLocation !== undefined)
      data.jobLocation = payload.jobLocation?.trim() || null;
    if (payload.minBudget !== undefined) data.minBudget = payload.minBudget;
    if (payload.maxBudget !== undefined) data.maxBudget = payload.maxBudget;
    if (payload.durationMonths !== undefined)
      data.durationMonths = payload.durationMonths;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.requirement.update({
        where: { id: before.id },
        data,
      });
      if (nextTaOwnerIds) {
        await this.syncTaAssignments(before.id, nextTaOwnerIds, tx);
      }
      const updated = await tx.requirement.findFirstOrThrow({
        where: { id: before.id },
        include: requirementInclude,
      });
      await this.audit.log(
        {
          entityType: 'Requirement',
          entityId: before.id,
          action: 'UPDATE',
          actorUserId: actor.id,
          before,
          after: updated,
        },
        tx,
      );
      return updated;
    });

    const counts = await this.closedCounts([row.id]);
    return this.withDerived(row, counts.get(row.id) ?? 0);
  }

  async assertActorCanMutateCandidates(
    requirementId: string,
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.TA) {
      await this.assertTaCanAccessRequirement(requirementId, actor);
      return;
    }
    throw new ForbiddenException(
      'Only Admin or assigned TA may mutate candidates on a requirement',
    );
  }

  async setStatus(id: string, status: RequirementStatus, actor: AuthUser): Promise<any> {
    const before = await this.findRequirementOrThrow(id);
    this.assertStatusTransition(before.status, status);

    if (status === 'CLOSED') {
      const counts = await this.closedCounts([before.id]);
      const closed = counts.get(before.id) ?? 0;
      const open = Math.max(0, before.numberOfPositions - closed);
      if (open > 0 && actor.role !== Role.ADMIN) {
        throw new BadRequestException(
          'Cannot close requirement while open positions remain (Admin override required)',
        );
      }
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.requirement.update({
        where: { id: before.id },
        data: { status },
        include: requirementInclude,
      });
      await this.audit.log(
        {
          entityType: 'Requirement',
          entityId: before.id,
          action: 'STATUS',
          actorUserId: actor.id,
          before: { status: before.status },
          after: { status: updated.status },
        },
        tx,
      );
      return updated;
    });

    const counts = await this.closedCounts([row.id]);
    return this.withDerived(row, counts.get(row.id) ?? 0);
  }

  /** Recount joined fills and auto-close / reopen ACTIVE↔CLOSED.
   * Auto-close only from ACTIVE (ON_HOLD stays held until resume).
   * CLOSED only when JOINED count covers all seats; reopen when seats remain.
   */
  async syncFillStatus(
    requirementId: string,
    actorId: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<any> {
    const client = tx ?? this.prisma;
    const req = await client.requirement.findFirst({
      where: { id: requirementId, deletedAt: null },
    });
    if (!req) return null;

    // Seat metrics use JOINED only (matches closedPositions on GET /requirements).
    const joined = await client.onboarding.count({
      where: {
        requirementId,
        statusCode: 'JOINED',
        deletedAt: null,
      },
    });

    let nextStatus: RequirementStatus | null = null;
    // Auto-close only from ACTIVE so Hold pauses recruiting without fill-sync closing.
    if (joined >= req.numberOfPositions && req.status === 'ACTIVE') {
      nextStatus = 'CLOSED';
    } else if (
      req.status === 'CLOSED' &&
      joined < req.numberOfPositions
    ) {
      nextStatus = 'ACTIVE';
    }

    if (!nextStatus || nextStatus === req.status) return req;

    const updated = await client.requirement.update({
      where: { id: requirementId },
      data: { status: nextStatus },
    });
    await this.audit.log(
      {
        entityType: 'Requirement',
        entityId: requirementId,
        action: 'STATUS',
        actorUserId: actorId,
        before: { status: req.status, reason: 'fill-sync' },
        after: { status: updated.status, closedPositions: joined },
      },
      tx,
    );
    return updated;
  }
}
