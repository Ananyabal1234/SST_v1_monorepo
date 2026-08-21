import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { CandidatesService } from './candidates.service';
import { ResumeParseService } from './resume-parse.service';
import {
  CreateCandidateDto,
  DuplicateLookupQueryDto,
  ImportCandidatesDto,
  SelectCandidateDto,
  TalentPoolQueryDto,
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
@Roles(Role.ADMIN, Role.TA, Role.TA_LEAD, Role.SALES, Role.SALES_LEAD, Role.HR, Role.HR_LEAD)
@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidates: CandidatesService,
    private readonly resumeParse: ResumeParseService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD, Role.SALES, Role.SALES_LEAD, Role.HR, Role.HR_LEAD)
  @ApiOperation({
    operationId: 'listCandidates',
    summary: 'List candidates with filters',
  })
  @ApiOkResponse({ description: 'Paginated candidates' })
  @ApiProtectedErrors()
  list(
    @Query() query: CandidatesQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.list(query as Record<string, string>, user);
  }

  @Get('duplicates')
  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @ApiOperation({
    operationId: 'lookupDuplicateCandidates',
    summary: 'Lookup prior candidate rows by email or mobile (TA/TA Lead/Admin)',
  })
  @ApiOkResponse({ description: 'Duplicate candidate history' })
  @ApiProtectedErrors()
  lookupDuplicates(@Query() query: DuplicateLookupQueryDto): Promise<any> {
    return this.candidates.findDuplicateCandidates(
      query.email,
      query.mobile,
      query.excludeId,
    );
  }

  @Get('talent-pool')
  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @ApiOperation({
    operationId: 'searchTalentPool',
    summary: 'Similar past candidates for a requirement (TA/TA Lead/Admin)',
  })
  @ApiOkResponse({ description: 'Ranked talent-pool matches' })
  @ApiProtectedErrors()
  talentPool(@Query() query: TalentPoolQueryDto): Promise<any> {
    return this.candidates.talentPool(query.requirementId, query.q);
  }

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Post('import')
  @ApiOperation({
    operationId: 'importCandidatesOntoRequirement',
    summary: 'Import CSV or rows onto a requirement (TA/TA Lead/Admin)',
  })
  @ApiOkResponse({ description: 'created / skipped / errors' })
  @ApiMutateErrors()
  importOntoRequirement(
    @Body() dto: ImportCandidatesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.importOntoRequirement(dto, user);
  }

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Post('parse-resume')
  @UseInterceptors(FileInterceptor('resume'))
  @ApiOperation({
    operationId: 'parseCandidateResume',
    summary: 'Parse resume and extract candidate fields (TA/TA Lead/Admin)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resume'],
      properties: {
        resume: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Parsed candidate fields' })
  @ApiMutateErrors()
  parseResume(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }
    return this.resumeParse.parseResume(file);
  }

  @Get(':id/resume')
  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD, Role.SALES, Role.SALES_LEAD, Role.HR, Role.HR_LEAD)
  @ApiOperation({
    operationId: 'downloadCandidateResume',
    summary: 'Download candidate resume',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiProduces('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @ApiOkResponse({ description: 'Resume file' })
  @ApiProtectedErrors()
  async downloadResume(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.candidates.getResume(id);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName.replace(/"/g, '')}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Post(':id/resume')
  @UseInterceptors(FileInterceptor('resume'))
  @ApiOperation({
    operationId: 'uploadCandidateResume',
    summary: 'Upload or replace candidate resume (TA/TA Lead/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiCreatedResponse({ description: 'Resume uploaded' })
  @ApiMutateErrors()
  uploadResume(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }
    return this.candidates.uploadResume(id, file, user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD, Role.SALES, Role.SALES_LEAD, Role.HR, Role.HR_LEAD)
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

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Post()
  @ApiOperation({
    operationId: 'createCandidate',
    summary: 'Create candidate (TA/TA Lead/Admin)',
  })
  @ApiCreatedResponse({ description: 'Created candidate' })
  @ApiMutateErrors()
  create(@Body() dto: CreateCandidateDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.candidates.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateCandidate',
    summary: 'Update candidate (TA/TA Lead/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiOkResponse({ description: 'Updated candidate' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.TA, Role.TA_LEAD)
  @Post(':id/select')
  @ApiOperation({
    operationId: 'selectCandidate',
    summary: 'Mark candidate selected / unselected (TA/TA Lead/Admin)',
  })
  @ApiParam({ name: 'id', description: 'UUID or publicId (CAN-00001)' })
  @ApiOkResponse({ description: 'Updated candidate' })
  @ApiMutateErrors()
  select(
    @Param('id') id: string,
    @Body() dto: SelectCandidateDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.candidates.select(id, dto.selected, user);
  }
}
