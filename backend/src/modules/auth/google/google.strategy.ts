import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import type { Env } from '../../../config/env.schema';
import type { GoogleProfile } from '../auth.service';

/**
 * Đăng nhập Google (thay supabase.auth.signInWithOAuth). Callback đi qua origin
 * frontend (rewrite /api → backend) để cookie phiên là cookie bên thứ nhất.
 * Thiếu GOOGLE_CLIENT_ID → GoogleAuthGuard trả 503 thay vì làm sập app.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID:
        config.get('GOOGLE_CLIENT_ID', { infer: true }) ?? 'not-configured',
      clientSecret:
        config.get('GOOGLE_CLIENT_SECRET', { infer: true }) ?? 'not-configured',
      callbackURL: `${config.get('FRONTEND_URL', { infer: true })}/api/v1/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): GoogleProfile | false {
    const email = profile.emails?.find((e) => e.verified)?.value;
    // Chỉ nhận email Google đã xác minh (để liên kết với tài khoản email/mật khẩu sẵn có)
    if (!email) return false;
    return {
      googleId: profile.id,
      email: email.toLowerCase(),
      fullName: profile.displayName || undefined,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
