import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequirementStatus } from '../../prisma/client';

export class CreateRequirementDto {
  @ApiProperty({ example: '2026-07-07' })
  @IsDateString()
  requirementDate!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  clientId!: string;

  @ApiProperty({ example: 'Core Python Developer' })
  @IsString()
  @MinLength(1)
  roleSkill!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jobFamilyId!: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  numberOfPositions!: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  salesOwnerId!: string;

  @ApiProperty({ example: 'HIGH' })
  @IsString()
  @MinLength(1)
  priorityCode!: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'One or more TA user IDs assigned to this requirement (shared pool)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  taOwnerIds?: string[];

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Legacy single TA; normalized into taOwnerIds when taOwnerIds omitted',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  taOwnerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  taHandoffDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  targetClosureDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  experience?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  jobLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBudget?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudget?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMonths?: number | null;
}

export class UpdateRequirementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requirementDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  roleSkill?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jobFamilyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  numberOfPositions?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesOwnerId?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Replace full TA assignment set (shared pool)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  taOwnerIds?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsUUID()
  taOwnerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  priorityCode?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  taHandoffDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  targetClosureDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  experience?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  jobLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minBudget?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxBudget?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsInt()
  @Min(1)
  durationMonths?: number | null;
}

export class RequirementStatusDto {
  @ApiProperty({ enum: RequirementStatus })
  @IsEnum(RequirementStatus)
  status!: RequirementStatus;
}

/** Fields a TA user may update on an assigned requirement. */
export const TA_UPDATE_FIELDS = [
  'taOwnerId',
  'taOwnerIds',
  'taHandoffDate',
  'remarks',
] as const;
