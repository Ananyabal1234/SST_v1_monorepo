import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@sst.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ChangeMeNow!', minLength: 8 })
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
