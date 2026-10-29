import { toAuthSession, toAuthUser } from './auth.mapper';
import type { UserRecord } from './auth.repository';

const base: UserRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'a@x.com',
  passwordHash: '$argon2id$...',
  googleId: null,
  emailVerifiedAt: new Date('2026-10-26T00:00:00Z'),
  userMetadata: { full_name: 'A', bio: 'hi' },
  lastSignInAt: null,
  createdAt: new Date('2026-10-25T00:00:00Z'),
  updatedAt: new Date('2026-10-26T00:00:00Z'),
};

describe('auth.mapper', () => {
  it('trả shape User của Supabase, không lộ password_hash', () => {
    const user = toAuthUser(base);
    expect(user).toEqual({
      id: base.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'a@x.com',
      email_confirmed_at: '2026-10-26T00:00:00.000Z',
      confirmed_at: '2026-10-26T00:00:00.000Z',
      last_sign_in_at: null,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: 'A', bio: 'hi' },
      created_at: '2026-10-25T00:00:00.000Z',
      updated_at: '2026-10-26T00:00:00.000Z',
    });
    expect(JSON.stringify(user)).not.toContain('argon2');
  });

  it('tài khoản chỉ có Google → provider google', () => {
    const user = toAuthUser({ ...base, passwordHash: null, googleId: 'g-1' });
    expect(user.app_metadata).toEqual({
      provider: 'google',
      providers: ['google'],
    });
  });

  it('session có access_token, expires_at (giây) và user', () => {
    const user = toAuthUser(base);
    const session = toAuthSession(user, {
      accessToken: 'jwt',
      expiresIn: 900,
      expiresAt: 1_800_000_000,
    });
    expect(session).toEqual({
      access_token: 'jwt',
      token_type: 'bearer',
      expires_in: 900,
      expires_at: 1_800_000_000,
      user,
    });
  });
});
