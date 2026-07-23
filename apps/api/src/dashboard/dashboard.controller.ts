import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiProtectedErrors } from '../common/swagger/api-decorators';
import { DashboardQueryDto } from '../common/swagger/query.dto';
import { DashboardDto } from './dto/dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Post()
  @ApiOperation({
    operationId: 'getDashboard',
    summary: 'Complete dashboard data',
    description:
      'Single dashboard API. Send filter keys in the JSON body. Omit a key (or send {}) for all data. Keys: taOwnerId, salesOwnerId, clientId, jobFamilyId, priorityCode, from, to.',
  })
  @ApiBody({ type: DashboardQueryDto, required: false })
  @ApiOkResponse({ type: DashboardDto })
  @ApiProtectedErrors()
  getDashboard(@Body() body: DashboardQueryDto = {}) {
    return this.dashboard.getDashboard(body ?? {});
  }
}
