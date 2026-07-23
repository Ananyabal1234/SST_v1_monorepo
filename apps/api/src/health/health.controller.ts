import { Controller, Get, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { collectDefaultMetrics, register } from 'prom-client';
import { PrismaService } from '../prisma/prisma.service';
import {
  HealthResponseDto,
  ReadyResponseDto,
} from '../common/swagger/api-error.dto';

collectDefaultMetrics();

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({
    operationId: 'getHealth',
    summary: 'Liveness probe (public)',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  health() {
    return { status: 'ok', service: 'sst-api' };
  }

  @Get('ready')
  @ApiOperation({
    operationId: 'getReady',
    summary: 'Readiness probe — checks DB (public)',
  })
  @ApiOkResponse({ type: ReadyResponseDto })
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }

  @Get('metrics')
  @ApiOperation({
    operationId: 'getMetrics',
    summary: 'Prometheus metrics (internal)',
  })
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: 'Prometheus text exposition format' })
  async metrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
  }
}
