import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/roles.decorator';
import { CurrentUser, AuthUser } from './decorators/current-user.decorator';
import {
  AuthTokensResponseDto,
  AuthTokensUserDto,
  OkResponseDto,
  ApiErrorDto,
} from '../common/swagger/api-error.dto';
import {
  ApiAuthError,
  ApiProtectedErrors,
  ApiValidationError,
} from '../common/swagger/api-decorators';

const REFRESH_COOKIE = 'sst_refresh';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({
    operationId: 'login',
    summary: 'Login with email and password',
  })
  @ApiCreatedResponse({ type: AuthTokensResponseDto })
  @ApiValidationError()
  @ApiTooManyRequestsResponse({
    description: 'Login rate limited',
    type: ApiErrorDto,
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    operationId: 'refresh',
    summary: 'Refresh access token (body or sst_refresh cookie)',
  })
  @ApiCreatedResponse({ type: AuthTokensResponseDto })
  @ApiValidationError()
  @ApiAuthError()
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    const result = await this.auth.refresh(token ?? '');
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({
    operationId: 'logout',
    summary: 'Revoke refresh token and clear cookie',
  })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiProtectedErrors()
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthUser,
  ) {
    const token =
      dto.refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
    await this.auth.logout(token, user.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    operationId: 'getMe',
    summary: 'Current authenticated user',
  })
  @ApiOkResponse({ type: AuthTokensUserDto })
  @ApiProtectedErrors()
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
