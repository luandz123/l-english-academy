import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthErrors } from '../auth-errors';
import { TokenService } from '../token.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };

/**
 * Bắt buộc access token hợp lệ (`Authorization: Bearer <jwt>`).
 * Thay điều kiện `auth.uid() = ...` của RLS: service nhận user id từ đây,
 * không bao giờ tin user id do client gửi lên.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw AuthErrors.sessionMissing();
    }

    try {
      const payload = await this.tokens.verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email };
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === 'TokenExpiredError') {
        throw AuthErrors.jwtExpired();
      }
      throw AuthErrors.invalidJwt();
    }
  }
}
