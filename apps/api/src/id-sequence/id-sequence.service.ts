import { Injectable } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { formatPublicId } from '@sst/shared-utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IdSequenceService {
  constructor(private readonly prisma: PrismaService) {}

  async next(
    name: string,
    prefix: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? this.prisma;
    const row = await client.idSequence.upsert({
      where: { name },
      create: { name, value: 1 },
      update: { value: { increment: 1 } },
    });
    return formatPublicId(prefix, row.value);
  }

  async nextNumber(
    name: string,
    startValue = 1000,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const row = await client.idSequence.upsert({
      where: { name },
      create: { name, value: startValue },
      update: { value: { increment: 1 } },
    });
    return row.value;
  }
}
