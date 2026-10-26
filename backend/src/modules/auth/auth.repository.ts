import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { AppRole, AuthTokenType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';

export type UserRecord = Prisma.UserGetPayload<object>;

export interface NewUser {
  email: string;
  passwordHash?: string;
  googleId?: string;
  emailVerifiedAt?: Date;
  userMetadata: Record<string, unknown>;
}

/** Truy cập bảng users, profiles, user_roles, refresh_tokens, auth_tokens. */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findUserById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  /**
   * Tạo user + profile + role student trong một transaction.
   * Thay trigger Supabase on_auth_user_created → handle_new_user():
   * full_name = metadata.full_name → metadata.name → phần trước @ của email.
   */
  createUserWithProfile(input: NewUser): Promise<UserRecord> {
    const meta = input.userMetadata;
    const fullName =
      asString(meta.full_name) ??
      asString(meta.name) ??
      input.email.split('@')[0];

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          googleId: input.googleId,
          emailVerifiedAt: input.emailVerifiedAt,
          userMetadata: meta as Prisma.InputJsonObject,
        },
      });
      await tx.profile.create({
        data: {
          userId: user.id,
          fullName,
          avatarUrl: asString(meta.avatar_url),
          email: input.email,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: AppRole.student },
      });
      return user;
    });
  }

  /** Xóa user; profiles, user_roles, token… xóa theo ON DELETE CASCADE. */
  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<UserRecord> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async getRoles(userId: string): Promise<AppRole[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    return rows.map((r) => r.role);
  }

  // --- Refresh token ---

  createRefreshToken(data: {
    userId: string;
    familyId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  /** Đánh dấu đã dùng; trả false nếu token đã bị dùng/thu hồi trước đó (đua nhau). */
  async markRefreshTokenUsed(id: string): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });
    return count === 1;
  }

  revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // --- Token trong link email ---

  createAuthToken(data: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.authToken.create({ data });
  }

  /** Dùng token một lần: chỉ thành công nếu chưa dùng và chưa hết hạn. */
  async consumeAuthToken(
    tokenHash: string,
    type: AuthTokenType,
  ): Promise<string | null> {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash },
    });
    if (!token || token.type !== type) return null;
    const { count } = await this.prisma.authToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    return count === 1 ? token.userId : null;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
