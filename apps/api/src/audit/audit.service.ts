import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    params: {
      entityType: string;
      entityId: string;
      action: string;
      actorUserId?: string | null;
      before?: unknown;
      after?: unknown;
    },
    tx?: TxClient,
  ) {
    const client = tx ?? this.prisma;
    return client.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorUserId: params.actorUserId ?? null,
        beforeJson:
          params.before === undefined
            ? undefined
            : (params.before as Prisma.InputJsonValue),
        afterJson:
          params.after === undefined
            ? undefined
            : (params.after as Prisma.InputJsonValue),
      },
    });
  }

  async list(query: {
    entityType?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: { select: { id: true, email: true, fullName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }
}
