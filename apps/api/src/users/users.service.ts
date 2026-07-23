import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(page = 1, pageSize = 20, role?: Role): Promise<any> {
    const where = {
      deletedAt: null,
      ...(role ? { role } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Lightweight active-user picker for assignment dropdowns (e.g. Sales → TA). */
  async directory(role?: Role): Promise<any> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(role ? { role } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
      take: 200,
    });
  }

  /** Role dropdown options for Admin create-user UI (`role` field on POST /users). */
  listRoleOptions() {
    return {
      key: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: [
        {
          value: Role.SALES,
          label: 'Sales Owner',
          description:
            'Creates credentials used as salesOwnerId on requirements',
        },
        {
          value: Role.TA,
          label: 'TA Owner',
          description: 'Creates credentials used as taOwnerId on requirements',
        },
        {
          value: Role.HR,
          label: 'HR Owner',
          description: 'Creates credentials used as hrOwnerId on onboarding',
        },
        {
          value: Role.LEADERSHIP_READONLY,
          label: 'Leadership (read-only)',
          description: 'Dashboard / reporting access',
        },
        {
          value: Role.ADMIN,
          label: 'Admin',
          description: 'Full system administration',
        },
      ],
    };
  }

  async create(dto: CreateUserDto, actorId: string): Promise<any> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
    await this.audit.log({
      entityType: 'User',
      entityId: user.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: user,
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string): Promise<any> {
    const before = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) throw new NotFoundException('User not found');
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        role: dto.role,
        isActive: dto.isActive,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
    await this.audit.log({
      entityType: 'User',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actorId,
      before: {
        fullName: before.fullName,
        role: before.role,
        isActive: before.isActive,
      },
      after: user,
    });
    return user;
  }

  async resetPassword(id: string, password: string, actorId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    await this.audit.log({
      entityType: 'User',
      entityId: id,
      action: 'RESET_PASSWORD',
      actorUserId: actorId,
    });
    return { ok: true };
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    const before = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) throw new NotFoundException('User not found');
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      entityType: 'User',
      entityId: id,
      action: 'DELETE',
      actorUserId: actorId,
      before: {
        email: before.email,
        fullName: before.fullName,
        role: before.role,
      },
      after: user,
    });
    return { ok: true };
  }
}
