import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

describe('Assessment Leaderboard & Stats Overview (e2e - T-033)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@leaderboard-test.com';

  const http = () => request(app.getHttpServer());

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

  describe('GET /api/v1/assessment/leaderboard/study-time', () => {
    it('trả về tổng thời gian học cộng dồn theo user_id sắp xếp giảm dần', async () => {
      // Create 2 test users with results
      const u1 = await prisma.user.create({
        data: { email: `u1${EMAIL_SUFFIX}` },
      });
      const u2 = await prisma.user.create({
        data: { email: `u2${EMAIL_SUFFIX}` },
      });

      // Create a full test
      const ft = await prisma.fullTest.create({
        data: {
          title: 'Leaderboard Test Full',
          totalQuestions: 200,
        },
      });

      // User 1: 500s from full test
      await prisma.userFullTestResult.create({
        data: {
          userId: u1.id,
          testId: ft.id,
          timeSpentSeconds: 500,
          totalScore: 700,
        },
      });

      // User 2: 1200s from full test
      await prisma.userFullTestResult.create({
        data: {
          userId: u2.id,
          testId: ft.id,
          timeSpentSeconds: 1200,
          totalScore: 850,
        },
      });

      const res = await http()
        .get('/api/v1/assessment/leaderboard/study-time')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const items = res.body as {
        user_id: string;
        total_seconds: number;
      }[];
      expect(items.length).toBeGreaterThanOrEqual(2);

      // Verify privacy: items only contain user_id and total_seconds
      const sample = items[0] as Record<string, unknown>;
      expect(sample).toHaveProperty('user_id');
      expect(sample).toHaveProperty('total_seconds');
      expect(sample.score).toBeUndefined();
      expect(sample.answersDetail).toBeUndefined();

      // Find u1 and u2
      const u2Item = items.find((i) => i.user_id === u2.id);
      const u1Item = items.find((i) => i.user_id === u1.id);
      expect(u2Item?.total_seconds).toBe(1200);
      expect(u1Item?.total_seconds).toBe(500);

      // Check sorting: u2 before u1
      const u2Idx = items.findIndex((i) => i.user_id === u2.id);
      const u1Idx = items.findIndex((i) => i.user_id === u1.id);
      expect(u2Idx).toBeLessThan(u1Idx);

      // Cleanup full test
      await prisma.fullTest.delete({ where: { id: ft.id } });
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
