import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiProtectedErrors } from '../common/swagger/api-decorators';
import { AuditQueryDto } from '../common/swagger/query.dto';

@ApiTags('Audit')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({
    operationId: 'listAuditLogs',
    summary: 'Filtered audit log (Admin)',
  })
  @ApiOkResponse({ description: 'Paginated audit entries' })
  @ApiProtectedErrors()
  list(@Query() query: AuditQueryDto) {
    return this.audit.list({
      entityType: query.entityType,
      entityId: query.entityId,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }
}
