import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Refresh token; omit to use `sst_refresh` cookie',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
