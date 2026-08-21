import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { WorkService, WorkItem } from './work.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ApiProtectedErrors } from '../common/swagger/api-decorators';

@ApiTags('Work')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.SALES,
  Role.SALES_LEAD,
  Role.TA,
  Role.TA_LEAD,
  Role.HR,
  Role.HR_LEAD,
)
@Controller('work')
export class WorkController {
  constructor(private readonly work: WorkService) {}

  @Get('mine')
  @ApiOperation({
    operationId: 'getMyWork',
    summary: 'Computed work queue for the current user',
  })
  @ApiOkResponse({ description: 'Work items grouped by the client' })
  @ApiProtectedErrors()
  mine(@CurrentUser() user: AuthUser): Promise<{ items: WorkItem[] }> {
    return this.work.getMine(user);
  }
}
