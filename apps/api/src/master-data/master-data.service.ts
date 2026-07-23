import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateClientDto,
  CreateJobFamilyDto,
  CreateLookupValueDto,
  CreateMemberDto,
  UpdateClientDto,
  UpdateJobFamilyDto,
  UpdateLookupValueDto,
} from './dto/master-data.dto';

const MEMBER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

const CANDIDATE_STATUSES = ['Selected', 'Rejected', 'Pending'] as const;

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listLookups(typeCode: string): Promise<any> {
    return this.prisma.lookupValue.findMany({
      where: {
        isActive: true,
        lookupType: { code: typeCode.toUpperCase() },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  listCandidateStatus(): readonly string[] {
    return CANDIDATE_STATUSES;
  }

  async createLookup(
    typeCode: string,
    dto: CreateLookupValueDto,
    actorId: string,
  ) {
    const type = await this.prisma.lookupType.findUnique({
      where: { code: typeCode.toUpperCase() },
    });
    if (!type) throw new NotFoundException('Lookup type not found');
    const value = await this.prisma.lookupValue.create({
      data: {
        lookupTypeId: type.id,
        code: dto.code.toUpperCase(),
        label: dto.label,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.log({
      entityType: 'LookupValue',
      entityId: value.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: value,
    });
    return value;
  }

  async updateLookup(
    typeCode: string,
    id: string,
    dto: UpdateLookupValueDto,
    actorId: string,
  ) {
    const existing = await this.prisma.lookupValue.findFirst({
      where: { id, lookupType: { code: typeCode.toUpperCase() } },
    });
    if (!existing) throw new NotFoundException('Lookup value not found');
    const value = await this.prisma.lookupValue.update({
      where: { id },
      data: dto,
    });
    await this.audit.log({
      entityType: 'LookupValue',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actorId,
      before: existing,
      after: value,
    });
    return value;
  }

  listClients(): Promise<any> {
    return this.prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createClient(dto: CreateClientDto, actorId: string) {
    const nameNormalized = dto.name.trim().toLowerCase();
    const existing = await this.prisma.client.findFirst({
      where: { nameNormalized, deletedAt: null },
    });
    if (existing) throw new ConflictException('Client already exists');
    const client = await this.prisma.client.create({
      data: { name: dto.name.trim(), nameNormalized },
    });
    await this.audit.log({
      entityType: 'Client',
      entityId: client.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: client,
    });
    return client;
  }

  async updateClient(id: string, dto: UpdateClientDto, actorId: string) {
    const before = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Client not found');
    const client = await this.prisma.client.update({
      where: { id },
      data: dto.name
        ? {
            name: dto.name.trim(),
            nameNormalized: dto.name.trim().toLowerCase(),
          }
        : {},
    });
    await this.audit.log({
      entityType: 'Client',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actorId,
      before,
      after: client,
    });
    return client;
  }

  listJobFamilies(): Promise<any> {
    return this.prisma.jobFamily.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createJobFamily(dto: CreateJobFamilyDto, actorId: string) {
    const name = dto.name.trim();
    const existing = await this.prisma.jobFamily.findFirst({
      where: { name, deletedAt: null },
    });
    if (existing) throw new ConflictException('Job family already exists');
    const row = await this.prisma.jobFamily.create({ data: { name } });
    await this.audit.log({
      entityType: 'JobFamily',
      entityId: row.id,
      action: 'CREATE',
      actorUserId: actorId,
      after: row,
    });
    return row;
  }

  async updateJobFamily(id: string, dto: UpdateJobFamilyDto, actorId: string) {
    const before = await this.prisma.jobFamily.findFirst({
      where: { id, deletedAt: null },
    });
    if (!before) throw new NotFoundException('Job family not found');
    const row = await this.prisma.jobFamily.update({
      where: { id },
      data: dto.name ? { name: dto.name.trim() } : {},
    });
    await this.audit.log({
      entityType: 'JobFamily',
      entityId: id,
      action: 'UPDATE',
      actorUserId: actorId,
      before,
      after: row,
    });
    return row;
  }

  listMembers(role: Role): Promise<any> {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role,
      },
      select: MEMBER_SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async createMember(role: Role, dto: CreateMemberDto, actorId: string): Promise<any> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        role,
        passwordHash,
        isActive: true,
      },
      select: MEMBER_SELECT,
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
}
