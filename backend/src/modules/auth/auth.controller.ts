import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.schema';
import {
  clearOAuthStateCookie,
  clearRefreshCookie,
  OAUTH_STATE_COOKIE,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './auth-cookies';
import {
  AuthService,
  type GoogleProfile,
  type SessionResult,
} from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginDto,
  RecoverDto,
  RegisterDto,
  UpdateMeDto,
  VerifyQueryDto,
} from './dto/auth-request.dto';
import { AuthResultDto, AuthUserResultDto } from './dto/auth-response.dto';
import { RolesDto } from './dto/profile.dto';
import { decodeState, GoogleAuthGuard } from './google/google-auth.guard';
import { type AuthenticatedUser, JwtAuthGuard } from './guards/jwt-auth.guard';

// Chống dò mật khẩu/spam email: 10 request/phút/IP cho các route nhạy cảm
const SENSITIVE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;
  private readonly refreshTtlMs: number;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies =
      config.get('NODE_ENV', { infer: true }) === 'production';
    this.refreshTtlMs =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000;
  }

  // Public: thay supabase.auth.signUp
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle(SENSITIVE)
  @ApiOperation({
    summary: 'Đăng ký email/mật khẩu (session = null nếu phải xác nhận email)',
  })
  @ApiCreatedResponse({ type: AuthResultDto })
  @ApiTooManyRequestsResponse()
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const result = await this.auth.register({
      email: dto.email,
      password: dto.password,
      data: dto.data,
      redirectTo: dto.redirect_to,
    });
    return this.withCookie(res, result);
  }

  // Public: thay supabase.auth.signInWithPassword
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(SENSITIVE)
  @ApiOperation({ summary: 'Đăng nhập email/mật khẩu' })
  @ApiOkResponse({ type: AuthResultDto })
  @ApiTooManyRequestsResponse()
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    return this.withCookie(res, await this.auth.login(dto.email, dto.password));
  }

  // Public (cần cookie refresh): thay supabase.auth.refreshSession / khôi phục phiên khi tải trang
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({
    summary: 'Đổi refresh token (cookie) lấy phiên mới, xoay vòng token',
  })
  @ApiOkResponse({ type: AuthResultDto })
  @ApiUnauthorizedResponse({
    description: 'Không có/không hợp lệ/đã bị dùng lại',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    try {
      return this.withCookie(
        res,
        await this.auth.refresh(this.readRefreshCookie(req)),
      );
    } catch (err) {
      clearRefreshCookie(res, this.secureCookies);
      throw err;
    }
  }

  // Public (cần cookie refresh): thay supabase.auth.signOut (scope global)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Đăng xuất: thu hồi mọi phiên của người dùng' })
  @ApiNoContentResponse()
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.readRefreshCookie(req));
    clearRefreshCookie(res, this.secureCookies);
  }

  // Người dùng đăng nhập: thay supabase.auth.getUser
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin người dùng hiện tại' })
  @ApiOkResponse({ type: AuthUserResultDto })
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserResultDto> {
    return { user: await this.auth.getUser(user.id) };
  }

  // Người dùng đăng nhập: thay policy "Users can view own roles"
  // (useAuth.tsx:106, Login.tsx:81, AuthCallback.tsx:44 kiểm role admin)
  @Get('me/roles')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vai trò của người dùng hiện tại' })
  @ApiOkResponse({ type: RolesDto })
  async myRoles(@CurrentUser() user: AuthenticatedUser): Promise<RolesDto> {
    return { roles: await this.auth.getRoles(user.id) };
  }

  // Người dùng đăng nhập: thay supabase.auth.updateUser({ password, data })
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu và/hoặc gộp thêm user_metadata' })
  @ApiOkResponse({ type: AuthUserResultDto })
  async updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<AuthUserResultDto> {
    return { user: await this.auth.updateMe(user.id, dto) };
  }

  // Public: thay supabase.auth.resetPasswordForEmail. Luôn 200 (chống dò email).
  @Post('recover')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(SENSITIVE)
  @ApiOperation({ summary: 'Gửi email đặt lại mật khẩu' })
  @ApiOkResponse({ schema: { example: {} } })
  async recover(@Body() dto: RecoverDto): Promise<Record<string, never>> {
    await this.auth.requestPasswordRecovery(dto.email, dto.redirect_to);
    return {};
  }

  // Public: link trong email xác nhận / đặt lại mật khẩu
  @Get('verify')
  @ApiOperation({
    summary: 'Xử lý link email, mở phiên rồi chuyển hướng về frontend',
  })
  @ApiFoundResponse()
  async verify(
    @Query() q: VerifyQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const { redirect, refreshToken } = await this.auth.verifyEmailLink(
      q.token,
      q.type,
      q.redirect_to,
    );
    if (refreshToken) {
      setRefreshCookie(
        res,
        refreshToken,
        this.refreshTtlMs,
        this.secureCookies,
      );
    }
    res.redirect(HttpStatus.FOUND, redirect);
  }

  // Public: bắt đầu đăng nhập Google (guard chuyển hướng sang Google)
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Chuyển sang trang đăng nhập Google' })
  // Guard chạy trước pipe nên query được đọc và kiểm trong GoogleAuthGuard/AuthService.safeRedirect
  @ApiQuery({ name: 'redirect_to', required: false })
  @ApiQuery({
    name: 'prompt',
    required: false,
    enum: ['select_account', 'consent'],
  })
  @ApiFoundResponse()
  googleStart(): void {
    // GoogleAuthGuard đã trả về redirect
  }

  // Public: Google gọi lại
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google gọi lại sau khi người dùng đồng ý' })
  @ApiFoundResponse()
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const state = decodeState(req.query.state);
    const cookies = req.cookies as Record<string, string | undefined>;
    const nonce = cookies[OAUTH_STATE_COOKIE];
    clearOAuthStateCookie(res, this.secureCookies);

    const profile = req.user as GoogleProfile | null;
    if (!profile || !state || !nonce || state.n !== nonce) {
      const desc = encodeURIComponent(
        profile
          ? 'Phiên đăng nhập Google không hợp lệ, vui lòng thử lại'
          : 'Đăng nhập Google đã bị hủy',
      );
      res.redirect(
        HttpStatus.FOUND,
        `${this.auth.safeRedirect(undefined, '/auth/callback')}#error_description=${desc}`,
      );
      return;
    }

    const result = await this.auth.loginWithGoogle(profile);
    if (result.refreshToken) {
      setRefreshCookie(
        res,
        result.refreshToken,
        this.refreshTtlMs,
        this.secureCookies,
      );
    }
    res.redirect(
      HttpStatus.FOUND,
      this.auth.safeRedirect(state.r, '/auth/callback'),
    );
  }

  private readRefreshCookie(req: Request): string | undefined {
    return (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  }

  private withCookie(res: Response, result: SessionResult): AuthResultDto {
    if (result.refreshToken) {
      setRefreshCookie(
        res,
        result.refreshToken,
        this.refreshTtlMs,
        this.secureCookies,
      );
    }
    return result.body;
  }
}
