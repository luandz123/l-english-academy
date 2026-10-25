import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  it('áp giá trị mặc định khi chỉ có DATABASE_URL', () => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    });
    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: 'http://localhost:8082',
    });
  });

  it('từ chối khởi động khi thiếu DATABASE_URL', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });
});
