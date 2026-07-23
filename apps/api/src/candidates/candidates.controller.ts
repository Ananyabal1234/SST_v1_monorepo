import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { CandidatesService } from './candidates.service';
import {
  CreateCandidateDto,
  SelectCandidateDto,
  UpdateCandidateDto,
} from './dto/candidates.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import {
  ApiMutateErrors,
  ApiProtectedErrors,
} from '../common/swagger/api-decorators';
import { CandidatesQueryDto } from '../common/swagger/query.dto';

@ApiTags('Candidates')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TA, Role.SALES, Role.HR, Role.LEADERSHIP_READONLY)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TA, Role.SALES, Role.HR, Role.LEADERSHIP_READONLY)
  @ApiOperation({
    operationId: 'listCandidates',
    summary: 'List candidates with filters',
  })
  @ApiOkResponse({ description: 'Paginated candidates' })
  @ApiProtectedErrors()
  list(@Query() query: CandidatesQueryDto): Promise<any> {
    return this.candidates.list(query as Record<string, string>);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TA, Role.SALES, Role.HR, Role.LEADERSHIP_READONLY)
  @ApiOperation({
    operationId: 'getCandidate',
    summary: 'Candidate detail including duplicate flags',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiOkResponse({ description: 'Candidate detail' })
  @ApiProtectedErrors()
  get(@Param('id') id: string): Promise<any> {
    return this.candidates.get(id);
  }

  @Roles(Role.ADMIN, Role.TA)
  @Post()
  @ApiOperation({
    operationId: 'createCandidate',
    summary: 'Create candidate (TA/Admin)',
  })
  @ApiCreatedResponse({ description: 'Created candidate' })
  @ApiMutateErrors()
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.candidates.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.TA)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateCandidate',
    summary: 'Update candidate (TA/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiOkResponse({ description: 'Updated candidate' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.TA)
  @Post(':id/select')
  @ApiOperation({
    operationId: 'selectCandidate',
    summary: 'Mark candidate selected / unselected (TA/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiOkResponse({ description: 'Updated candidate' })
  @ApiMutateErrors()
  select(
    @Param('id') id: string,
    @Body() dto: SelectCandidateDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.select(id, dto.selected, user.id);
  }
}
