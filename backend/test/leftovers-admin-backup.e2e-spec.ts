import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

describe('Admin Backup, Activity Log & Vocab Admin (e2e - T-033)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@admin-backup.test';

  const tokens = { student: '', admin: '' };
  const userIds = { student: '', admin: '' };
  let testBackupCourseId: number;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.adminActivityLog.deleteMany({
      where: { admin: { email: { endsWith: EMAIL_SUFFIX } } },
    });
    await prisma.course.deleteMany({
      where: {
        OR: [
          { title: 'Admin Backup Test Course' },
          { title: 'Test Vocab Course' },
        ],
      },
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

    const student = await userWithToken(`student${EMAIL_SUFFIX}`);
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: admin.id, role: 'admin' },
    });
    await prisma.profile.create({
      data: {
        userId: admin.id,
        fullName: 'Admin Tester',
        email: `admin${EMAIL_SUFFIX}`,
      },
    });

    const course = await prisma.course.create({
      data: {
        title: 'Admin Backup Test Course',
        courseType: 'video_quiz',
      },
    });
    testBackupCourseId = course.id;

    tokens.student = student.token;
    tokens.admin = admin.token;
    userIds.student = student.id;
    userIds.admin = admin.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC bảo mật trên các endpoint Admin Backup', () => {
    it('GET /api/v1/admin/backup/stats: 401 khi không có token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/backup/stats').expect(401);
      await http()
        .get('/api/v1/admin/backup/stats')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/backup/stats: 200 cho admin, trả về đúng 10 số liệu', async () => {
      const res = await http()
        .get('/api/v1/admin/backup/stats')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(res.body).toHaveProperty('courses');
      expect(res.body).toHaveProperty('lessons');
      expect(res.body).toHaveProperty('full_tests');
      expect(res.body).toHaveProperty('questions');
      expect(res.body).toHaveProperty('answers');
      expect(res.body).toHaveProperty('profiles');
      expect(res.body).toHaveProperty('user_full_test_results');
      expect(res.body).toHaveProperty('enrollments');
      expect(res.body).toHaveProperty('vocab_quizzes');
      expect(res.body).toHaveProperty('platform_settings');
    });

    it('GET /api/v1/admin/backup/export-full: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/backup/export-full').expect(401);
      await http()
        .get('/api/v1/admin/backup/export-full')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/backup/export-full: 200 cho admin, trả snapshot snake_case đúng tên cột DB', async () => {
      const res = await http()
        .get('/api/v1/admin/backup/export-full')
        .set(bearer(tokens.admin))
        .expect(200);

      const body = res.body as {
        snapshot: Record<string, Record<string, unknown>[]>;
        counts: Record<string, number>;
      };
      expect(body).toHaveProperty('snapshot');
      expect(body).toHaveProperty('counts');
      expect(typeof body.snapshot).toBe('object');
      expect(typeof body.counts).toBe('object');

      const courses = body.snapshot['courses'];
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBeGreaterThan(0);

      const testCourse = courses.find((c) => c.id === testBackupCourseId);
      expect(testCourse).toBeDefined();
      expect(testCourse).toHaveProperty('course_type');
      expect(testCourse).not.toHaveProperty('courseType');
      expect(testCourse).toHaveProperty('created_at');
    });

    it('GET /api/v1/admin/backup/export-students: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/backup/export-students').expect(401);
      await http()
        .get('/api/v1/admin/backup/export-students')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/backup/export-students: 200 cho admin', async () => {
      const res = await http()
        .get('/api/v1/admin/backup/export-students')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as Record<string, unknown>[];
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('user_id');
        expect(body[0]).toHaveProperty('email');
      }
    });

    it('GET /api/v1/admin/backup/export-test-results: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/backup/export-test-results').expect(401);
      await http()
        .get('/api/v1/admin/backup/export-test-results')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/backup/export-test-results: 200 cho admin', async () => {
      const res = await http()
        .get('/api/v1/admin/backup/export-test-results')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/v1/admin/backup/export-question-bank: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/backup/export-question-bank').expect(401);
      await http()
        .get('/api/v1/admin/backup/export-question-bank')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/backup/export-question-bank: 200 cho admin', async () => {
      const res = await http()
        .get('/api/v1/admin/backup/export-question-bank')
        .set(bearer(tokens.admin))
        .expect(200);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('full_tests');
      expect(body).toHaveProperty('questions');
      expect(body).toHaveProperty('answers');
    });
  });

  describe('Admin Activity Log & Admins List', () => {
    it('POST /api/v1/admin/activity-log: 401 khi không token, 403 khi là student', async () => {
      await http()
        .post('/api/v1/admin/activity-log')
        .send({ action: 'TEST', entity_type: 'BACKUP', entity_id: '1' })
        .expect(401);

      await http()
        .post('/api/v1/admin/activity-log')
        .set(bearer(tokens.student))
        .send({ action: 'TEST', entity_type: 'BACKUP', entity_id: '1' })
        .expect(403);
    });

    it('POST /api/v1/admin/activity-log ghi nhật ký và tự gán admin_id từ token', async () => {
      const res = await http()
        .post('/api/v1/admin/activity-log')
        .set(bearer(tokens.admin))
        .send({
          action: 'TEST_BACKUP',
          entity_type: 'BACKUP',
          entity_id: 'test.json',
          details: { ok: true },
        })
        .expect(201);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty('id');
      expect(body.admin_id).toBe(userIds.admin);
      expect(body.action).toBe('TEST_BACKUP');
    });

    it('GET /api/v1/admin/activity-log: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/activity-log').expect(401);
      await http()
        .get('/api/v1/admin/activity-log')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/activity-log trả về danh sách nhật ký', async () => {
      const res = await http()
        .get('/api/v1/admin/activity-log?limit=10')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const body = res.body as unknown[];
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/admin/users/admins: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/admin/users/admins').expect(401);
      await http()
        .get('/api/v1/admin/users/admins')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/admin/users/admins trả danh sách tài khoản Admin', async () => {
      const res = await http()
        .get('/api/v1/admin/users/admins')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const adminsList = res.body as {
        user_id: string;
        full_name: string | null;
      }[];
      const found = adminsList.find((a) => a.user_id === userIds.admin);
      expect(found).toBeDefined();
      expect(found?.full_name).toBe('Admin Tester');
    });
  });

  describe('Admin Lesson Vocab', () => {
    let testLessonId: number;
    let testQuizId: number;
    let wordId: number;

    beforeAll(async () => {
      // Create a test lesson
      const course = await prisma.course.create({
        data: { title: 'Test Vocab Course', courseType: 'video_quiz' },
      });
      const moduleItem = await prisma.module.create({
        data: { courseId: course.id, title: 'Test Vocab Module' },
      });
      const lesson = await prisma.lesson.create({
        data: { moduleId: moduleItem.id, title: 'Test Vocab Lesson' },
      });
      testLessonId = lesson.id;
    });

    it('GET /api/v1/assessment/admin/vocab/lessons: 401 khi không token, 403 khi là student', async () => {
      await http().get('/api/v1/assessment/admin/vocab/lessons').expect(401);
      await http()
        .get('/api/v1/assessment/admin/vocab/lessons')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/assessment/admin/vocab/lessons lấy danh sách bài học cho admin', async () => {
      const res = await http()
        .get('/api/v1/assessment/admin/vocab/lessons')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const lessonsList = res.body as { id: number }[];
      const found = lessonsList.find((l) => l.id === testLessonId);
      expect(found).toBeDefined();
    });

    it('POST /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz: 401 khi không token, 403 khi là student', async () => {
      await http()
        .post(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .send({ title: 'Từ vựng - Bài 1', display_order: 0 })
        .expect(401);

      await http()
        .post(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .set(bearer(tokens.student))
        .send({ title: 'Từ vựng - Bài 1', display_order: 0 })
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz tạo vocab quiz cho admin', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .set(bearer(tokens.admin))
        .send({ title: 'Từ vựng - Bài 1', display_order: 0 })
        .expect(201);

      const body = res.body as { id: number; lesson_id: number };
      expect(body).toHaveProperty('id');
      expect(body.lesson_id).toBe(testLessonId);
      testQuizId = body.id;
    });

    it('GET /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz: 401 khi không token, 403 khi là student', async () => {
      await http()
        .get(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .expect(401);

      await http()
        .get(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz lấy vocab quiz vừa tạo cho admin', async () => {
      const res = await http()
        .get(`/api/v1/assessment/admin/vocab/lessons/${testLessonId}/quiz`)
        .set(bearer(tokens.admin))
        .expect(200);

      const body = res.body as { id: number } | null;
      expect(body?.id).toBe(testQuizId);
    });

    it('POST /api/v1/assessment/admin/vocab/quizzes/:quizId/words: 401 khi không token, 403 khi là student', async () => {
      await http()
        .post(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .send({ words: [{ word: 'test', definition_vi: 'kiểm tra' }] })
        .expect(401);

      await http()
        .post(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .set(bearer(tokens.student))
        .send({ words: [{ word: 'test', definition_vi: 'kiểm tra' }] })
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/vocab/quizzes/:quizId/words thêm từ vựng hàng loạt cho admin', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .set(bearer(tokens.admin))
        .send({
          words: [
            { word: 'apple', definition_vi: 'quả táo', phonetic: '/ˈæp.əl/' },
            { word: 'banana', definition_vi: 'quả chuối' },
          ],
        })
        .expect(201);

      const body = res.body as { count: number };
      expect(body.count).toBe(2);
    });

    it('GET /api/v1/assessment/admin/vocab/quizzes/:quizId/words: 401 khi không token, 403 khi là student', async () => {
      await http()
        .get(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .expect(401);

      await http()
        .get(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('GET /api/v1/assessment/admin/vocab/quizzes/:quizId/words lấy danh sách từ vựng cho admin', async () => {
      const res = await http()
        .get(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const wordsList = res.body as { id: number; word: string }[];
      expect(wordsList.length).toBe(2);
      wordId = wordsList[0].id;
    });

    it('PUT /api/v1/assessment/admin/vocab/words/:id: 401 khi không token, 403 khi là student', async () => {
      await http()
        .put(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .send({ word: 'forbidden', definition_vi: 'cấm' })
        .expect(401);

      await http()
        .put(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .set(bearer(tokens.student))
        .send({ word: 'forbidden', definition_vi: 'cấm' })
        .expect(403);
    });

    it('PUT /api/v1/assessment/admin/vocab/words/:id cập nhật từ vựng cho admin', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .set(bearer(tokens.admin))
        .send({ word: 'apple-updated', definition_vi: 'quả táo đỏ' })
        .expect(200);

      const body = res.body as { word: string };
      expect(body.word).toBe('apple-updated');
    });

    it('DELETE /api/v1/assessment/admin/vocab/words/:id: 401 khi không token, 403 khi là student', async () => {
      await http()
        .delete(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .expect(401);

      await http()
        .delete(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('DELETE /api/v1/assessment/admin/vocab/words/:id xóa 1 từ vựng cho admin', async () => {
      await http()
        .delete(`/api/v1/assessment/admin/vocab/words/${wordId}`)
        .set(bearer(tokens.admin))
        .expect(204);
    });

    it('POST /api/v1/assessment/admin/vocab/words/bulk-delete: 401 khi không token, 403 khi là student', async () => {
      await http()
        .post('/api/v1/assessment/admin/vocab/words/bulk-delete')
        .send({ ids: [999999] })
        .expect(401);

      await http()
        .post('/api/v1/assessment/admin/vocab/words/bulk-delete')
        .set(bearer(tokens.student))
        .send({ ids: [999999] })
        .expect(403);
    });

    it('POST /api/v1/assessment/admin/vocab/words/bulk-delete xóa nhiều từ vựng cho admin', async () => {
      const wordsRes = await http()
        .get(`/api/v1/assessment/admin/vocab/quizzes/${testQuizId}/words`)
        .set(bearer(tokens.admin));
      const wordsList = wordsRes.body as { id: number }[];
      const remainingIds = wordsList.map((w) => w.id);

      const res = await http()
        .post('/api/v1/assessment/admin/vocab/words/bulk-delete')
        .set(bearer(tokens.admin))
        .send({ ids: remainingIds })
        .expect(200);

      const body = res.body as { count: number };
      expect(body.count).toBe(remainingIds.length);
    });
  });
});
