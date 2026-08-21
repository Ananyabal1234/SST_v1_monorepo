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
  TA_LEAD_UPDATE_FIELDS,
  TA_UPDATE_FIELDS,
  UpdateRequirementDto,
} from './dto/requirements.dto';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import {
  derivePipelineStage,
  type PipelineStageCode,
} from '../common/pipeline-stage';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notifications/notifications.service';
import {
  requirementCreatedEmail,
  salesRequirementClosedEmail,
  taAssignmentEmail,
  taLeadAssignmentEmail,
} from '../mail/templates';
import {
  resumeMetaFromCandidate,
} from '../candidates/candidate-resume.util';

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

const requirementInclude = {
  client: true,
  jobFamily: true,
  salesOwner: { select: userSelect },
  taOwner: { select: userSelect },
  taAssignments: {
    include: { user: { select: userSelect } },
    orderBy: [{ isPrimary: 'desc' as const }, { assignedAt: 'asc' as const }],
  },
  taLeadAssignments: {
    include: { user: { select: userSelect } },
    orderBy: [{ assignedAt: 'asc' as const }],
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
    private readonly mail: MailService,
    private readonly notifications: NotificationService,
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
    const taLeads = this.mapTaLeads(req);
    const taLeadIds = taLeads.map((t) => t.id);
    const primary =
      taOwners.find((t) => t.id === req.taOwnerId) ?? taOwners[0] ?? null;
    const {
      taAssignments: _assignments,
      taLeadAssignments: _leadAssignments,
      ...rest
    } = req as RequirementRow & {
      taAssignments?: unknown;
      taLeadAssignments?: unknown;
    };
    return {
      ...rest,
      ...metrics,
      taOwners,
      taOwnerIds,
      taLeads,
      taLeadIds,
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

  private async attachPulse<T extends { id: string; updatedAt: Date }>(
    items: T[],
  ) {
    if (!items.length) return items;
    const ids = items.map((i) => i.id);
    const candidates = await this.prisma.candidate.findMany({
      where: { requirementId: { in: ids }, deletedAt: null },
      select: {
        requirementId: true,
        updatedAt: true,
        selected: true,
        stageCode: true,
        feedbackCode: true,
        interviewRound: true,
        offer: { select: { statusCode: true } },
        onboarding: { select: { statusCode: true } },
      },
    });
    const rank: Record<string, number> = {
      JOINED: 90,
      ONBOARDING: 80,
      OFFER: 70,
      SELECTED: 60,
      INTERVIEW: 50,
      CLIENT_SHORTLIST: 40,
      SUBMITTED_TO_SPOC: 30,
      HOLD: 20,
      REJECT: 10,
    };
    const byReq = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const list = byReq.get(c.requirementId) ?? [];
      list.push(c);
      byReq.set(c.requirementId, list);
    }
    return items.map((item) => {
      const list = byReq.get(item.id) ?? [];
      let furthest: string | null = null;
      let furthestRank = -1;
      let last = item.updatedAt;
      for (const c of list) {
        const { pipelineStage } = derivePipelineStage(c);
        const r = rank[pipelineStage] ?? 0;
        if (r > furthestRank) {
          furthestRank = r;
          furthest = pipelineStage;
        }
        if (c.updatedAt > last) last = c.updatedAt;
      }
      return {
        ...item,
        candidateCount: list.length,
        furthestPipelineStage: furthest,
        lastActivityAt: last,
      };
    });
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

  private mapTaLeads(req: {
    taLeadAssignments?: Array<{
      user: { id: string; fullName: string; email: string; role?: string };
    }>;
  }) {
    return (req.taLeadAssignments ?? []).map((a) => ({
      id: a.user.id,
      fullName: a.user.fullName,
      email: a.user.email,
      role: a.user.role,
    }));
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

  private normalizeTaLeadIds(input: {
    taLeadIds?: string[] | null;
  }): string[] | undefined {
    if (input.taLeadIds === undefined) return undefined;
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const id of input.taLeadIds ?? []) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  }

  private assertExclusiveAssignmentMode(
    taOwnerIds: string[],
    taLeadIds: string[],
  ) {
    if (taOwnerIds.length && taLeadIds.length) {
      throw new BadRequestException(
        'Choose either TA Lead(s) or TA Owner(s), not both',
      );
    }
  }

  private async syncTaAssignments(
    requirementId: string,
    taOwnerIds: string[],
    tx: TxClient,
  ): Promise<string | null> {
    for (const id of taOwnerIds) {
      await this.assertTaAssignee(id);
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

  private async syncTaLeadAssignments(
    requirementId: string,
    taLeadIds: string[],
    tx: TxClient,
  ): Promise<void> {
    for (const id of taLeadIds) {
      await this.assertTaLeadAssignee(id);
    }
    await tx.requirementTaLeadAssignment.deleteMany({ where: { requirementId } });
    if (taLeadIds.length) {
      await tx.requirementTaLeadAssignment.createMany({
        data: taLeadIds.map((userId) => ({
          requirementId,
          userId,
        })),
      });
    }
  }

  private async notifyAssignedTas(
    row: RequirementRow,
    taUserIds: string[],
  ): Promise<void> {
    if (!taUserIds.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: taUserIds }, deletedAt: null },
      select: { id: true, email: true, fullName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const id of taUserIds) {
      const ta = byId.get(id);
      if (!ta?.email) continue;
      const msg = taAssignmentEmail({
        taName: ta.fullName || ta.email,
        publicId: row.publicId,
        clientName: row.client?.name || '—',
        roleSkill: row.roleSkill,
        numberOfPositions: row.numberOfPositions,
        priorityCode: row.priorityCode,
        salesOwnerName: row.salesOwner?.fullName || row.salesOwner?.email || '—',
      });
      void this.mail.send({
        to: ta.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        scenario: 'ta-assignment',
      });
    }
    void this.notifications.createMany(
      taUserIds.map((userId) => ({
        userId,
        type: 'TA_ASSIGNED',
        title: `Assigned ${row.publicId}`,
        body: `${row.client?.name || '—'} · ${row.roleSkill}`,
        entityType: 'Requirement',
        entityId: row.id,
        linkTab: 'assign',
      })),
    );
  }

  private async notifyAssignedTaLeads(
    row: RequirementRow,
    leadUserIds: string[],
  ): Promise<void> {
    if (!leadUserIds.length) return;
    const users = await this.prisma.user.findMany({
      where: { id: { in: leadUserIds }, deletedAt: null },
      select: { id: true, email: true, fullName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    for (const id of leadUserIds) {
      const lead = byId.get(id);
      if (!lead?.email) continue;
      const msg = taLeadAssignmentEmail({
        leadName: lead.fullName || lead.email,
        publicId: row.publicId,
        clientName: row.client?.name || '—',
        roleSkill: row.roleSkill,
        numberOfPositions: row.numberOfPositions,
        priorityCode: row.priorityCode,
        salesOwnerName: row.salesOwner?.fullName || row.salesOwner?.email || '—',
      });
      void this.mail.send({
        to: lead.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        scenario: 'ta-lead-assignment',
      });
    }
    void this.notifications.createMany(
      leadUserIds.map((userId) => ({
        userId,
        type: 'TA_LEAD_ASSIGNED',
        title: `TA Lead on ${row.publicId}`,
        body: `${row.client?.name || '—'} · ${row.roleSkill}`,
        entityType: 'Requirement',
        entityId: row.id,
        linkTab: 'lead-assign',
      })),
    );
  }

  private async notifyRequirementCreated(
    row: RequirementRow,
    taOwnerIds: string[],
    taLeadIds: string[],
  ): Promise<void> {
    const salesOwnerName =
      row.salesOwner?.fullName || row.salesOwner?.email || '—';
    const base = {
      publicId: row.publicId,
      clientName: row.client?.name || '—',
      roleSkill: row.roleSkill,
      numberOfPositions: row.numberOfPositions,
      priorityCode: row.priorityCode,
      salesOwnerName,
    };

    if (row.salesOwner?.email) {
      const msg = requirementCreatedEmail({
        recipientName: row.salesOwner.fullName || row.salesOwner.email,
        roleLabel: 'Sales owner',
        ...base,
      });
      void this.mail.send({
        to: row.salesOwner.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        scenario: 'requirement-created-sales',
      });
    }

    if (taOwnerIds.length) {
      void this.notifyAssignedTas(row, taOwnerIds);
    }

    let leadIds = taLeadIds;
    if (!taOwnerIds.length && !taLeadIds.length) {
      const allLeads = await this.prisma.user.findMany({
        where: {
          role: Role.TA_LEAD,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      leadIds = allLeads.map((u) => u.id);
    }
    if (leadIds.length) {
      void this.notifyAssignedTaLeads(row, leadIds);
    }
  }

  private notifyRequirementClosed(row: {
    id?: string;
    publicId: string;
    roleSkill: string;
    numberOfPositions: number;
    client?: { name: string } | null;
    salesOwner?: { fullName: string; email: string } | null;
    taOwner?: { fullName: string; email: string } | null;
    taAssignments?: Array<{
      user?: { fullName: string; email: string } | null;
    }>;
  }): void {
    const recipients: Array<{ email: string; name: string }> = [];
    if (row.salesOwner?.email) {
      recipients.push({
        email: row.salesOwner.email,
        name: row.salesOwner.fullName || row.salesOwner.email,
      });
    }
    const tas = row.taAssignments?.length
      ? row.taAssignments.map((a) => a.user).filter(Boolean)
      : row.taOwner
        ? [row.taOwner]
        : [];
    for (const ta of tas) {
      if (!ta?.email) continue;
      if (recipients.some((r) => r.email === ta.email)) continue;
      recipients.push({
        email: ta.email,
        name: ta.fullName || ta.email,
      });
    }

    for (const recipient of recipients) {
      const msg = salesRequirementClosedEmail({
        recipientName: recipient.name,
        publicId: row.publicId,
        roleSkill: row.roleSkill,
        clientName: row.client?.name || '—',
        totalPositions: row.numberOfPositions,
      });
      void this.mail.send({
        to: recipient.email,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        scenario: 'requirement-closed',
      });
    }
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
    // TA Lead may view all requirements; assignment check applies only to TA.
    if (actor.role !== Role.TA) return;
    const ok = await this.isAssignedTa(requirementId, actor.id);
    if (!ok) {
      throw new ForbiddenException(
        'TA may only access requirements assigned to them',
      );
    }
  }

  /** Assignees may be TA Owner or TA Lead (Lead can self-assign and work). */
  private async assertTaAssignee(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new BadRequestException('Invalid taOwnerIds');
    if (
      user.role !== Role.TA &&
      user.role !== Role.TA_LEAD &&
      user.role !== Role.ADMIN
    ) {
      throw new BadRequestException(
        'taOwnerIds must reference an active TA or TA Lead user',
      );
    }
  }

  private async assertTaLeadAssignee(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new BadRequestException('Invalid taLeadIds');
    if (user.role !== Role.TA_LEAD && user.role !== Role.ADMIN) {
      throw new BadRequestException(
        'taLeadIds must reference an active TA Lead user',
      );
    }
  }

  private canAssignTaOwners(role: string): boolean {
    return (
      role === Role.ADMIN ||
      role === Role.TA_LEAD ||
      role === Role.SALES ||
      role === Role.SALES_LEAD
    );
  }

  private canAssignTaLeads(role: string): boolean {
    return (
      role === Role.ADMIN ||
      role === Role.SALES ||
      role === Role.SALES_LEAD
    );
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

  /** Sales owners may be Sales Owner or Sales Lead. */
  private async assertSalesOwner(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null, isActive: true },
    });
    if (!user) throw new BadRequestException('Invalid salesOwnerId');
    if (
      user.role !== Role.SALES &&
      user.role !== Role.SALES_LEAD &&
      user.role !== Role.ADMIN
    ) {
      throw new BadRequestException(
        'salesOwnerId must reference an active Sales or Sales Lead user',
      );
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

  private pickTaLeadUpdate(dto: UpdateRequirementDto): UpdateRequirementDto {
    const allowed = new Set<string>(TA_LEAD_UPDATE_FIELDS);
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
        `TA Lead may only update: ${TA_LEAD_UPDATE_FIELDS.join(', ')}`,
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
      // SALES_LEAD / TA_LEAD / ADMIN / HR / HR_LEAD: no owner filter (see all)
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
    const items = await this.attachPulse(
      rows.map((r) => this.withDerived(r, counts.get(r.id) ?? 0)),
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
    if (actor.role === Role.HR || actor.role === Role.HR_LEAD) {
      throw new ForbiddenException(
        'HR does not have access to the recruiting pipeline',
      );
    }
    await this.assertTaCanAccessRequirement(row.id, actor);

    const counts = await this.closedCounts([row.id]);
    const requirement = this.withDerived(row, counts.get(row.id) ?? 0);

    const candidates = await this.prisma.candidate.findMany({
      where: { requirementId: row.id, deletedAt: null },
      omit: { resumeData: true },
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
        ...resumeMetaFromCandidate(c),
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
    await this.assertSalesOwner(dto.salesOwnerId);

    const canAssign =
      actor.role === Role.ADMIN ||
      actor.role === Role.SALES ||
      actor.role === Role.SALES_LEAD;
    const taOwnerIds = canAssign ? this.normalizeTaOwnerIds(dto) ?? [] : [];
    const taLeadIds = canAssign ? this.normalizeTaLeadIds(dto) ?? [] : [];
    this.assertExclusiveAssignmentMode(taOwnerIds, taLeadIds);

    for (const id of taOwnerIds) {
      await this.assertTaAssignee(id);
    }
    for (const id of taLeadIds) {
      await this.assertTaLeadAssignee(id);
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
      if (taLeadIds.length) {
        await this.syncTaLeadAssignments(created.id, taLeadIds, tx);
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

    void this.notifyRequirementCreated(row, taOwnerIds, taLeadIds);

    return this.withDerived(row, 0);
  }

  private pickSalesUpdate(dto: UpdateRequirementDto): UpdateRequirementDto {
    const { salesOwnerId: _ignored, ...rest } = dto;
    return rest;
  }

  /** Full-body edit after creation (Sales/Sales Lead/Admin). Sales cannot reassign owner. */
  async replace(id: string, dto: CreateRequirementDto, actor: AuthUser): Promise<any> {
    const before = await this.findRequirementOrThrow(id);
    if (actor.role === Role.SALES && before.salesOwnerId !== actor.id) {
      throw new ForbiddenException(
        'Sales may only update requirements they own',
      );
    }

    const canReassignSales =
      actor.role === Role.ADMIN || actor.role === Role.SALES_LEAD;
    const canAssign =
      actor.role === Role.ADMIN ||
      actor.role === Role.SALES ||
      actor.role === Role.SALES_LEAD;

    const payload: UpdateRequirementDto = {
      requirementDate: dto.requirementDate,
      clientId: dto.clientId,
      roleSkill: dto.roleSkill,
      jobFamilyId: dto.jobFamilyId,
      numberOfPositions: dto.numberOfPositions,
      priorityCode: dto.priorityCode,
      ...(canAssign
        ? {
            taOwnerIds: this.normalizeTaOwnerIds(dto) ?? [],
            taLeadIds: this.normalizeTaLeadIds(dto) ?? [],
          }
        : {}),
      taHandoffDate: dto.taHandoffDate ?? null,
      targetClosureDate: dto.targetClosureDate ?? null,
      remarks: dto.remarks ?? null,
      experience: dto.experience ?? null,
      jobLocation: dto.jobLocation ?? null,
      minBudget: dto.minBudget ?? null,
      maxBudget: dto.maxBudget ?? null,
      durationMonths: dto.durationMonths ?? null,
      salesOwnerId: canReassignSales ? dto.salesOwnerId : before.salesOwnerId,
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
    } else if (actor.role === Role.SALES_LEAD) {
      // Sales Lead may edit any requirement and reassign sales owner + assignees.
      payload = dto;
    } else if (actor.role === Role.TA_LEAD) {
      payload = this.pickTaLeadUpdate(dto);
    } else if (actor.role === Role.TA) {
      await this.assertTaCanAccessRequirement(before.id, actor);
      payload = this.pickTaUpdate(dto);
    }

    if (payload.clientId) await this.assertActiveClient(payload.clientId);
    if (payload.jobFamilyId)
      await this.assertActiveJobFamily(payload.jobFamilyId);
    if (payload.priorityCode)
      await this.assertPriorityCode(payload.priorityCode);
    if (payload.salesOwnerId) await this.assertSalesOwner(payload.salesOwnerId);

    const nextTaOwnerIds = this.normalizeTaOwnerIds(payload);
    const nextTaLeadIds = this.normalizeTaLeadIds(payload);

    if (nextTaOwnerIds) {
      if (!this.canAssignTaOwners(actor.role)) {
        throw new ForbiddenException(
          'Only Admin, Sales, Sales Lead, or TA Lead may assign TA owners',
        );
      }
      for (const taId of nextTaOwnerIds) {
        await this.assertTaAssignee(taId);
      }
    }
    if (nextTaLeadIds) {
      if (!this.canAssignTaLeads(actor.role)) {
        throw new ForbiddenException(
          'Only Admin, Sales, or Sales Lead may assign TA Leads',
        );
      }
      for (const leadId of nextTaLeadIds) {
        await this.assertTaLeadAssignee(leadId);
      }
    }

    if (nextTaOwnerIds !== undefined && nextTaLeadIds !== undefined) {
      this.assertExclusiveAssignmentMode(nextTaOwnerIds, nextTaLeadIds);
    }

    // Sales/Admin mode switch: assigning owners clears leads (and vice versa).
    // TA Lead assigning owners must keep existing taLeadIds.
    const clearLeadsOnOwnerAssign =
      this.canAssignTaLeads(actor.role) &&
      nextTaOwnerIds !== undefined &&
      nextTaOwnerIds.length > 0 &&
      nextTaLeadIds === undefined;
    const clearOwnersOnLeadAssign =
      this.canAssignTaLeads(actor.role) &&
      nextTaLeadIds !== undefined &&
      nextTaLeadIds.length > 0 &&
      nextTaOwnerIds === undefined;

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

    const previousTaIds = new Set(
      (before.taAssignments || []).map((a) => a.userId),
    );
    const previousLeadIds = new Set(
      (before.taLeadAssignments || []).map((a) => a.userId),
    );

    const effectiveOwnerIds =
      nextTaOwnerIds !== undefined
        ? nextTaOwnerIds
        : clearOwnersOnLeadAssign
          ? []
          : undefined;
    const effectiveLeadIds =
      nextTaLeadIds !== undefined
        ? nextTaLeadIds
        : clearLeadsOnOwnerAssign
          ? []
          : undefined;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.requirement.update({
        where: { id: before.id },
        data,
      });
      if (effectiveOwnerIds !== undefined) {
        await this.syncTaAssignments(before.id, effectiveOwnerIds, tx);
      }
      if (effectiveLeadIds !== undefined) {
        await this.syncTaLeadAssignments(before.id, effectiveLeadIds, tx);
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

    if (effectiveOwnerIds !== undefined) {
      const newlyAdded = effectiveOwnerIds.filter((id) => !previousTaIds.has(id));
      if (newlyAdded.length) {
        void this.notifyAssignedTas(row, newlyAdded);
      }
    }
    if (effectiveLeadIds !== undefined) {
      const newlyAddedLeads = effectiveLeadIds.filter(
        (id) => !previousLeadIds.has(id),
      );
      if (newlyAddedLeads.length) {
        void this.notifyAssignedTaLeads(row, newlyAddedLeads);
      }
    }

    const counts = await this.closedCounts([row.id]);
    return this.withDerived(row, counts.get(row.id) ?? 0);
  }

  async assertActorCanMutateCandidates(
    requirementId: string,
    actor: AuthUser,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.TA || actor.role === Role.TA_LEAD) {
      const ok = await this.isAssignedTa(requirementId, actor.id);
      if (!ok) {
        throw new ForbiddenException(
          'Only Admin or assigned TA may mutate candidates on a requirement',
        );
      }
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

    if (status === 'CLOSED' && before.status !== 'CLOSED') {
      this.notifyRequirementClosed(row);
    }

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

    if (nextStatus === 'CLOSED') {
      const full = await client.requirement.findFirst({
        where: { id: requirementId },
        include: {
          client: { select: { name: true } },
          salesOwner: { select: { fullName: true, email: true } },
          taOwner: { select: { fullName: true, email: true } },
          taAssignments: {
            include: {
              user: { select: { fullName: true, email: true } },
            },
          },
        },
      });
      if (full) this.notifyRequirementClosed(full);
    }

    return updated;
  }

  async listNotes(id: string, _actor?: AuthUser): Promise<any> {
    const row = await this.findRequirementOrThrow(id);
    return this.prisma.requirementNote.findMany({
      where: { requirementId: row.id },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  }

  async addNote(id: string, body: string, actor: AuthUser): Promise<any> {
    const row = await this.findRequirementOrThrow(id);
    const trimmed = (body || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Note body is required');
    }
    const note = await this.prisma.requirementNote.create({
      data: {
        requirementId: row.id,
        authorUserId: actor.id,
        body: trimmed,
      },
      include: {
        author: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
    const payloads: Array<{ userId: string; linkTab: string }> = [];
    if (row.salesOwnerId && row.salesOwnerId !== actor.id) {
      payloads.push({ userId: row.salesOwnerId, linkTab: 'your' });
    }
    for (const a of row.taAssignments ?? []) {
      if (a.userId && a.userId !== actor.id) {
        payloads.push({ userId: a.userId, linkTab: 'assign' });
      }
    }
    for (const a of row.taLeadAssignments ?? []) {
      if (a.userId && a.userId !== actor.id) {
        payloads.push({ userId: a.userId, linkTab: 'lead-assign' });
      }
    }
    void this.notifications.createMany(
      payloads.map((p) => ({
        userId: p.userId,
        type: 'NOTE_ADDED',
        title: `Note on ${row.publicId}`,
        body: `${actor.fullName}: ${trimmed.slice(0, 140)}`,
        entityType: 'Requirement',
        entityId: row.id,
        linkTab: p.linkTab,
      })),
    );
    return note;
  }
}
