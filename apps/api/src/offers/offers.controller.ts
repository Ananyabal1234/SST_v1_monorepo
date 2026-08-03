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
import { OffersService } from './offers.service';
import {
  CreateOfferDto,
  OfferStatusDto,
  UpdateOfferDto,
} from './dto/offers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import {
  ApiMutateErrors,
  ApiProtectedErrors,
} from '../common/swagger/api-decorators';
import {
  CandidatesQueryDto,
  OffersQueryDto,
} from '../common/swagger/query.dto';

@ApiTags('Offers')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR, Role.HR_LEAD, Role.TA, Role.TA_LEAD)
@Controller('offers')
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Get()
  @ApiOperation({
    operationId: 'listOffers',
    summary: 'List offers with filters',
  })
  @ApiOkResponse({ description: 'Paginated offers' })
  @ApiProtectedErrors()
  list(@Query() query: OffersQueryDto) {
    return this.offers.list(query as Record<string, string>);
  }

  @Get('candidates')
  @ApiOperation({
    operationId: 'listOfferCandidates',
    summary: 'List candidates mapped for the HR offer-details table',
  })
  @ApiOkResponse({
    description:
      'Candidate ID, name, position, client, contact, source, stage, RAG, status, and detail identifiers',
  })
  @ApiProtectedErrors()
  listCandidates(@Query() query: CandidatesQueryDto) {
    return this.offers.listCandidates(query as Record<string, string>);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getOffer', summary: 'Offer detail' })
  @ApiParam({ name: 'id', description: 'UUID or publicId (OFF-00001)' })
  @ApiOkResponse({ description: 'Offer detail' })
  @ApiProtectedErrors()
  get(@Param('id') id: string) {
    return this.offers.get(id);
  }

  @Roles(Role.ADMIN, Role.HR, Role.HR_LEAD, Role.TA, Role.TA_LEAD)
  @Post()
  @ApiOperation({
    operationId: 'createOffer',
    summary: 'Create offer for selected candidate (HR/HR Lead/TA/TA Lead/Admin)',
  })
  @ApiCreatedResponse({ description: 'Created offer' })
  @ApiMutateErrors()
  create(@Body() dto: CreateOfferDto, @CurrentUser() user: AuthUser) {
    return this.offers.create(dto, user.id);
  }

  @Roles(Role.ADMIN, Role.HR, Role.HR_LEAD)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateOffer',
    summary: 'Update offer dates / CTC (HR/HR Lead/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (OFF-00001)' })
  @ApiOkResponse({ description: 'Updated offer' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.offers.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN, Role.HR, Role.HR_LEAD)
  @Post(':id/status')
  @ApiOperation({
    operationId: 'setOfferStatus',
    summary: 'Transition offer status (HR/HR Lead/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (OFF-00001)' })
  @ApiOkResponse({ description: 'Updated offer' })
  @ApiMutateErrors()
  status(
    @Param('id') id: string,
    @Body() dto: OfferStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.offers.setStatus(id, dto.statusCode, user.id);
  }
}
