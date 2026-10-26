import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Env } from '../../config/env.schema';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  /** Giữ như JWT Supabase: mọi người dùng đăng nhập có role "authenticated" */
  role: 'authenticated';
}

export interface IssuedAccessToken {
  accessToken: string;
  expiresIn: number;
  /** Unix giây, như session.expires_at của Supabase */
  expiresAt: number;
}

/** Ký/kiểm JWT access token và sinh token ngẫu nhiên (refresh, link email). */
@Injectable()
export class TokenService {
  private readonly accessTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTtl = config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  async signAccessToken(user: {
    id: string;
    email: string;
  }): Promise<IssuedAccessToken> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: 'authenticated',
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessTtl,
    });
    return {
      accessToken,
      expiresIn: this.accessTtl,
      expiresAt: Math.floor(Date.now() / 1000) + this.accessTtl,
    };
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }

  /** Token ngẫu nhiên 256 bit (gửi cho client) và hash SHA-256 (lưu DB). */
  generateOpaqueToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: TokenService.hash(token) };
  }

  newFamilyId(): string {
    return randomUUID();
  }

  static hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
