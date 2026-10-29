import { ExecutionContext, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../token.service';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

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
): Promise<{ status: number; body: Record<string, unknown> }> {
  try {
    await promise;
  } catch (err) {
    const http = err as HttpException;
    return {
      status: http.getStatus(),
      body: http.getResponse() as Record<string, unknown>,
    };
  }
  throw new Error('Guard lẽ ra phải từ chối');
}

describe('OptionalJwtAuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const config = { get: () => 900 } as unknown as ConfigService;
  const guard = new OptionalJwtAuthGuard(
    new JwtAuthGuard(new TokenService(jwt, config as never)),
  );

  it('không có header → cho qua như khách, req.user để trống', async () => {
    const { ctx, req } = contextWith();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('token hợp lệ → gắn req.user', async () => {
    const token = await jwt.signAsync({ sub: 'u1', email: 'a@x.com' });
    const { ctx, req } = contextWith(`Bearer ${token}`);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', email: 'a@x.com' });
  });

  it('token hỏng → 401 "Invalid JWT" (không hạ xuống khách)', async () => {
    const res = await rejection(
      guard.canActivate(contextWith('Bearer not-a-jwt').ctx),
    );
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('bad_jwt');
    expect(res.body.message).toBe('Invalid JWT');
  });

  it('token hết hạn → 401 "JWT expired"', async () => {
    const token = await jwt.signAsync(
      { sub: 'u1', email: 'a@x.com' },
      { expiresIn: -10 },
    );
    const res = await rejection(
      guard.canActivate(contextWith(`Bearer ${token}`).ctx),
    );
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('JWT expired');
  });
});
