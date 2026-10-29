import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

describe('Assessment Leaderboard & Stats Overview (e2e - T-033)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@leaderboard-test.com';

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function userWithToken(
    email: string,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: { email, emailVerifiedAt: new Date() },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  async function cleanup(): Promise<void> {
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('GET /api/v1/assessment/leaderboard/study-time (RLS parity)', () => {
    let studentA: { id: string; token: string };
    let studentB: { id: string; token: string };
    let studentC: { id: string; token: string };
    let admin: { id: string; token: string };
    let fullTestId: number;

    beforeAll(async () => {
      studentA = await userWithToken(`studentA${EMAIL_SUFFIX}`);
      studentB = await userWithToken(`studentB${EMAIL_SUFFIX}`);
      studentC = await userWithToken(`studentC${EMAIL_SUFFIX}`);
      admin = await userWithToken(`adminLeaderboard${EMAIL_SUFFIX}`);

      await prisma.userRole.create({
        data: { userId: admin.id, role: 'admin' },
      });

      const ft = await prisma.fullTest.create({
        data: {
          title: 'Leaderboard Test Full',
          totalQuestions: 200,
        },
      });
      fullTestId = ft.id;

      // Student A: 500s from full test
      await prisma.userFullTestResult.create({
        data: {
          userId: studentA.id,
          testId: ft.id,
          timeSpentSeconds: 500,
          totalScore: 700,
        },
      });

      // Student B: 1200s from full test
      await prisma.userFullTestResult.create({
        data: {
          userId: studentB.id,
          testId: ft.id,
          timeSpentSeconds: 1200,
          totalScore: 850,
        },
      });
    });

    afterAll(async () => {
      if (fullTestId) {
        await prisma.fullTest
          .delete({ where: { id: fullTestId } })
          .catch(() => null);
      }
    });

    it('khách (không có token) nhận []', async () => {
      const res = await http()
        .get('/api/v1/assessment/leaderboard/study-time')
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('học viên A chỉ nhận kết quả của chính mình, không thấy user_id của B', async () => {
      const res = await http()
        .get('/api/v1/assessment/leaderboard/study-time')
        .set(bearer(studentA.token))
        .expect(200);

      const items = res.body as { user_id: string; total_seconds: number }[];
      expect(items).toEqual([{ user_id: studentA.id, total_seconds: 500 }]);
      expect(items.some((i) => i.user_id === studentB.id)).toBe(false);
    });

    it('học viên C chưa có kết quả nhận []', async () => {
      const res = await http()
        .get('/api/v1/assessment/leaderboard/study-time')
        .set(bearer(studentC.token))
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('admin thấy cả học viên A và B, sắp xếp thời gian giảm dần', async () => {
      const res = await http()
        .get('/api/v1/assessment/leaderboard/study-time')
        .set(bearer(admin.token))
        .expect(200);

      const items = res.body as { user_id: string; total_seconds: number }[];
      expect(items.length).toBeGreaterThanOrEqual(2);

      const aItem = items.find((i) => i.user_id === studentA.id);
      const bItem = items.find((i) => i.user_id === studentB.id);
      expect(aItem).toBeDefined();
      expect(bItem).toBeDefined();
      expect(aItem?.total_seconds).toBe(500);
      expect(bItem?.total_seconds).toBe(1200);

      const bIdx = items.findIndex((i) => i.user_id === studentB.id);
      const aIdx = items.findIndex((i) => i.user_id === studentA.id);
      expect(bIdx).toBeLessThan(aIdx);

      // Verify privacy: items only contain user_id and total_seconds
      const sample = items[0] as Record<string, unknown>;
      expect(sample).toHaveProperty('user_id');
      expect(sample).toHaveProperty('total_seconds');
      expect(sample.score).toBeUndefined();
      expect(sample.answersDetail).toBeUndefined();
    });
  });

  describe('GET /api/v1/assessment/full-tests', () => {
    it('trả về danh sách full-tests với đúng các trường tóm tắt', async () => {
      const res = await http().get('/api/v1/assessment/full-tests').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Record<string, unknown>[];
      if (body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('display_order');
        expect(item).toHaveProperty('course_id');
      }
    });
  });

  describe('GET /api/v1/assessment/stats/overview', () => {
    it('trả về thống kê tổng quan nền tảng', async () => {
      const res = await http()
        .get('/api/v1/assessment/stats/overview')
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('total_questions');
      expect(body).toHaveProperty('listening_questions');
      expect(body).toHaveProperty('reading_questions');
      expect(body).toHaveProperty('total_full_tests');
      expect(body).toHaveProperty('total_users');
      expect(typeof body.total_questions).toBe('number');
      expect(typeof body.total_users).toBe('number');
    });
  });

  describe('GET /api/v1/assessment/vocab/pool', () => {
    it('trả về mảng từ vựng ngẫu nhiên hợp lệ', async () => {
      const res = await http()
        .get('/api/v1/assessment/vocab/pool?limit=10')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Record<string, unknown>[];
      if (body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('word');
        expect(item).toHaveProperty('definition_vi');
      }
    });
  });

  describe('GET /api/v1/learning/my-courses/modules', () => {
    it('trả về mảng rỗng [] theo quy định #12', async () => {
      const res = await http()
        .get('/api/v1/learning/my-courses/modules')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
