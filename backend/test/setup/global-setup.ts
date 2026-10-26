import { execSync } from 'node:child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Bật một Postgres thật (Docker) dùng chung cho mọi test e2e và áp toàn bộ migration.
 * Env phải được đặt ở đây, trước khi các file test import AppModule,
 * vì ConfigModule.forRoot validate env ngay lúc module được nạp.
 */
export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'warn';
  process.env.JWT_ACCESS_SECRET = 'test-secret-'.padEnd(48, 'x');
  process.env.FRONTEND_URL = 'http://localhost:8082';
  process.env.CORS_ORIGINS = 'http://localhost:8082';
  process.env.AUTH_REQUIRE_EMAIL_CONFIRMATION = 'true';
  delete process.env.GOOGLE_CLIENT_ID;

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/../..`,
    env: process.env,
    stdio: 'pipe',
  });

  (globalThis as Record<string, unknown>).__PG_CONTAINER__ = container;
}
