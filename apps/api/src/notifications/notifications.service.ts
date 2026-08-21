import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  linkTab?: string;
};

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(items: NotificationInput[]): Promise<void> {
    const rows = items.filter((i) => i.userId);
    if (!rows.length) return;
    await this.prisma.notification.createMany({
      data: rows.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        body: i.body ?? null,
        entityType: i.entityType ?? null,
        entityId: i.entityId ?? null,
        linkTab: i.linkTab ?? null,
      })),
    });
  }

  async listForUser(userId: string, limit = 40): Promise<{ items: any[]; unreadCount: number }> {
    const take = Math.min(80, Math.max(1, limit));
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [
          { readAt: { sort: 'asc', nulls: 'first' } },
          { createdAt: 'desc' },
        ],
        take,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<{ items: any[]; unreadCount: number }> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.listForUser(userId);
  }

  async markAllRead(userId: string): Promise<{ items: any[]; unreadCount: number }> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.listForUser(userId);
  }
}
