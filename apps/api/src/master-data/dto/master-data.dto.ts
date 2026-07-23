import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

export class CreateJobFamilyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpdateJobFamilyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

export class CreateLookupValueDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateLookupValueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Create TA / Sales / HR member (role is fixed by the route). */
export class CreateMemberDto {
  @ApiProperty({ example: 'ta.user@sst.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Taylor TA' })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiProperty({ example: 'ChangeMeNow!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
