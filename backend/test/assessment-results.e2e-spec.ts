import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { QuizResultWithQuizDto } from '../src/modules/assessment/dto';

/**
 * E2E cho T-011 (ASM-006 đọc danh sách kết quả quiz, ADM-003 admin đọc kết quả học viên):
 * - RLS "Users view own results": GET /assessment/results/me chỉ trả kết quả của user trong token.
 * - RLS "Admins view all results": GET /assessment/admin/users/:userId/results chỉ cho admin.
 * - Sắp xếp completed_at desc nulls last, rồi id desc; join quizzes -> modules -> courses.
 */
describe('AssessmentModule — results lists (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@assessment-results.test';

  const tokens = { a: '', b: '', admin: '' };
  const userIds = { a: '', b: '' };
  let quizWithModuleId = 0;
  let quizWithoutModuleId = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-assessment-results]' } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { startsWith: '[e2e-assessment-results]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
  }

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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const uA = await userWithToken(`a${EMAIL_SUFFIX}`);
    const uB = await userWithToken(`b${EMAIL_SUFFIX}`);
    const uAdmin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: uAdmin.id, role: 'admin' },
    });
    userIds.a = uA.id;
    userIds.b = uB.id;
    tokens.a = uA.token;
    tokens.b = uB.token;
    tokens.admin = uAdmin.token;

    const course = await prisma.course.create({
      data: {
        title: '[e2e-assessment-results] Khóa TOEIC',
        courseType: 'video_quiz',
      },
    });
    const mod = await prisma.module.create({
      data: {
        courseId: course.id,
        title: '[e2e-assessment-results] Chương 1',
        displayOrder: 0,
      },
    });
    const quiz1 = await prisma.quiz.create({
      data: {
        moduleId: mod.id,
        title: '[e2e-assessment-results] Quiz có module',
        audioUrl: 'https://cdn.example.com/q1.mp3',
        totalQuestions: 10,
      },
    });
    quizWithModuleId = quiz1.id;

    const quiz2 = await prisma.quiz.create({
      data: {
        moduleId: null,
        title: '[e2e-assessment-results] Quiz không module',
        totalQuestions: 5,
      },
    });
    quizWithoutModuleId = quiz2.id;

    // Tạo kết quả cho user A: 1 bản ghi cũ, 1 bản ghi mới, 1 bản ghi completedAt = null
    await prisma.userQuizResult.create({
      data: {
        userId: userIds.a,
        quizId: quizWithoutModuleId,
        score: 6.0,
        correctAnswers: 3,
        totalQuestions: 5,
        timeSpentSeconds: 50,
        completedAt: new Date('2026-10-28T08:00:00.000Z'),
      },
    });
    await prisma.userQuizResult.create({
      data: {
        userId: userIds.a,
        quizId: quizWithModuleId,
        score: 8.5,
        correctAnswers: 8,
        totalQuestions: 10,
        timeSpentSeconds: 120,
        completedAt: new Date('2026-10-28T10:00:00.000Z'),
      },
    });
    await prisma.userQuizResult.create({
      data: {
        userId: userIds.a,
        quizId: quizWithoutModuleId,
        score: 4.0,
        correctAnswers: 2,
        totalQuestions: 5,
        timeSpentSeconds: 30,
        completedAt: null,
      },
    });

    // Tạo kết quả cho user B
    await prisma.userQuizResult.create({
      data: {
        userId: userIds.b,
        quizId: quizWithModuleId,
        score: 9.0,
        correctAnswers: 9,
        totalQuestions: 10,
        timeSpentSeconds: 90,
        completedAt: new Date('2026-10-28T11:00:00.000Z'),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('GET /api/v1/assessment/results/me', () => {
    it('không token → 401', async () => {
      await http().get('/api/v1/assessment/results/me').expect(401);
    });

    it('chỉ trả kết quả của chính mình (A không thấy kết quả của B), sắp completed_at desc nulls last, score là number, join đúng quizzes/modules/courses', async () => {
      const res = await http()
        .get('/api/v1/assessment/results/me')
        .set(bearer(tokens.a))
        .expect(200);

      const rows = res.body as QuizResultWithQuizDto[];
      expect(rows).toHaveLength(3);
      expect(rows.every((r) => r.user_id === userIds.a)).toBe(true);

      // Thứ tự: 10:00 -> 08:00 -> null
      expect(rows.map((r) => r.completed_at)).toEqual([
        '2026-10-28T10:00:00.000Z',
        '2026-10-28T08:00:00.000Z',
        null,
      ]);

      // score là number
      expect(typeof rows[0].score).toBe('number');
      expect(rows[0].score).toBe(8.5);

      // Quiz có module -> quizzes.modules.courses.title đúng
      expect(rows[0].quizzes).toEqual({
        id: quizWithModuleId,
        title: '[e2e-assessment-results] Quiz có module',
        audio_url: 'https://cdn.example.com/q1.mp3',
        total_questions: 10,
        module_id: expect.any(Number) as number,
        modules: {
          id: expect.any(Number) as number,
          title: '[e2e-assessment-results] Chương 1',
          courses: {
            id: expect.any(Number) as number,
            title: '[e2e-assessment-results] Khóa TOEIC',
          },
        },
      });

      // Quiz không module -> quizzes.modules = null
      expect(rows[1].quizzes).toEqual({
        id: quizWithoutModuleId,
        title: '[e2e-assessment-results] Quiz không module',
        audio_url: null,
        total_questions: 5,
        module_id: null,
        modules: null,
      });
    });
  });

  describe('GET /api/v1/assessment/admin/users/:userId/results', () => {
    it('không token → 401; học viên (student) → 403', async () => {
      await http()
        .get(`/api/v1/assessment/admin/users/${userIds.b}/results`)
        .expect(401);

      await http()
        .get(`/api/v1/assessment/admin/users/${userIds.b}/results`)
        .set(bearer(tokens.a))
        .expect(403);
    });

    it('userId không phải UUID → 400', async () => {
      await http()
        .get('/api/v1/assessment/admin/users/not-a-uuid/results')
        .set(bearer(tokens.admin))
        .expect(400);
    });

    it('admin đọc được kết quả của user B kèm quizzes.title', async () => {
      const res = await http()
        .get(`/api/v1/assessment/admin/users/${userIds.b}/results`)
        .set(bearer(tokens.admin))
        .expect(200);

      const rows = res.body as QuizResultWithQuizDto[];
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        user_id: userIds.b,
        quiz_id: quizWithModuleId,
        score: 9,
        quizzes: {
          id: quizWithModuleId,
          title: '[e2e-assessment-results] Quiz có module',
        },
      });
    });
  });
});
