import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HealthResponseDto } from '../src/health/health.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

// 28 bảng đo trên DB Supabase production (DECISIONS O-04) + users thay auth.users
const LEGACY_TABLES = [
  'admin_activity_log',
  'admin_student_notes',
  'answers',
  'course_categories',
  'courses',
  'enrollments',
  'full_test_answer_details',
  'full_test_sections',
  'full_tests',
  'lesson_practices',
  'lessons',
  'materials',
  'modules',
  'payment_orders',
  'platform_settings',
  'profiles',
  'questions',
  'quizzes',
  'user_answers',
  'user_favorites',
  'user_full_test_results',
  'user_lesson_progress',
  'user_notes',
  'user_quiz_results',
  'user_roles',
  'vocab_categories',
  'vocab_questions',
  'vocab_quizzes',
  'users',
];

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

  it('migration đã được áp (đủ 28 bảng cũ của Supabase + users)', async () => {
    const prisma = app.get(PrismaService);
    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
    const names = rows.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(LEGACY_TABLES));
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
