import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOnboardingDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Accepted offer UUID (server copies candidateId + requirementId)',
  })
  @IsUUID()
  offerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hrOwnerId!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  docsPending?: boolean;

  @ApiProperty({ example: 'NOT_STARTED' })
  @IsString()
  bgvStatusCode!: string;

  @ApiPropertyOptional({ example: 'DOCS_PENDING' })
  @IsOptional()
  @IsString()
  onboardingStatus?: string;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  joiningFormalities?: string;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString()
  expectedDoj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateOnboardingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  docsPending?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bgvStatusCode?: string;

  @ApiPropertyOptional({ example: 'DOCS_PENDING' })
  @IsOptional()
  @IsString()
  onboardingStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  joiningFormalities?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedDoj?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualDoj?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({
    example: 'ACCEPTED',
    description:
      'Linked offer status (RELEASED | ACCEPTED | DECLINED | HOLD | BACKOUT). Cascades soft-cancel / re-accept on onboarding.',
  })
  @IsOptional()
  @IsString()
  offerStatus?: string;
}

export class OnboardingStatusDto {
  @ApiProperty()
  @IsString()
  statusCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualDoj?: string;
}
