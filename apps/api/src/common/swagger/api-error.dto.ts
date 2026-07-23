import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({
    example: 'Candidate is not selected',
    description: 'Human-readable error message or validation details',
  })
  message!: string | string[];

  @ApiPropertyOptional({ example: 'b7c2a1d0-4f3e-4c9a-9e1b-2a3d4e5f6789' })
  correlationId?: string;
}

export class AuthTokensUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@sst.local' })
  email!: string;

  @ApiProperty({ example: 'SST Admin' })
  fullName!: string;

  @ApiProperty({
    example: 'ADMIN',
    enum: ['ADMIN', 'SALES', 'TA', 'HR', 'LEADERSHIP_READONLY'],
  })
  role!: string;
}

export class AuthTokensResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token (also set as httpOnly cookie `sst_refresh`)',
  })
  refreshToken!: string;

  @ApiProperty({ type: AuthTokensUserDto })
  user!: AuthTokensUserDto;
}

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'sst-api' })
  service!: string;
}

export class ReadyResponseDto {
  @ApiProperty({ example: 'ready' })
  status!: string;
}
