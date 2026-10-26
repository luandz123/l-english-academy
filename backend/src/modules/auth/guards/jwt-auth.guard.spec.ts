import { ExecutionContext, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../token.service';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard';

const SECRET = 's'.repeat(32);

function contextWith(authorization?: string) {
  const req = { headers: { authorization } } as unknown as AuthenticatedRequest;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

async function rejection(
  promise: Promise<unknown>,
): Promise<Record<string, unknown>> {
  try {
    await promise;
  } catch (err) {
    return (err as HttpException).getResponse() as Record<string, unknown>;
  }
  throw new Error('Guard lẽ ra phải từ chối');
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const config = { get: () => 900 } as unknown as ConfigService;
  const guard = new JwtAuthGuard(new TokenService(jwt, config as never));

  it('gắn req.user từ token hợp lệ', async () => {
    const token = await jwt.signAsync({
      sub: 'u1',
      email: 'a@x.com',
      role: 'authenticated',
    });
    const { ctx, req } = contextWith(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', email: 'a@x.com' });
  });

  it('thiếu header → "Auth session missing!"', async () => {
    const res = await rejection(guard.canActivate(contextWith().ctx));
    expect(res.message).toBe('Auth session missing!');
  });

  it('token hết hạn → "JWT expired" (frontend hiện "Phiên đăng nhập đã hết hạn")', async () => {
    const token = await jwt.signAsync(
      { sub: 'u1', email: 'a@x.com' },
      { expiresIn: -10 },
    );
    const res = await rejection(
      guard.canActivate(contextWith(`Bearer ${token}`).ctx),
    );
    expect(res.message).toBe('JWT expired');
  });

  it('token ký bằng secret khác → "Invalid JWT"', async () => {
    const forged = await new JwtService({ secret: 'x'.repeat(32) }).signAsync({
      sub: 'admin',
    });
    const res = await rejection(
      guard.canActivate(contextWith(`Bearer ${forged}`).ctx),
    );
    expect(res.message).toBe('Invalid JWT');
  });
});
