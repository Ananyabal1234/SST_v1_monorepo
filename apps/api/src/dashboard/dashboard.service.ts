import { Injectable } from '@nestjs/common';
import {
  computeClosureStatus,
  computeTaHandoffSlaRag,
  daysBetween,
} from '@sst/shared-utils';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardQueryDto } from '../common/swagger/query.dto';

const percentage = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 10_000) / 10_000 : 0;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(query: DashboardQueryDto): Promise<Record<string, unknown>> {
    const [summary, breakdowns, escalations, positionsByClient, lists] =
      await Promise.all([
        this.summary(query),
        this.breakdowns(query),
        this.escalations(query),
        this.positionsByClient(query),
        this.lists(query),
      ]);

    return {
      summary,
      kpis: summary,
      breakdowns,
      escalations,
      requirementRagSummary: breakdowns.byRag,
      openPositionsOnClient: positionsByClient.openPositionsOnClient,
      closedPositionsOnClient: positionsByClient.closedPositionsOnClient,
      lists,
    };
  }

  private requirementWhere(
    query: DashboardQueryDto,
  ): Prisma.RequirementWhereInput {
    return {
      deletedAt: null,
      ...(query.taOwnerId ? { taOwnerId: query.taOwnerId } : {}),
      ...(query.salesOwnerId ? { salesOwnerId: query.salesOwnerId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.jobFamilyId ? { jobFamilyId: query.jobFamilyId } : {}),
      ...(query.priorityCode ? { priorityCode: query.priorityCode } : {}),
      ...(query.from || query.to
        ? {
            requirementDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
  }

  async summary(query: DashboardQueryDto) {
    const requirements = await this.prisma.requirement.findMany({
      where: this.requirementWhere(query),
      select: {
        id: true,
        numberOfPositions: true,
        taHandoffDate: true,
        status: true,
        targetClosureDate: true,
        requirementDate: true,
      },
    });
    const reqIds = requirements.map((r) => r.id);

    const totalPositions = requirements
      .filter((r) => r.status !== 'CANCELLED')
      .reduce((s, r) => s + r.numberOfPositions, 0);
    const pendingSalesHandoff = requirements.filter(
      (r) => !r.taHandoffDate && r.status === 'ACTIVE',
    ).length;

    if (!reqIds.length) {
      return {
        totalRequirements: 0,
        totalPositions: 0,
        openPositions: 0,
        closedPositions: 0,
        pendingSalesHandoff: 0,
        candidatesInPipeline: 0,
        selectedCandidates: 0,
        duplicateMobiles: 0,
        offersReleased: 0,
        offersAccepted: 0,
        offersRejected: 0,
        candidatesJoined: 0,
        fillRate: 0,
        averageDaysToFill: null,
        requirementsAtRisk: 0,
        cancelledRequirements: 0,
        wastedSourcing: 0,
        overdueRequirements: 0,
      };
    }

    const [
      candidatesInPipeline,
      selectedCandidates,
      offersReleased,
      offersAccepted,
      offersRejected,
      duplicateMobileGroups,
      joinedOnboardings,
      sourcedRequirementGroups,
    ] = await Promise.all([
      this.prisma.candidate.count({
        where: {
          deletedAt: null,
          selected: false,
          requirementId: { in: reqIds },
        },
      }),
      this.prisma.candidate.count({
        where: {
          deletedAt: null,
          selected: true,
          requirementId: { in: reqIds },
          NOT: {
            OR: [
              { onboarding: { statusCode: 'JOINED', deletedAt: null } },
              {
                offer: {
                  deletedAt: null,
                  statusCode: { in: ['RELEASED', 'ACCEPTED'] },
                },
              },
            ],
          },
        },
      }),
      this.prisma.offer.count({
        where: {
          deletedAt: null,
          statusCode: 'RELEASED',
          requirementId: { in: reqIds },
        },
      }),
      this.prisma.offer.count({
        where: {
          deletedAt: null,
          statusCode: 'ACCEPTED',
          requirementId: { in: reqIds },
          NOT: {
            onboarding: { statusCode: 'JOINED', deletedAt: null },
          },
        },
      }),
      this.prisma.offer.count({
        where: {
          deletedAt: null,
          statusCode: 'DECLINED',
          requirementId: { in: reqIds },
        },
      }),
      this.prisma.candidate.groupBy({
        by: ['mobileNormalized'],
        where: {
          deletedAt: null,
          requirementId: { in: reqIds },
        },
        _count: { _all: true },
      }),
      this.prisma.onboarding.findMany({
        where: {
          deletedAt: null,
          statusCode: 'JOINED',
          requirementId: { in: reqIds },
        },
        select: { requirementId: true, actualDoj: true },
      }),
      this.prisma.candidate.groupBy({
        by: ['requirementId'],
        where: { deletedAt: null, requirementId: { in: reqIds } },
        _count: { _all: true },
      }),
    ]);

    const candidatesJoined = joinedOnboardings.length;
    const closedPositions = candidatesJoined;
    const openPositions = Math.max(0, totalPositions - closedPositions);
    const fillRate =
      totalPositions > 0 ? closedPositions / totalPositions : 0;
    const requirementById = new Map(requirements.map((r) => [r.id, r]));
    const fillDurations = joinedOnboardings
      .map((onboarding) => {
        const requirement = requirementById.get(onboarding.requirementId);
        return requirement && onboarding.actualDoj
          ? daysBetween(requirement.requirementDate, onboarding.actualDoj)
          : -1;
      })
      .filter((days) => days >= 0);
    const averageDaysToFill = fillDurations.length
      ? Math.round(
          (fillDurations.reduce((sum, days) => sum + days, 0) /
            fillDurations.length) *
            10,
        ) / 10
      : null;
    const sourcedRequirementIds = new Set(
      sourcedRequirementGroups.map((group) => group.requirementId),
    );
    const joinedByRequirement = new Map<string, number>();
    for (const onboarding of joinedOnboardings) {
      joinedByRequirement.set(
        onboarding.requirementId,
        (joinedByRequirement.get(onboarding.requirementId) ?? 0) + 1,
      );
    }

    let requirementsAtRisk = 0;
    let overdueRequirements = 0;
    for (const requirement of requirements) {
      const rag = computeTaHandoffSlaRag({
        requirementDate: requirement.requirementDate,
        taHandoffDate: requirement.taHandoffDate,
        targetClosureDate: requirement.targetClosureDate,
        status: requirement.status,
      });
      if (rag === 'RED') requirementsAtRisk += 1;

      const closure = computeClosureStatus({
        status: requirement.status,
        openPositions: Math.max(
          0,
          requirement.numberOfPositions -
            (joinedByRequirement.get(requirement.id) ?? 0),
        ),
        targetClosureDate: requirement.targetClosureDate,
      });
      if (closure === 'OVERDUE') overdueRequirements += 1;
    }
    const cancelled = requirements.filter(
      (requirement) => requirement.status === 'CANCELLED',
    );

    return {
      totalRequirements: requirements.length,
      totalPositions,
      openPositions,
      closedPositions,
      pendingSalesHandoff,
      candidatesInPipeline,
      selectedCandidates,
      duplicateMobiles: duplicateMobileGroups.filter(
        (group) => group._count._all > 1,
      ).length,
      offersReleased,
      offersAccepted,
      offersRejected,
      candidatesJoined,
      fillRate: Math.round(fillRate * 10000) / 10000,
      averageDaysToFill,
      requirementsAtRisk,
      cancelledRequirements: cancelled.length,
      wastedSourcing: cancelled.filter(
        (requirement) =>
          requirement.taHandoffDate != null ||
          sourcedRequirementIds.has(requirement.id),
      ).length,
      overdueRequirements,
    };
  }

  async lists(query: DashboardQueryDto): Promise<Record<string, unknown>> {
    const candidateSelect = {
      id: true,
      publicId: true,
      name: true,
      email: true,
      mobile: true,
      mobileNormalized: true,
      stageCode: true,
      selected: true,
      requirementId: true,
      requirement: {
        select: {
          id: true,
          publicId: true,
          roleSkill: true,
          client: { select: { id: true, name: true } },
        },
      },
    } as const;

    const offerSelect = {
      id: true,
      publicId: true,
      statusCode: true,
      ctcRate: true,
      expectedDoj: true,
      offerReleasedDate: true,
      candidateId: true,
      requirementId: true,
      candidate: {
        select: { id: true, publicId: true, name: true, email: true },
      },
      requirement: {
        select: {
          id: true,
          publicId: true,
          roleSkill: true,
          client: { select: { id: true, name: true } },
        },
      },
    } as const;

    const requirementSelect = {
      id: true,
      publicId: true,
      roleSkill: true,
      status: true,
      priorityCode: true,
      numberOfPositions: true,
      requirementDate: true,
      taHandoffDate: true,
      targetClosureDate: true,
      client: { select: { id: true, name: true } },
      taOwner: { select: { id: true, fullName: true, email: true } },
      salesOwner: { select: { id: true, fullName: true, email: true } },
      jobFamily: { select: { id: true, name: true } },
    } as const;

    const [
      taOwners,
      salesOwners,
      clients,
      jobFamilies,
      priorities,
      requirements,
      candidatesInPipeline,
      selectedCandidates,
      offersReleased,
      offersAccepted,
      offersRejected,
      candidatesJoined,
      allCandidatesForDupes,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'TA', deletedAt: null, isActive: true },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: 'SALES', deletedAt: null, isActive: true },
        select: { id: true, fullName: true, email: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.client.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.jobFamily.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.lookupValue.findMany({
        where: { lookupType: { code: 'PRIORITY' }, isActive: true },
        select: { code: true, label: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.requirement.findMany({
        where: this.requirementWhere(query),
        select: requirementSelect,
        orderBy: { requirementDate: 'desc' },
      }),
      this.prisma.candidate.findMany({
        where: {
          deletedAt: null,
          selected: false,
          requirement: this.requirementWhere(query),
        },
        select: candidateSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.candidate.findMany({
        where: {
          deletedAt: null,
          selected: true,
          requirement: this.requirementWhere(query),
          NOT: {
            OR: [
              { onboarding: { statusCode: 'JOINED', deletedAt: null } },
              {
                offer: {
                  deletedAt: null,
                  statusCode: { in: ['RELEASED', 'ACCEPTED'] },
                },
              },
            ],
          },
        },
        select: candidateSelect,
        orderBy: { selectedAt: 'desc' },
      }),
      this.prisma.offer.findMany({
        where: {
          deletedAt: null,
          statusCode: 'RELEASED',
          requirement: this.requirementWhere(query),
        },
        select: offerSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.offer.findMany({
        where: {
          deletedAt: null,
          statusCode: 'ACCEPTED',
          requirement: this.requirementWhere(query),
          NOT: {
            onboarding: { statusCode: 'JOINED', deletedAt: null },
          },
        },
        select: offerSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.offer.findMany({
        where: {
          deletedAt: null,
          statusCode: 'DECLINED',
          requirement: this.requirementWhere(query),
        },
        select: offerSelect,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.onboarding.findMany({
        where: {
          deletedAt: null,
          statusCode: 'JOINED',
          requirement: this.requirementWhere(query),
        },
        select: {
          id: true,
          publicId: true,
          statusCode: true,
          actualDoj: true,
          expectedDoj: true,
          candidate: {
            select: { id: true, publicId: true, name: true, email: true },
          },
          requirement: {
            select: {
              id: true,
              publicId: true,
              roleSkill: true,
              client: { select: { id: true, name: true } },
            },
          },
          offer: { select: { id: true, publicId: true, statusCode: true } },
        },
        orderBy: { actualDoj: 'desc' },
      }),
      this.prisma.candidate.findMany({
        where: {
          deletedAt: null,
          requirement: this.requirementWhere(query),
        },
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          mobile: true,
          mobileNormalized: true,
          requirementId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const reqIds = requirements.map((r) => r.id);
    const mobileCounts = new Map<string, number>();
    for (const c of allCandidatesForDupes) {
      if (!c.mobileNormalized) continue;
      mobileCounts.set(
        c.mobileNormalized,
        (mobileCounts.get(c.mobileNormalized) ?? 0) + 1,
      );
    }
    const duplicateMobileKeys = [...mobileCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([mobile]) => mobile);

    const joinedGroups = reqIds.length
      ? await this.prisma.onboarding.groupBy({
          by: ['requirementId'],
          where: {
            requirementId: { in: reqIds },
            statusCode: 'JOINED',
            deletedAt: null,
          },
          _count: { _all: true },
        })
      : [];
    const closedMap = new Map(
      joinedGroups.map((g) => [g.requirementId, g._count._all]),
    );

    const pendingSalesHandoff = requirements.filter(
      (r) => !r.taHandoffDate && r.status === 'ACTIVE',
    );
    const cancelledRequirements = requirements.filter(
      (r) => r.status === 'CANCELLED',
    );
    const sourcedRequirementIds = new Set(
      allCandidatesForDupes.map((c) => c.requirementId),
    );
    const wastedSourcing = cancelledRequirements.filter(
      (r) => r.taHandoffDate != null || sourcedRequirementIds.has(r.id),
    );
    const requirementsAtRisk = requirements.filter((r) => {
      const rag = computeTaHandoffSlaRag({
        requirementDate: r.requirementDate,
        taHandoffDate: r.taHandoffDate,
        targetClosureDate: r.targetClosureDate,
        status: r.status,
      });
      return rag === 'RED';
    });
    const overdueRequirements = requirements.filter((r) => {
      const closed = closedMap.get(r.id) ?? 0;
      const open = Math.max(0, r.numberOfPositions - closed);
      return (
        computeClosureStatus({
          status: r.status,
          openPositions: open,
          targetClosureDate: r.targetClosureDate,
        }) === 'OVERDUE'
      );
    });

    const duplicateMobiles = duplicateMobileKeys.map((mobileNormalized) => {
      const members = allCandidatesForDupes.filter(
        (c) => c.mobileNormalized === mobileNormalized,
      );
      return {
        mobileNormalized,
        count: members.length,
        candidates: members,
      };
    });

    const joinedByRequirement = new Map<string, typeof candidatesJoined>();
    for (const joined of candidatesJoined) {
      const requirementId = joined.requirement?.id;
      if (!requirementId) continue;
      const bucket = joinedByRequirement.get(requirementId) ?? [];
      bucket.push(joined);
      joinedByRequirement.set(requirementId, bucket);
    }

    const activeRequirements = requirements.filter(
      (r) => r.status !== 'CANCELLED',
    );
    const totalPositions: Array<Record<string, unknown>> = [];
    const openPositions: Array<Record<string, unknown>> = [];
    const fillRate: Array<Record<string, unknown>> = [];

    for (const requirement of activeRequirements) {
      const closedCount = closedMap.get(requirement.id) ?? 0;
      const closedForReq = Math.min(closedCount, requirement.numberOfPositions);
      const openForReq = Math.max(
        0,
        requirement.numberOfPositions - closedForReq,
      );
      const queue = [...(joinedByRequirement.get(requirement.id) ?? [])];

      fillRate.push({
        id: requirement.id,
        publicId: requirement.publicId,
        roleSkill: requirement.roleSkill,
        status: requirement.status,
        client: requirement.client,
        numberOfPositions: requirement.numberOfPositions,
        closedPositions: closedForReq,
        openPositions: openForReq,
        fillRate:
          requirement.numberOfPositions > 0
            ? Math.round(
                (closedForReq / requirement.numberOfPositions) * 10_000,
              ) / 10_000
            : 0,
      });

      for (
        let positionIndex = 1;
        positionIndex <= requirement.numberOfPositions;
        positionIndex += 1
      ) {
        const isClosed = positionIndex <= closedForReq;
        const joined = isClosed ? (queue.shift() ?? null) : null;
        const row = {
          id: `${requirement.id}:${positionIndex}`,
          requirementId: requirement.id,
          publicId: requirement.publicId,
          roleSkill: requirement.roleSkill,
          status: isClosed ? 'CLOSED' : 'OPEN',
          positionIndex,
          numberOfPositions: requirement.numberOfPositions,
          client: requirement.client,
          taOwner: requirement.taOwner,
          salesOwner: requirement.salesOwner,
          joined: joined
            ? {
                id: joined.id,
                publicId: joined.publicId,
                actualDoj: joined.actualDoj,
                candidate: joined.candidate,
              }
            : null,
        };
        totalPositions.push(row);
        if (!isClosed) openPositions.push(row);
      }
    }

    const closedPositions = candidatesJoined.map((joined) => {
      const requirement = requirements.find(
        (r) => r.id === joined.requirement?.id,
      );
      const daysToFill =
        requirement && joined.actualDoj
          ? daysBetween(requirement.requirementDate, joined.actualDoj)
          : null;
      return {
        ...joined,
        daysToFill: daysToFill != null && daysToFill >= 0 ? daysToFill : null,
        requirementDate: requirement?.requirementDate ?? null,
        client: joined.requirement?.client ?? null,
        roleSkill: joined.requirement?.roleSkill ?? null,
      };
    });

    const averageDaysToFill = closedPositions.filter(
      (row) => row.daysToFill != null,
    );

    return {
      filters: {
        taOwners,
        salesOwners,
        clients,
        jobFamilies,
        priorities,
      },
      requirements,
      totalPositions,
      openPositions,
      closedPositions,
      fillRate,
      averageDaysToFill,
      pendingSalesHandoff,
      candidatesInPipeline,
      selectedCandidates,
      offersReleased,
      offersAccepted,
      offersRejected,
      candidatesJoined,
      cancelledRequirements,
      requirementsAtRisk,
      overdueRequirements,
      wastedSourcing,
      duplicateMobiles,
    };
  }

  async breakdowns(query: DashboardQueryDto) {
    const requirements = await this.prisma.requirement.findMany({
      where: this.requirementWhere(query),
    });
    const reqIds = requirements.map((r) => r.id);

    const [stageGroups, stageLookups, joinedGroups] = await Promise.all([
      reqIds.length
        ? this.prisma.candidate.groupBy({
            by: ['stageCode'],
            where: { deletedAt: null, requirementId: { in: reqIds } },
            _count: { _all: true },
          })
        : [],
      this.prisma.lookupValue.findMany({
        where: {
          lookupType: { code: 'CANDIDATE_STAGE' },
          isActive: true,
        },
        select: { code: true, label: true },
        orderBy: { sortOrder: 'asc' },
      }),
      reqIds.length
        ? this.prisma.onboarding.groupBy({
            by: ['requirementId'],
            where: {
              requirementId: { in: reqIds },
              statusCode: 'JOINED',
              deletedAt: null,
            },
            _count: { _all: true },
          })
        : [],
    ]);

    const ragCounts = { GREEN: 0, AMBER: 0, RED: 0, NONE: 0 };
    const closureCounts = {
      ON_TRACK: 0,
      OVERDUE: 0,
      FILLED: 0,
      CANCELLED: 0,
      ON_HOLD: 0,
    };

    const closedMap = new Map(
      joinedGroups.map((g) => [g.requirementId, g._count._all]),
    );

    for (const r of requirements) {
      const rag = computeTaHandoffSlaRag({
        requirementDate: r.requirementDate,
        taHandoffDate: r.taHandoffDate,
        targetClosureDate: r.targetClosureDate,
        status: r.status,
      });
      ragCounts[rag] += 1;

      const closed = closedMap.get(r.id) ?? 0;
      const open = Math.max(0, r.numberOfPositions - closed);
      const closure = computeClosureStatus({
        status: r.status,
        openPositions: open,
        targetClosureDate: r.targetClosureDate,
      });
      closureCounts[closure] += 1;
    }

    const stageCountMap = new Map(
      stageGroups.map((group) => [group.stageCode, group._count._all]),
    );
    const stageTotal = stageGroups.reduce(
      (total, group) => total + group._count._all,
      0,
    );
    const knownStageCodes = new Set(stageLookups.map((stage) => stage.code));
    const byStage = [
      ...stageLookups.map((stage) => {
        const count = stageCountMap.get(stage.code) ?? 0;
        return {
          stageCode: stage.code,
          label: stage.label,
          count,
          percentage: percentage(count, stageTotal),
        };
      }),
      ...stageGroups
        .filter((group) => !knownStageCodes.has(group.stageCode))
        .map((group) => ({
          stageCode: group.stageCode,
          label: group.stageCode,
          count: group._count._all,
          percentage: percentage(group._count._all, stageTotal),
        })),
    ];

    return {
      byStage,
      byRag: Object.entries(ragCounts).map(([rag, count]) => ({
        rag,
        count,
        percentage: percentage(count, requirements.length),
      })),
      byClosureStatus: Object.entries(closureCounts).map(
        ([closureStatus, count]) => ({
          closureStatus,
          count,
          percentage: percentage(count, requirements.length),
        }),
      ),
    };
  }

  async positionsByClient(query: DashboardQueryDto) {
    const requirements = await this.prisma.requirement.findMany({
      where: this.requirementWhere(query),
      select: {
        id: true,
        clientId: true,
        numberOfPositions: true,
        status: true,
        client: { select: { id: true, name: true } },
      },
    });

    if (!requirements.length) {
      return { openPositionsOnClient: [], closedPositionsOnClient: [] };
    }

    const joinedGroups = await this.prisma.onboarding.groupBy({
      by: ['requirementId'],
      where: {
        requirementId: { in: requirements.map((r) => r.id) },
        statusCode: 'JOINED',
        deletedAt: null,
      },
      _count: { _all: true },
    });
    const closedMap = new Map(
      joinedGroups.map((g) => [g.requirementId, g._count._all]),
    );

    type ClientAgg = {
      clientId: string;
      client: string;
      openPositions: number;
      closedPositions: number;
    };
    const byClient = new Map<string, ClientAgg>();

    for (const requirement of requirements) {
      const closed = closedMap.get(requirement.id) ?? 0;
      const open =
        requirement.status === 'CANCELLED'
          ? 0
          : Math.max(0, requirement.numberOfPositions - closed);

      const existing = byClient.get(requirement.clientId) ?? {
        clientId: requirement.client.id,
        client: requirement.client.name,
        openPositions: 0,
        closedPositions: 0,
      };
      existing.openPositions += open;
      existing.closedPositions += closed;
      byClient.set(requirement.clientId, existing);
    }

    const clients = [...byClient.values()].sort((a, b) =>
      a.client.localeCompare(b.client),
    );

    return {
      openPositionsOnClient: clients
        .filter((c) => c.openPositions > 0)
        .map(({ clientId, client, openPositions }) => ({
          clientId,
          client,
          openPositions,
        })),
      closedPositionsOnClient: clients
        .filter((c) => c.closedPositions > 0)
        .map(({ clientId, client, closedPositions }) => ({
          clientId,
          client,
          closedPositions,
        })),
    };
  }

  async escalations(query: DashboardQueryDto) {
    const requirements = await this.prisma.requirement.findMany({
      where: this.requirementWhere(query),
      include: {
        client: true,
        candidates: {
          where: { deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { requirementDate: 'asc' },
    });

    const joinedGroups = requirements.length
      ? await this.prisma.onboarding.groupBy({
          by: ['requirementId'],
          where: {
            requirementId: { in: requirements.map((r) => r.id) },
            statusCode: 'JOINED',
            deletedAt: null,
          },
          _count: { _all: true },
        })
      : [];
    const closedMap = new Map(
      joinedGroups.map((g) => [g.requirementId, g._count._all]),
    );

    const atRisk: typeof requirements = [];
    const overdue: typeof requirements = [];
    const closureOverdue: typeof requirements = [];
    for (const r of requirements) {
      const rag = computeTaHandoffSlaRag({
        requirementDate: r.requirementDate,
        taHandoffDate: r.taHandoffDate,
        targetClosureDate: r.targetClosureDate,
        status: r.status,
      });
      if (rag === 'AMBER') atRisk.push(r);
      if (rag === 'RED') overdue.push(r);

      const closed = closedMap.get(r.id) ?? 0;
      const open = Math.max(0, r.numberOfPositions - closed);
      const closure = computeClosureStatus({
        status: r.status,
        openPositions: open,
        targetClosureDate: r.targetClosureDate,
      });
      if (closure === 'OVERDUE') closureOverdue.push(r);
    }

    const cancelled = requirements.filter((r) => r.status === 'CANCELLED');
    const wasted = cancelled.filter(
      (r) => r.taHandoffDate != null || r.candidates.length > 0,
    );
    const toItem = (r: (typeof requirements)[number]) => ({
      id: r.id,
      publicId: r.publicId,
      roleSkill: r.roleSkill,
      client: r.client.name,
      requirementDate: r.requirementDate,
      targetClosureDate: r.targetClosureDate,
      openPositions: Math.max(
        0,
        r.numberOfPositions - (closedMap.get(r.id) ?? 0),
      ),
    });

    return {
      atRisk: atRisk.map(toItem),
      overdue: overdue.map(toItem),
      closureOverdue: closureOverdue.map(toItem),
      cancelled: cancelled.map(toItem),
      wasted: wasted.map(toItem),
    };
  }
}
