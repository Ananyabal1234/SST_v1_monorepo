import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ApiMutateErrors } from '../common/swagger/api-decorators';

class ImportBodyDto {
  @ApiProperty({ enum: ['requirements', 'candidates'] })
  @IsIn(['requirements', 'candidates'])
  entity!: 'requirements' | 'candidates';

  @ApiPropertyOptional({
    description: 'CSV text when not uploading a file',
  })
  @IsOptional()
  @IsString()
  csv?: string;
}

@ApiTags('Imports')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('imports')
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('validate')
  @ApiOperation({
    operationId: 'validateImport',
    summary: 'Validate CSV import without writing (Admin)',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entity'],
      properties: {
        entity: { type: 'string', enum: ['requirements', 'candidates'] },
        csv: { type: 'string', description: 'Raw CSV when not using file' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Validation report' })
  @ApiMutateErrors()
  @UseInterceptors(FileInterceptor('file'))
  validate(
    @Body() body: ImportBodyDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const csv = file ? file.buffer.toString('utf8') : body.csv ?? '';
    if (body.entity === 'candidates') {
      return this.imports.validateCandidates(csv);
    }
    return this.imports.validateRequirements(csv);
  }

  @Post('commit')
  @ApiOperation({
    operationId: 'commitImport',
    summary: 'Commit CSV import (Admin)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Optional idempotency key for safe retries',
  })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['entity'],
      properties: {
        entity: { type: 'string', enum: ['requirements', 'candidates'] },
        csv: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ description: 'Commit result' })
  @ApiMutateErrors()
  @UseInterceptors(FileInterceptor('file'))
  commit(
    @Body() body: ImportBodyDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    const csv = file ? file.buffer.toString('utf8') : body.csv ?? '';
    if (body.entity === 'candidates') {
      return this.imports.commitCandidates(csv, user.id);
    }
    return this.imports.commitRequirements(csv, user.id);
  }
}
