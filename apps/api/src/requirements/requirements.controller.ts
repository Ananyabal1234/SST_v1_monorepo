import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { RequirementsService } from './requirements.service';
import {
  CreateRequirementDto,
  RequirementStatusDto,
  UpdateRequirementDto,
} from './dto/requirements.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import {
  ApiMutateErrors,
  ApiProtectedErrors,
} from '../common/swagger/api-decorators';
import { RequirementsQueryDto } from '../common/swagger/query.dto';

@ApiTags('Requirements')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SALES, Role.TA, Role.HR, Role.LEADERSHIP_READONLY)
@Controller('requirements')
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get()
  @ApiOperation({
    operationId: 'listRequirements',
    summary: 'List requirements with filters',
  })
  @ApiOkResponse({ description: 'Paginated requirements' })
  @ApiProtectedErrors()
  list(@Query() query: RequirementsQueryDto): Promise<any> {
    return this.requirements.list(query as Record<string, string>);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getRequirement',
    summary: 'Requirement detail with derived SLA / open / closed / closureStatus',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (REQ-00001)' })
  @ApiOkResponse({ description: 'Requirement detail' })
  @ApiProtectedErrors()
  get(@Param('id') id: string): Promise<any> {
    return this.requirements.get(id);
  }

  @Roles(Role.ADMIN, Role.SALES)
  @Post()
  @ApiOperation({
    operationId: 'createRequirement',
    summary: 'Create requirement (Sales/Admin)',
  })
  @ApiCreatedResponse({ description: 'Created requirement' })
  @ApiMutateErrors()
  create(@Body() dto: CreateRequirementDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.requirements.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.SALES)
  @Put(':id')
  @ApiOperation({
    operationId: 'replaceRequirement',
    summary: 'Replace requirement intake fields (Sales/Admin; full body)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (REQ-00001)' })
  @ApiOkResponse({ description: 'Updated requirement' })
  @ApiMutateErrors()
 replace(
  @Param('id') id: string,
  @Body() dto: CreateRequirementDto,
  @CurrentUser() user: AuthUser,
): Promise<any> {
  return this.requirements.replace(id, dto, user);
}

  @Roles(Role.ADMIN, Role.SALES, Role.TA)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateRequirement',
    summary: 'Partial update (TA limited fields; prefer PUT for Sales full edit)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (REQ-00001)' })
  @ApiOkResponse({ description: 'Updated requirement' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRequirementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.requirements.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.SALES)
  @Post(':id/status')
  @ApiOperation({
    operationId: 'setRequirementStatus',
    summary: 'Transition requirement status (Sales/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (REQ-00001)' })
  @ApiOkResponse({ description: 'Updated requirement' })
  @ApiMutateErrors()
  status(
    @Param('id') id: string,
    @Body() dto: RequirementStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.requirements.setStatus(id, dto.status, user);
  }
}
