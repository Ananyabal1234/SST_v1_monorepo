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
import { OnboardingService } from './onboarding.service';
import {
  CreateOnboardingDto,
  OnboardingStatusDto,
  UpdateOnboardingDto,
} from './dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import {
  ApiMutateErrors,
  ApiProtectedErrors,
} from '../common/swagger/api-decorators';
import { OnboardingsQueryDto } from '../common/swagger/query.dto';

@ApiTags('Onboardings')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR)
@Controller('onboardings')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get()
  @ApiOperation({
    operationId: 'listOnboardings',
    summary: 'List onboardings with filters',
  })
  @ApiOkResponse({ description: 'Paginated onboardings' })
  @ApiProtectedErrors()
  list(@Query() query: OnboardingsQueryDto): Promise<any> {
    return this.onboarding.list(query as Record<string, string>);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getOnboarding',
    summary: 'Onboarding detail',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (ONB-00001)' })
  @ApiOkResponse({ description: 'Onboarding detail' })
  @ApiProtectedErrors()
  get(@Param('id') id: string): Promise<any> {
    return this.onboarding.get(id);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Post()
  @ApiOperation({
    operationId: 'createOnboarding',
    summary: 'Create onboarding from accepted offer (HR/Admin)',
  })
  @ApiCreatedResponse({ description: 'Created onboarding' })
  @ApiMutateErrors()
  create(@Body() dto: CreateOnboardingDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.onboarding.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateOnboarding',
    summary: 'Update onboarding (HR/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (ONB-00001)' })
  @ApiOkResponse({ description: 'Updated onboarding' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.onboarding.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Post(':id/status')
  @ApiOperation({
    operationId: 'setOnboardingStatus',
    summary: 'Transition onboarding status / Joined (HR/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (ONB-00001)' })
  @ApiOkResponse({ description: 'Updated onboarding' })
  @ApiMutateErrors()
  status(
    @Param('id') id: string,
    @Body() dto: OnboardingStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.onboarding.setStatus(
      id,
      dto.statusCode,
      user.id,
      dto.actualDoj,
    );
  }
}
