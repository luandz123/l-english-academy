import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Prisma } from '../../generated/prisma/client';
import { AppRole, AuthTokenType } from '../../generated/prisma/enums';
import type { Env } from '../../config/env.schema';
import { MailService } from '../../mail/mail.service';
import { AuthErrors } from './auth-errors';
import { recoveryMail, verificationMail } from './auth-mail';
import { toAuthSession, toAuthUser, toProfileDto } from './auth.mapper';
import type { ProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { AuthRepository, type UserRecord } from './auth.repository';
import type { AuthResultDto, AuthUserDto } from './dto/auth-response.dto';
import type { UpdateMeDto, UserMetadataDto } from './dto/auth-request.dto';
import { TokenService } from './token.service';

/** Kết quả có phiên đăng nhập: controller đặt refreshToken vào cookie httpOnly. */
export interface SessionResult {
  body: AuthResultDto;
  refreshToken: string | null;
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RECOVERY_TTL_MS = 60 * 60 * 1000;
// Hai tab cùng refresh một lúc: token vừa dùng trong khoảng này không bị coi là đánh cắp
const REUSE_GRACE_MS = 10_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly requireConfirmation: boolean;
  private readonly refreshTtlMs: number;
  private readonly frontendUrl: string;
  private readonly allowedOrigins: Set<string>;
  // Hash giả để login sai email vẫn tốn thời gian như login sai mật khẩu (chống dò email)
  private readonly dummyHash = argon2.hash('timing-equalizer');

  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    config: ConfigService<Env, true>,
  ) {
    this.requireConfirmation = config.get('AUTH_REQUIRE_EMAIL_CONFIRMATION', {
      infer: true,
    });
    this.refreshTtlMs =
      config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000;
    this.frontendUrl = config.get('FRONTEND_URL', { infer: true });
    this.allowedOrigins = new Set(
      [
        this.frontendUrl,
        ...config.get('CORS_ORIGINS', { infer: true }).split(','),
      ].map((o) => new URL(o.trim()).origin),
    );
  }

  // --- Đăng ký / đăng nhập ---

  async register(input: {
    email: string;
    password: string;
    data?: UserMetadataDto;
    redirectTo?: string;
  }): Promise<SessionResult> {
    const user = await this.createPasswordUser(input);
    if (this.requireConfirmation) {
      return {
        body: { user: toAuthUser(user), session: null },
        refreshToken: null,
      };
    }
    return this.issueSession(user);
  }

  /** Admin tạo học viên (thay client Supabase tạm ở AdminStudents.tsx:38). */
  async adminCreateUser(input: {
    email: string;
    password: string;
    data?: UserMetadataDto;
  }): Promise<AuthUserDto> {
    return toAuthUser(await this.createPasswordUser(input));
  }

  async login(email: string, password: string): Promise<SessionResult> {
    const user = await this.repo.findUserByEmail(email);
    const valid = user?.passwordHash
      ? await argon2.verify(user.passwordHash, password)
      : await argon2.verify(await this.dummyHash, password).then(() => false);

    if (!user || !valid) throw AuthErrors.invalidCredentials();
    if (this.requireConfirmation && !user.emailVerifiedAt) {
      throw AuthErrors.emailNotConfirmed();
    }
    return this.issueSession(user);
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<SessionResult> {
    let user = await this.repo.findUserByGoogleId(profile.googleId);

    if (!user) {
      const existing = await this.repo.findUserByEmail(profile.email);
      if (existing) {
        // Cùng email đã xác minh bởi Google → liên kết như Supabase gộp identity
        user = await this.repo.updateUser(existing.id, {
          googleId: profile.googleId,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        });
      } else {
        user = await this.repo.createUserWithProfile({
          email: profile.email,
          googleId: profile.googleId,
          emailVerifiedAt: new Date(),
          userMetadata: compact({
            full_name: profile.fullName,
            name: profile.fullName,
            avatar_url: profile.avatarUrl,
            picture: profile.avatarUrl,
          }),
        });
      }
    }
    return this.issueSession(user);
  }

  // --- Phiên ---

  async refresh(rawToken: string | undefined): Promise<SessionResult> {
    if (!rawToken) throw AuthErrors.refreshTokenNotFound();
    const row = await this.repo.findRefreshToken(TokenService.hash(rawToken));
    if (!row || row.revokedAt || row.expiresAt < new Date()) {
      throw AuthErrors.refreshTokenNotFound();
    }

    if (row.usedAt) {
      const sinceUse = Date.now() - row.usedAt.getTime();
      if (sinceUse > REUSE_GRACE_MS) {
        // Token cũ bị dùng lại sau khi đã xoay vòng → nghi bị đánh cắp
        await this.repo.revokeFamily(row.familyId);
        this.logger.warn(
          `Phát hiện dùng lại refresh token, thu hồi family ${row.familyId}`,
        );
        throw AuthErrors.refreshTokenReused();
      }
    } else {
      // Thua cuộc đua với request khác trong cùng tích tắc → cũng nằm trong grace
      await this.repo.markRefreshTokenUsed(row.id);
    }

    const user = await this.repo.findUserById(row.userId);
    if (!user) throw AuthErrors.refreshTokenNotFound();
    return this.issueSession(user, row.familyId, false);
  }

  /** signOut() của supabase-js mặc định scope "global": thu hồi mọi phiên của người dùng. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const row = await this.repo.findRefreshToken(TokenService.hash(rawToken));
    if (row) await this.repo.revokeAllForUser(row.userId);
  }

  async getUser(userId: string): Promise<AuthUserDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw AuthErrors.sessionMissing();
    return toAuthUser(user);
  }

  /** Như updateUser() của Supabase: đổi mật khẩu và/hoặc gộp thêm vào user_metadata. */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<AuthUserDto> {
    const user = await this.repo.findUserById(userId);
    if (!user) throw AuthErrors.sessionMissing();

    const data: Prisma.UserUpdateInput = {};
    if (dto.password) data.passwordHash = await argon2.hash(dto.password);
    if (dto.data) {
      data.userMetadata = {
        ...(user.userMetadata as Record<string, unknown>),
        ...compact({ ...dto.data }),
      } as Prisma.InputJsonObject;
    }
    return toAuthUser(await this.repo.updateUser(userId, data));
  }

  getRoles(userId: string): Promise<AppRole[]> {
    return this.repo.getRoles(userId);
  }

  async getMyProfile(userId: string): Promise<ProfileDto> {
    const profile = await this.repo.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException({
        code: 'PROFILE_NOT_FOUND',
        message: 'Không tìm thấy hồ sơ',
      });
    }
    return toProfileDto(profile);
  }

  async getStudentProfile(userId: string): Promise<ProfileDto | null> {
    const profile = await this.repo.findProfileByUserId(userId);
    return profile ? toProfileDto(profile) : null;
  }

  /** Chỉ tên + ảnh đại diện; is_pro/pro_plan chỉ đổi qua luồng thanh toán (OPEN_QUESTIONS #10). */
  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    await this.getMyProfile(userId);
    const updated = await this.repo.updateProfile(userId, {
      fullName: dto.full_name,
      avatarUrl: dto.avatar_url,
    });
    return toProfileDto(updated);
  }

  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    return (await this.repo.getRoles(userId)).includes(role);
  }

  // --- Link email ---

  /** Luôn trả thành công dù email có tồn tại hay không (chống dò email, như Supabase). */
  async requestPasswordRecovery(
    email: string,
    redirectTo?: string,
  ): Promise<void> {
    const user = await this.repo.findUserByEmail(email);
    if (!user) return;
    const link = await this.createEmailLink(
      user.id,
      AuthTokenType.password_recovery,
      RECOVERY_TTL_MS,
      'recovery',
      this.safeRedirect(redirectTo, '/reset-password'),
    );
    await this.mail.send(recoveryMail(user.email, link));
  }

  /**
   * Xử lý link trong email. Thành công → mở phiên (cookie) và chuyển tới trang đích;
   * thất bại → chuyển về /auth/callback kèm #error_description như Supabase.
   */
  async verifyEmailLink(
    token: string,
    type: 'signup' | 'recovery',
    redirectTo?: string,
  ): Promise<{ redirect: string; refreshToken: string | null }> {
    const tokenType =
      type === 'signup'
        ? AuthTokenType.email_verification
        : AuthTokenType.password_recovery;
    const fallback = type === 'signup' ? '/' : '/reset-password';
    const userId = await this.repo.consumeAuthToken(
      TokenService.hash(token),
      tokenType,
    );
    if (!userId) {
      const desc = encodeURIComponent('Email link is invalid or has expired');
      return {
        redirect: `${this.frontendUrl}/auth/callback#error_description=${desc}`,
        refreshToken: null,
      };
    }

    let user = await this.repo.findUserById(userId);
    if (!user) throw AuthErrors.refreshTokenNotFound();
    if (!user.emailVerifiedAt) {
      // Bấm link (kể cả link đặt lại mật khẩu) chứng minh sở hữu email
      user = await this.repo.updateUser(user.id, {
        emailVerifiedAt: new Date(),
      });
    }
    const session = await this.issueSession(user);
    return {
      redirect: this.safeRedirect(redirectTo, fallback),
      refreshToken: session.refreshToken,
    };
  }

  /** Chỉ cho chuyển hướng về origin của frontend (chống open redirect). */
  safeRedirect(url: string | undefined, fallbackPath: string): string {
    if (url) {
      try {
        if (this.allowedOrigins.has(new URL(url).origin)) return url;
      } catch {
        // URL hỏng → dùng mặc định
      }
    }
    return `${this.frontendUrl}${fallbackPath}`;
  }

  // --- Nội bộ ---

  private async createPasswordUser(input: {
    email: string;
    password: string;
    data?: UserMetadataDto;
    redirectTo?: string;
  }): Promise<UserRecord> {
    if (await this.repo.findUserByEmail(input.email)) {
      throw AuthErrors.userAlreadyExists();
    }

    let user: UserRecord;
    try {
      user = await this.repo.createUserWithProfile({
        email: input.email,
        passwordHash: await argon2.hash(input.password),
        emailVerifiedAt: this.requireConfirmation ? undefined : new Date(),
        userMetadata: compact({ ...input.data }),
      });
    } catch (err) {
      // Hai request đăng ký cùng email cùng lúc
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw AuthErrors.userAlreadyExists();
      }
      throw err;
    }

    if (this.requireConfirmation) {
      try {
        const link = await this.createEmailLink(
          user.id,
          AuthTokenType.email_verification,
          VERIFICATION_TTL_MS,
          'signup',
          this.safeRedirect(input.redirectTo, '/'),
        );
        await this.mail.send(verificationMail(user.email, link));
      } catch (err) {
        this.logger.error(`Gửi email xác nhận thất bại: ${String(err)}`);
        // Không để lại tài khoản chưa xác nhận mà không có cách nhận link (chặn đăng ký lại)
        await this.repo.deleteUser(user.id);
        throw AuthErrors.emailSendFailed();
      }
    }
    return user;
  }

  private async createEmailLink(
    userId: string,
    type: AuthTokenType,
    ttlMs: number,
    linkType: 'signup' | 'recovery',
    redirectTo: string,
  ): Promise<string> {
    const { token, hash } = this.tokens.generateOpaqueToken();
    await this.repo.createAuthToken({
      userId,
      type,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + ttlMs),
    });
    // Link đi qua origin frontend (rewrite /api → backend) để cookie là cookie bên thứ nhất
    const params = new URLSearchParams({
      token,
      type: linkType,
      redirect_to: redirectTo,
    });
    return `${this.frontendUrl}/api/v1/auth/verify?${params.toString()}`;
  }

  private async issueSession(
    user: UserRecord,
    familyId = this.tokens.newFamilyId(),
    isNewSignIn = true,
  ): Promise<SessionResult> {
    const { token, hash } = this.tokens.generateOpaqueToken();
    await this.repo.createRefreshToken({
      userId: user.id,
      familyId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
    const current = isNewSignIn
      ? await this.repo.updateUser(user.id, { lastSignInAt: new Date() })
      : user;
    const authUser = toAuthUser(current);
    const access = await this.tokens.signAccessToken(current);
    return {
      body: { user: authUser, session: toAuthSession(authUser, access) },
      refreshToken: token,
    };
  }
}

/** Bỏ các key undefined/null-undefined để không ghi đè metadata bằng undefined. */
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}
