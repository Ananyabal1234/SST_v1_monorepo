import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCandidateDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Parent requirement UUID from POST /requirements',
  })
  @IsUUID()
  requirementId!: string;

  @ApiProperty({ description: 'Candidate full name' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Mobile number' })
  @IsString()
  mobile!: string;

  @ApiProperty({ description: 'Email address' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ example: 'Referral' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: 'Application Development' })
  @IsOptional()
  @IsString()
  jobFamily?: string;

  @ApiProperty({
    example: 'SUBMITTED_TO_SPOC',
    description:
      'Active CANDIDATE_STAGE lookup: SUBMITTED_TO_SPOC | CLIENT_SHORTLIST | HOLD | REJECT',
  })
  @IsString()
  stageCode!: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  feedbackCode?: string | null;

  @ApiPropertyOptional({
    example: 'Selected',
    description:
      'UI status label (Selected | Rejected | Pending). Maps to selected flag + feedbackCode.',
  })
  @IsOptional()
  @IsString()
  candidateStatus?: string;

  @ApiPropertyOptional({ example: '2026-07-10', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  profileSubmittedDate?: string | null;

  @ApiPropertyOptional({ example: '2026-07-15', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  clientShortlistDate?: string | null;

  @ApiPropertyOptional({
    example: 'L1',
    nullable: true,
    description: 'Active INTERVIEW_ROUND lookup: L1 | L2 | L3 | L4 | COMPLETED',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  interviewRound?: string | null;

  @ApiPropertyOptional({
    example: 'NOT_RECEIVED',
    description:
      'LOI status (only when Selected): NOT_APPLICABLE | RECEIVED | NOT_RECEIVED. Offer initiates only for NOT_APPLICABLE or RECEIVED.',
  })
  @IsOptional()
  @IsString()
  loiStatus?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  remarks?: string | null;
}

export class UpdateCandidateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobFamily?: string;

  @ApiPropertyOptional({
    example: 'CLIENT_SHORTLIST',
    description:
      'Active CANDIDATE_STAGE lookup: SUBMITTED_TO_SPOC | CLIENT_SHORTLIST | HOLD | REJECT',
  })
  @IsOptional()
  @IsString()
  stageCode?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  feedbackCode?: string | null;

  @ApiPropertyOptional({
    example: 'Selected',
    description:
      'UI status label (Selected | Rejected | Pending). Maps to selected flag + feedbackCode.',
  })
  @IsOptional()
  @IsString()
  candidateStatus?: string;

  @ApiPropertyOptional({
    example: 'RECEIVED',
    description:
      'LOI status (only when Selected): NOT_APPLICABLE | RECEIVED | NOT_RECEIVED. Offer initiates only for NOT_APPLICABLE or RECEIVED.',
  })
  @IsOptional()
  @IsString()
  loiStatus?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  profileSubmittedDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  clientShortlistDate?: string | null;

  @ApiPropertyOptional({
    example: 'L2',
    nullable: true,
    description: 'Active INTERVIEW_ROUND lookup: L1 | L2 | L3 | L4 | COMPLETED',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  interviewRound?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  remarks?: string | null;
}

export class SelectCandidateDto {
  @ApiProperty()
  @IsBoolean()
  selected!: boolean;
}

export class DuplicateLookupQueryDto {
  @ApiPropertyOptional({ description: 'Email to check for prior candidate rows' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Mobile to check for prior candidate rows' })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional({
    description: 'Exclude this candidate (UUID or publicId CAN-00001) from matches',
  })
  @IsOptional()
  @IsString()
  excludeId?: string;
}
