import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { Env } from '../../../config/env.schema';
import { setOAuthStateCookie } from '../auth-cookies';
import { AuthErrors } from '../auth-errors';

export interface OAuthState {
  /** nonce khớp với cookie → chống login CSRF */
  n: string;
  /** trang đích sau đăng nhập (đã kiểm origin ở callback) */
  r?: string;
}

export function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

export function decodeState(raw: unknown): OAuthState | null {
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString(),
    ) as OAuthState;
    return typeof parsed.n === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService<Env, true>) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (!this.config.get('GOOGLE_CLIENT_ID', { infer: true })) {
      throw AuthErrors.googleNotConfigured();
    }
    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    // Bước callback: passport đổi code lấy profile, không cần thêm tham số
    if (req.path.endsWith('/callback')) return { session: false };

    const res = context.switchToHttp().getResponse<Response>();
    const nonce = randomBytes(16).toString('base64url');
    setOAuthStateCookie(
      res,
      nonce,
      this.config.get('NODE_ENV', { infer: true }) === 'production',
    );
    const redirect =
      typeof req.query.redirect_to === 'string'
        ? req.query.redirect_to
        : undefined;
    const prompt =
      req.query.prompt === 'select_account' || req.query.prompt === 'consent'
        ? req.query.prompt
        : undefined;
    return {
      session: false,
      state: encodeState({ n: nonce, r: redirect }),
      prompt,
    };
  }

  /** Người dùng hủy ở Google → không ném 401 JSON; controller chuyển về trang lỗi. */
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return (user || null) as TUser;
  }
}
