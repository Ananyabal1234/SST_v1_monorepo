import { Injectable } from '@nestjs/common';
import { Role } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/decorators/current-user.decorator';
import { derivePipelineStage } from '../common/pipeline-stage';
import {
  computeTaHandoffSlaRag,
  daysBetween,
} from '@sst/shared-utils';

export type WorkItem = {
  id: string;
  kind: string;
  section: 'needs' | 'waiting' | 'dates';
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  tab: string;
  requirementId?: string;
};

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(user: AuthUser): Promise<{ items: WorkItem[] }> {
    const role = user.role as Role;
    const items: WorkItem[] = [];

    if (role === Role.SALES || role === Role.SALES_LEAD || role === Role.ADMIN) {
      items.push(...(await this.salesItems(user, role)));
    }
    if (role === Role.TA || role === Role.TA_LEAD || role === Role.ADMIN) {
      items.push(...(await this.taItems(user, role)));
    }
    if (role === Role.TA_LEAD || role === Role.ADMIN) {
      items.push(...(await this.taLeadItems()));
    }
    if (role === Role.HR || role === Role.HR_LEAD || role === Role.ADMIN) {
      items.push(...(await this.hrItems()));
    }

    const seen = new Set<string>();
    const unique = items.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    const rank = { high: 0, medium: 1, low: 2 };
    unique.sort((a, b) => rank[a.severity] - rank[b.severity]);
    return { items: unique };
  }

  private reqWhereForSales(user: AuthUser, role: Role) {
    return {
      deletedAt: null,
      status: 'ACTIVE' as const,
      ...(role === Role.SALES ? { salesOwnerId: user.id } : {}),
    };
  }

  private async salesItems(user: AuthUser, role: Role): Promise<WorkItem[]> {
    const reqs = await this.prisma.requirement.findMany({
      where: this.reqWhereForSales(user, role),
      include: {
        client: { select: { name: true } },
        taAssignments: { select: { id: true } },
        _count: { select: { candidates: true } },
      },
      take: 80,
      orderBy: { updatedAt: 'desc' },
    });
    const now = new Date();
    const items: WorkItem[] = [];
    for (const r of reqs) {
      const label = `${r.publicId} · ${r.client?.name || '—'} · ${r.roleSkill}`;
      const hasTa = r.taAssignments.length > 0 || Boolean(r.taOwnerId);
      if (!hasTa) {
        items.push({
          id: `no-ta-${r.id}`,
          kind: 'NO_TA',
          section: 'needs',
          severity: 'high',
          title: 'No TA assigned',
          subtitle: label,
          tab: 'your',
          requirementId: r.id,
        });
      }
      const rag = computeTaHandoffSlaRag({
        requirementDate: r.requirementDate,
        taHandoffDate: r.taHandoffDate,
        status: r.status,
        now,
      });
      if (rag === 'RED') {
        items.push({
          id: `rag-${r.id}`,
          kind: 'RAG_RED',
          section: 'needs',
          severity: 'high',
          title: 'Handoff SLA is Red',
          subtitle: label,
          tab: 'your',
          requirementId: r.id,
        });
      }
      if (r.targetClosureDate && daysBetween(r.targetClosureDate, now) > 0) {
        items.push({
          id: `overdue-${r.id}`,
          kind: 'OVERDUE',
          section: 'dates',
          severity: 'high',
          title: 'Target closure overdue',
          subtitle: label,
          tab: 'your',
          requirementId: r.id,
        });
      }
      if (hasTa && r._count.candidates === 0) {
        items.push({
          id: `wait-cand-${r.id}`,
          kind: 'WAITING_CANDIDATES',
          section: 'waiting',
          severity: 'medium',
          title: 'Waiting on TA sourcing',
          subtitle: label,
          tab: 'your',
          requirementId: r.id,
        });
      }
    }
    return items;
  }

  private async taItems(user: AuthUser, role: Role): Promise<WorkItem[]> {
    const where =
      role === Role.TA
        ? {
            deletedAt: null,
            status: 'ACTIVE' as const,
            taAssignments: { some: { userId: user.id } },
          }
        : { deletedAt: null, status: 'ACTIVE' as const };
    const reqs = await this.prisma.requirement.findMany({
      where,
      include: {
        client: { select: { name: true } },
        candidates: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            publicId: true,
            selected: true,
            loiStatus: true,
            stageCode: true,
            feedbackCode: true,
            interviewRound: true,
            offer: { select: { statusCode: true } },
            onboarding: { select: { statusCode: true } },
          },
        },
      },
      take: 80,
      orderBy: { updatedAt: 'desc' },
    });
    const now = new Date();
    const items: WorkItem[] = [];
    for (const r of reqs) {
      const label = `${r.publicId} · ${r.client?.name || '—'} · ${r.roleSkill}`;
      const tab = 'assign';
      if (r.candidates.length === 0) {
        items.push({
          id: `zero-cand-${r.id}`,
          kind: 'ZERO_CANDIDATES',
          section: 'needs',
          severity: 'high',
          title: 'No candidates yet',
          subtitle: label,
          tab,
          requirementId: r.id,
        });
      }
      if (r.targetClosureDate && daysBetween(r.targetClosureDate, now) > 0) {
        items.push({
          id: `ta-overdue-${r.id}`,
          kind: 'OVERDUE',
          section: 'dates',
          severity: 'high',
          title: 'Target closure overdue',
          subtitle: label,
          tab,
          requirementId: r.id,
        });
      }
      for (const c of r.candidates) {
        if (c.selected && c.loiStatus === 'NOT_RECEIVED') {
          items.push({
            id: `loi-${c.id}`,
            kind: 'LOI_PENDING',
            section: 'needs',
            severity: 'high',
            title: `LOI pending — ${c.name}`,
            subtitle: `${c.publicId} · ${label}`,
            tab,
            requirementId: r.id,
          });
        }
        const stage = derivePipelineStage(c);
        if (stage.pipelineStage === 'INTERVIEW') {
          items.push({
            id: `interview-${c.id}`,
            kind: 'INTERVIEW',
            section: 'waiting',
            severity: 'medium',
            title: `Interview — ${c.name}`,
            subtitle: `${c.interviewRound || 'L1'} · ${label}`,
            tab,
            requirementId: r.id,
          });
        }
      }
    }
    return items;
  }

  private async taLeadItems(): Promise<WorkItem[]> {
    const reqs = await this.prisma.requirement.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        taOwnerId: null,
        taAssignments: { none: {} },
      },
      include: { client: { select: { name: true } } },
      take: 40,
      orderBy: { requirementDate: 'desc' },
    });
    return reqs.map((r) => ({
      id: `lead-unassigned-${r.id}`,
      kind: 'UNASSIGNED_TA',
      section: 'needs' as const,
      severity: 'high' as const,
      title: 'Needs TA assignment',
      subtitle: `${r.publicId} · ${r.client?.name || '—'} · ${r.roleSkill}`,
      tab: 'lead-assign',
      requirementId: r.id,
    }));
  }

  private async hrItems(): Promise<WorkItem[]> {
    const now = new Date();
    const inSeven = new Date(now.getTime() + 7 * 86_400_000);
    const items: WorkItem[] = [];

    const selected = await this.prisma.candidate.findMany({
      where: {
        deletedAt: null,
        selected: true,
        offer: null,
        requirement: { deletedAt: null, status: 'ACTIVE' },
      },
      include: {
        requirement: {
          select: {
            id: true,
            publicId: true,
            roleSkill: true,
            client: { select: { name: true } },
          },
        },
      },
      take: 40,
    });
    for (const c of selected) {
      items.push({
        id: `hr-selected-${c.id}`,
        kind: 'READY_FOR_OFFER',
        section: 'needs',
        severity: 'high',
        title: `Selected — ${c.name}`,
        subtitle: `${c.publicId} · ${c.requirement?.publicId || ''} · ${c.requirement?.client?.name || '—'}`,
        tab: 'hr-offers',
        requirementId: c.requirement?.id,
      });
    }

    const dojSoon = await this.prisma.onboarding.findMany({
      where: {
        deletedAt: null,
        statusCode: { notIn: ['JOINED', 'COMPLETED', 'BACKOUT'] },
        expectedDoj: { gte: now, lte: inSeven },
      },
      include: {
        candidate: { select: { name: true, publicId: true } },
        requirement: {
          select: {
            id: true,
            publicId: true,
            client: { select: { name: true } },
          },
        },
      },
      take: 40,
    });
    for (const o of dojSoon) {
      items.push({
        id: `doj-${o.id}`,
        kind: 'DOJ_SOON',
        section: 'dates',
        severity: 'medium',
        title: `DOJ within 7 days — ${o.candidate?.name || '—'}`,
        subtitle: `${o.requirement?.publicId || ''} · ${o.requirement?.client?.name || '—'}`,
        tab: 'hr-onboarding',
        requirementId: o.requirement?.id,
      });
    }

    return items;
  }
}
