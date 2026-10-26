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

  execSync('npx prisma migrate deploy', {
    cwd: `${__dirname}/../..`,
    env: process.env,
    stdio: 'pipe',
  });

  (globalThis as Record<string, unknown>).__PG_CONTAINER__ = container;
}
