import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HealthResponseDto } from '../src/health/health.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

// DB: Postgres thật do test/setup/global-setup.ts bật bằng Testcontainers
describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('trả về ok khi kết nối được DB thật', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof (res.body as HealthResponseDto).uptime).toBe('number');
  });

  it('migration baseline đã được áp (đủ 28 bảng cũ + users)', async () => {
    const prisma = app.get(PrismaService);
    const rows = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'`;
    expect(rows[0].n).toBe(29);
  });

  it('route không tồn tại trả lỗi theo định dạng thống nhất', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/khong-ton-tai')
      .expect(404);

    expect(res.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      path: '/api/v1/khong-ton-tai',
    });
  });
});
