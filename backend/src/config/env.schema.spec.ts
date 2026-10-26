import { validateEnv } from './env.schema';

const BASE = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('áp giá trị mặc định khi chỉ có biến bắt buộc', () => {
    const env = validateEnv(BASE);
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: 'http://localhost:8082',
      JWT_ACCESS_TTL_SECONDS: 900,
      AUTH_REQUIRE_EMAIL_CONFIRMATION: true,
      SMTP_PORT: 1025,
    });
  });

  it('từ chối khởi động khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: 'x'.repeat(32) })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('từ chối JWT secret ngắn hơn 32 ký tự', () => {
    expect(() => validateEnv({ ...BASE, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('production bắt buộc FRONTEND_URL https và SMTP_USER', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        FRONTEND_URL: 'http://x.vercel.app',
      }),
    ).toThrow(/FRONTEND_URL/);
  });
});
