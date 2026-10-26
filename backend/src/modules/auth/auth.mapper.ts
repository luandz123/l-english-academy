import type { UserRecord } from './auth.repository';
import type { IssuedAccessToken } from './token.service';
import type { AuthSessionDto, AuthUserDto } from './dto/auth-response.dto';

/**
 * Map user DB → object `User` mà frontend đang dùng từ Supabase
 * (user.id, user.email, user.user_metadata, user.app_metadata…), để
 * useAuth.tsx và các trang không phải đổi cách đọc dữ liệu.
 */
export function toAuthUser(user: UserRecord): AuthUserDto {
  const providers = [
    ...(user.passwordHash ? ['email'] : []),
    ...(user.googleId ? ['google'] : []),
  ];
  const confirmedAt = user.emailVerifiedAt?.toISOString() ?? null;
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: confirmedAt,
    confirmed_at: confirmedAt,
    last_sign_in_at: user.lastSignInAt?.toISOString() ?? null,
    app_metadata: { provider: providers[0] ?? 'email', providers },
    user_metadata: (user.userMetadata ?? {}) as Record<string, unknown>,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString(),
  };
}

export function toAuthSession(
  user: AuthUserDto,
  token: IssuedAccessToken,
): AuthSessionDto {
  return {
    access_token: token.accessToken,
    token_type: 'bearer',
    expires_in: token.expiresIn,
    expires_at: token.expiresAt,
    user,
  };
}
