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

const requirementInclude = {
  client: true,
  jobFamily: true,
  salesOwner: {
    select: { id: true, fullName: true, email: true, role: true },
  },
  taOwner: {
    select: { id: true, fullName: true, email: true, role: true },
  },
} satisfies Prisma.RequirementInclude;

type RequirementRow = Prisma.RequirementGetPayload<{
  include: typeof requirementInclude;
}>;

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
    return { ...req, ...metrics };
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

  async list(query: Record<string, string | undefined>): Promise<any> {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 25) || 25));
    const where: Prisma.RequirementWhereInput = {
      deletedAt: null,
      ...(query.status
        ? { status: query.status as RequirementStatus }
        : {}),
      ...(query.taOwnerId ? { taOwnerId: query.taOwnerId } : {}),
      ...(query.salesOwnerId ? { salesOwnerId: query.salesOwnerId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.jobFamilyId ? { jobFamilyId: query.jobFamilyId } : {}),
      ...(query.priorityCode ? { priorityCode: query.priorityCode } : {}),
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

  async create(dto: CreateRequirementDto, actor: AuthUser): Promise<any> {
    await this.assertActiveClient(dto.clientId);
    await this.assertActiveJobFamily(dto.jobFamilyId);
    await this.assertPriorityCode(dto.priorityCode);
    await this.assertOwner(dto.salesOwnerId, Role.SALES, 'salesOwnerId');
    if (dto.taOwnerId) {
      await this.assertOwner(dto.taOwnerId, Role.TA, 'taOwnerId');
    }
    this.validateBudgets(dto.minBudget, dto.maxBudget);
    this.validateDates({
      requirementDate: dto.requirementDate,
      taHandoffDate: dto.taHandoffDate,
      targetClosureDate: dto.targetClosureDate,
    });

    const row = await this.prisma.$transaction(async (tx) => {
      const publicId = await this.ids.next('requirement', 'REQ', tx);
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
          taOwnerId: dto.taOwnerId || undefined,
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
      await this.audit.log(
        {
          entityType: 'Requirement',
          entityId: created.id,
          action: 'CREATE',
          actorUserId: actor.id,
          after: created,
        },
        tx,
      );
      return created;
    });

    return this.withDerived(row, 0);
  }

  private pickSalesUpdate(dto: UpdateRequirementDto): UpdateRequirementDto {
    const { salesOwnerId: _ignored, ...rest } = dto;
    return rest;
  }

  /** Full-body edit after creation (Sales/Admin). Sales cannot reassign owner. */
  async replace(id: string, dto: CreateRequirementDto, actor: AuthUser) : Promise<RequirementRow & Record<string, unknown>>{
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
      taOwnerId: dto.taOwnerId ?? null,
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

  async update(id: string, dto: UpdateRequirementDto, actor: AuthUser): Promise<RequirementRow & Record<string, unknown>>  {
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
      if (before.taOwnerId && before.taOwnerId !== actor.id) {
        throw new ForbiddenException(
          'TA may only update requirements assigned to them',
        );
      }
      payload = this.pickTaUpdate(dto);
    }

    if (payload.clientId) await this.assertActiveClient(payload.clientId);
    if (payload.jobFamilyId)
      await this.assertActiveJobFamily(payload.jobFamilyId);
    if (payload.priorityCode)
      await this.assertPriorityCode(payload.priorityCode);
    if (payload.salesOwnerId)
      await this.assertOwner(payload.salesOwnerId, Role.SALES, 'salesOwnerId');
    if (payload.taOwnerId)
      await this.assertOwner(payload.taOwnerId, Role.TA, 'taOwnerId');

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
    if (payload.taOwnerId !== undefined) {
      data.taOwner = payload.taOwnerId
        ? { connect: { id: payload.taOwnerId } }
        : { disconnect: true };
    }
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
      const updated = await tx.requirement.update({
        where: { id: before.id },
        data,
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
    if (
      joined >= req.numberOfPositions &&
      (req.status === 'ACTIVE' || req.status === 'ON_HOLD')
    ) {
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
