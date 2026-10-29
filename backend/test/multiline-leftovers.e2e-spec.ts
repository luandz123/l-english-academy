import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

describe('Multiline Leftovers E2E (T-035)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@multiline-leftovers.test';

  const tokens = { student: '', admin: '' };
  let studentUserId: string;
  let testCourseId: number;
  let testEnrollmentId: number;
  let createdFullTestId: number;

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
    const tests = await prisma.fullTest.findMany({
      where: { title: { contains: 'TOEIC E2E Test' } },
      include: { fullTestSections: true },
    });
    for (const t of tests) {
      const qIds = t.fullTestSections
        .map((s) => s.quizId)
        .filter(Boolean) as number[];
      await prisma.fullTest.delete({ where: { id: t.id } }).catch(() => null);
      if (qIds.length > 0) {
        await prisma.quiz
          .deleteMany({ where: { id: { in: qIds } } })
          .catch(() => null);
      }
    }

    const users = await prisma.user.findMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await prisma.enrollment
        .deleteMany({ where: { userId: { in: userIds } } })
        .catch(() => null);
      await prisma.userRole
        .deleteMany({ where: { userId: { in: userIds } } })
        .catch(() => null);
      await prisma.user
        .deleteMany({ where: { id: { in: userIds } } })
        .catch(() => null);
    }

    await prisma.course
      .deleteMany({ where: { title: { startsWith: 'Khóa Multiline Test' } } })
      .catch(() => null);
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

    const student = await userWithToken(`student${EMAIL_SUFFIX}`);
    studentUserId = student.id;
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: admin.id, role: 'admin' },
    });

    tokens.student = student.token;
    tokens.admin = admin.token;

    // Seed test course and enrollment
    const course = await prisma.course.create({
      data: {
        title: `Khóa Multiline Test ${Date.now()}`,
        courseType: 'fulltest',
      },
    });
    testCourseId = course.id;

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: studentUserId,
        courseId: testCourseId,
        enrolledAt: new Date(),
      },
    });
    testEnrollmentId = enrollment.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('GET /learning/my-enrollments (T-035)', () => {
    it('401 khi không gửi token', async () => {
      await http().get('/api/v1/learning/my-enrollments').expect(401);
    });

    it('200 học viên lấy danh sách ghi danh của chính mình kèm courses', async () => {
      const res = await http()
        .get('/api/v1/learning/my-enrollments')
        .set(bearer(tokens.student))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const myEnr = (res.body as Array<Record<string, unknown>>).find(
        (e) => e.id === testEnrollmentId,
      );
      expect(myEnr).toBeDefined();
      expect(myEnr?.user_id).toBe(studentUserId);
      expect(myEnr?.course_id).toBe(testCourseId);
      expect(myEnr?.courses).toMatchObject({
        id: testCourseId,
        course_type: 'fulltest',
      });
    });
  });

  describe('Admin Full Tests - GET /assessment/admin/full-tests (T-035)', () => {
    it('401 khi không token', async () => {
      await http().get('/api/v1/assessment/admin/full-tests').expect(401);
    });

    it('403 khi là học viên', async () => {
      await http()
        .get('/api/v1/assessment/admin/full-tests')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('200 admin xem danh sách đề thi kèm courses và sections', async () => {
      const res = await http()
        .get('/api/v1/assessment/admin/full-tests')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Admin Full Tests - POST /assessment/admin/full-tests (T-035)', () => {
    it('401 khi không token', async () => {
      await http()
        .post('/api/v1/assessment/admin/full-tests')
        .send({})
        .expect(401);
    });

    it('403 khi là học viên', async () => {
      await http()
        .post('/api/v1/assessment/admin/full-tests')
        .set(bearer(tokens.student))
        .send({
          title: 'Đề thi mới',
          course_id: testCourseId,
        })
        .expect(403);
    });

    it('201 admin tạo đề thi tự động tạo 7 quizzes và 7 sections trong 1 transaction', async () => {
      const res = await http()
        .post('/api/v1/assessment/admin/full-tests')
        .set(bearer(tokens.admin))
        .send({
          title: 'Đề thi TOEIC E2E Test',
          course_id: testCourseId,
          description: 'Mô tả đề thi E2E',
          category: '2026',
        })
        .expect(201);

      const body = res.body as { id: number; title: string; course_id: number };
      createdFullTestId = body.id;
      expect(body.id).toBeGreaterThan(0);
      expect(body.title).toBe('Đề thi TOEIC E2E Test');
      expect(body.course_id).toBe(testCourseId);

      // Verify DB created exactly 7 sections and 7 quizzes
      const sections = await prisma.fullTestSection.findMany({
        where: { testId: createdFullTestId },
        include: { quiz: true },
        orderBy: { partNumber: 'asc' },
      });
      expect(sections).toHaveLength(7);
      expect(sections[0].partNumber).toBe(1);
      expect(sections[0].quiz?.title).toBe('Part 1 - Đề thi TOEIC E2E Test');
      expect(sections[6].partNumber).toBe(7);
      expect(sections[6].quiz?.title).toBe('Part 7 - Đề thi TOEIC E2E Test');
    });
  });

  describe('Admin Full Tests - PUT /assessment/admin/full-tests/:testId (T-035)', () => {
    it('401 khi không token', async () => {
      await http()
        .put('/api/v1/assessment/admin/full-tests/1')
        .send({ title: 'Cập nhật' })
        .expect(401);
    });

    it('403 khi là học viên', async () => {
      await http()
        .put('/api/v1/assessment/admin/full-tests/1')
        .set(bearer(tokens.student))
        .send({ title: 'Cập nhật' })
        .expect(403);
    });

    it('200 admin cập nhật thông tin đề thi', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/full-tests/${createdFullTestId}`)
        .set(bearer(tokens.admin))
        .send({
          title: 'Đề thi TOEIC E2E Test (Đã sửa)',
          display_order: 5,
          total_questions: 200,
        })
        .expect(200);

      const body = res.body as {
        id: number;
        title: string;
        display_order: number;
      };
      expect(body.title).toBe('Đề thi TOEIC E2E Test (Đã sửa)');
      expect(body.display_order).toBe(5);
    });
  });

  describe('Admin Vocab Search - GET /assessment/admin/vocab/search (T-035)', () => {
    it('401 khi không token', async () => {
      await http().get('/api/v1/assessment/admin/vocab/search').expect(401);
    });

    it('403 khi là học viên', async () => {
      await http()
        .get('/api/v1/assessment/admin/vocab/search')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('200 admin tìm kiếm từ vựng', async () => {
      const res = await http()
        .get('/api/v1/assessment/admin/vocab/search?q=test')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect((res.body as unknown[]).length).toBeLessThanOrEqual(60);
    });
  });
});
