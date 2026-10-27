import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { ErrorResponseBody } from '../src/common/filters/all-exceptions.filter';
import type {
  FavoriteDto,
  LessonProgressDto,
  NoteDto,
  PracticeDto,
} from '../src/modules/learning/dto';

describe('LearningModule — tiến độ, yêu thích, ghi chú, popup luyện tập (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let tokenUserA = '';
  let userAId = '';
  let userBId = '';

  const lessonIds: number[] = [];
  let testQuizId = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.userLessonProgress.deleteMany();
    await prisma.userFavorite.deleteMany();
    await prisma.userNote.deleteMany();
    await prisma.lessonPractice.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.module.deleteMany();
    await prisma.course.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@userdata.test' } },
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

    // Tạo course & module
    const course = await prisma.course.create({
      data: { title: 'Khóa học test T-006', courseType: 'video_quiz' },
    });
    const module = await prisma.module.create({
      data: { courseId: course.id, title: 'Module 1', displayOrder: 1 },
    });

    // Tạo 6 lessons
    for (let i = 1; i <= 6; i++) {
      const l = await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: `Bài học ${i}`,
          displayOrder: i,
          isPublished: true,
        },
      });
      lessonIds.push(l.id);
    }

    // Tạo quiz
    const quiz = await prisma.quiz.create({
      data: {
        moduleId: module.id,
        title: 'Quiz popup luyện tập',
        totalQuestions: 3,
      },
    });
    testQuizId = quiz.id;

    // Tạo 2 user
    const userA = await userWithToken('userA@userdata.test');
    const userB = await prisma.user.create({
      data: { email: 'userB@userdata.test', emailVerifiedAt: new Date() },
    });
    userAId = userA.id;
    userBId = userB.id;
    tokenUserA = userA.token;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('Xác thực (JWT guards & Public route)', () => {
    it('route JWT không token → 401', async () => {
      await http().get('/api/v1/learning/progress').expect(401);
      await http()
        .put(`/api/v1/learning/lessons/${lessonIds[0]}/progress`)
        .send({ is_completed: true })
        .expect(401);
      await http().get('/api/v1/learning/favorites').expect(401);
      await http()
        .put(`/api/v1/learning/lessons/${lessonIds[0]}/favorite`)
        .expect(401);
      await http()
        .delete(`/api/v1/learning/lessons/${lessonIds[0]}/favorite`)
        .expect(401);
      await http()
        .get(`/api/v1/learning/lessons/${lessonIds[0]}/notes`)
        .expect(401);
      await http()
        .post(`/api/v1/learning/lessons/${lessonIds[0]}/notes`)
        .send({ content: 'Test' })
        .expect(401);
    });

    it('practices không token → 200 (đọc công khai)', async () => {
      const res = await http()
        .get(`/api/v1/learning/lessons/${lessonIds[0]}/practices`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Bài học không tồn tại (404 LESSON_NOT_FOUND vs 200 [])', () => {
    const invalidId = 999999;

    it('PUT progress khi lessonId không tồn tại → 404 LESSON_NOT_FOUND', async () => {
      const res = await http()
        .put(`/api/v1/learning/lessons/${invalidId}/progress`)
        .set(bearer(tokenUserA))
        .send({ is_completed: true })
        .expect(404);
      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('LESSON_NOT_FOUND');
    });

    it('PUT favorite khi lessonId không tồn tại → 404 LESSON_NOT_FOUND', async () => {
      const res = await http()
        .put(`/api/v1/learning/lessons/${invalidId}/favorite`)
        .set(bearer(tokenUserA))
        .expect(404);
      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('LESSON_NOT_FOUND');
    });

    it('POST notes khi lessonId không tồn tại → 404 LESSON_NOT_FOUND', async () => {
      const res = await http()
        .post(`/api/v1/learning/lessons/${invalidId}/notes`)
        .set(bearer(tokenUserA))
        .send({ content: 'Ghi chú cho bài không tồn tại' })
        .expect(404);
      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('LESSON_NOT_FOUND');
    });

    it('GET notes theo bài không tồn tại → []', async () => {
      const res = await http()
        .get(`/api/v1/learning/lessons/${invalidId}/notes`)
        .set(bearer(tokenUserA))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('GET practices theo bài không tồn tại → []', async () => {
      const res = await http()
        .get(`/api/v1/learning/lessons/${invalidId}/practices`)
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('Tiến độ bài học (Progress)', () => {
    it('PUT progress 2 lần cùng bài → 1 dòng duy nhất, is_completed theo lần cuối', async () => {
      const lessonId = lessonIds[0];

      // Lần 1: hoàn thành
      const res1 = await http()
        .put(`/api/v1/learning/lessons/${lessonId}/progress`)
        .set(bearer(tokenUserA))
        .send({ is_completed: true })
        .expect(200);
      const data1 = res1.body as LessonProgressDto;
      expect(data1.lesson_id).toBe(lessonId);
      expect(data1.is_completed).toBe(true);
      expect(data1.user_id).toBe(userAId);

      // Cập nhật thủ công watchDurationSeconds trong DB để kiểm tra update không ghi đè
      await prisma.userLessonProgress.update({
        where: { id: data1.id },
        data: { watchDurationSeconds: 150 },
      });

      // Lần 2: chưa hoàn thành
      const res2 = await http()
        .put(`/api/v1/learning/lessons/${lessonId}/progress`)
        .set(bearer(tokenUserA))
        .send({ is_completed: false })
        .expect(200);
      const data2 = res2.body as LessonProgressDto;
      expect(data2.id).toBe(data1.id);
      expect(data2.is_completed).toBe(false);
      // watch_duration_seconds không bị đổi khi update
      expect(data2.watch_duration_seconds).toBe(150);

      // Kiểm tra DB chỉ có đúng 1 bản ghi
      const count = await prisma.userLessonProgress.count({
        where: { userId: userAId, lessonId },
      });
      expect(count).toBe(1);
    });

    it('GET /progress sắp last_watched_at desc nulls last, id desc', async () => {
      // Dọn progress của user A
      await prisma.userLessonProgress.deleteMany({
        where: { userId: userAId },
      });

      // Seed 5 bản ghi với các giá trị lastWatchedAt khác nhau:
      // p1: lessonIds[0], lastWatchedAt: 2026-01-01T00:00:00Z
      // p2: lessonIds[1], lastWatchedAt: 2026-01-05T00:00:00Z
      // p3: lessonIds[2], lastWatchedAt: null
      // p4: lessonIds[3], lastWatchedAt: null
      // p5: lessonIds[4], lastWatchedAt: 2026-01-05T00:00:00Z (cùng ngày p2 nhưng tạo sau → id lớn hơn)
      const p1 = await prisma.userLessonProgress.create({
        data: {
          userId: userAId,
          lessonId: lessonIds[0],
          isCompleted: true,
          lastWatchedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
      const p2 = await prisma.userLessonProgress.create({
        data: {
          userId: userAId,
          lessonId: lessonIds[1],
          isCompleted: true,
          lastWatchedAt: new Date('2026-01-05T00:00:00.000Z'),
        },
      });
      const p3 = await prisma.userLessonProgress.create({
        data: {
          userId: userAId,
          lessonId: lessonIds[2],
          isCompleted: false,
          lastWatchedAt: null,
        },
      });
      const p4 = await prisma.userLessonProgress.create({
        data: {
          userId: userAId,
          lessonId: lessonIds[3],
          isCompleted: false,
          lastWatchedAt: null,
        },
      });
      const p5 = await prisma.userLessonProgress.create({
        data: {
          userId: userAId,
          lessonId: lessonIds[4],
          isCompleted: true,
          lastWatchedAt: new Date('2026-01-05T00:00:00.000Z'),
        },
      });

      const res = await http()
        .get('/api/v1/learning/progress')
        .set(bearer(tokenUserA))
        .expect(200);

      const items = res.body as LessonProgressDto[];
      const returnedIds = items.map((i) => i.id);

      // Kỳ vọng:
      // - Ngày 2026-01-05 (p5 và p2): p5 tạo sau nên id > p2 → p5 trước, p2 sau
      // - Ngày 2026-01-01 (p1) đứng tiếp theo
      // - null đứng cuối (nulls last): p4 tạo sau p3 nên id > p3 → p4 trước, p3 sau
      expect(returnedIds).toEqual([p5.id, p2.id, p1.id, p4.id, p3.id]);
    });
  });

  describe('Yêu thích (Favorites)', () => {
    it('PUT favorite 2 lần → 1 dòng duy nhất (idempotent, 200)', async () => {
      const lessonId = lessonIds[1];

      const res1 = await http()
        .put(`/api/v1/learning/lessons/${lessonId}/favorite`)
        .set(bearer(tokenUserA))
        .expect(200);
      const data1 = res1.body as FavoriteDto;
      expect(data1.lesson_id).toBe(lessonId);

      const res2 = await http()
        .put(`/api/v1/learning/lessons/${lessonId}/favorite`)
        .set(bearer(tokenUserA))
        .expect(200);
      const data2 = res2.body as FavoriteDto;
      expect(data2.id).toBe(data1.id);

      const count = await prisma.userFavorite.count({
        where: { userId: userAId, lessonId },
      });
      expect(count).toBe(1);
    });

    it('GET /favorites sắp xếp theo id asc', async () => {
      // User A thích thêm lessonIds[2]
      await http()
        .put(`/api/v1/learning/lessons/${lessonIds[2]}/favorite`)
        .set(bearer(tokenUserA))
        .expect(200);

      const res = await http()
        .get('/api/v1/learning/favorites')
        .set(bearer(tokenUserA))
        .expect(200);

      const list = res.body as FavoriteDto[];
      expect(list.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].id).toBeGreaterThan(list[i - 1].id);
      }
    });

    it('DELETE favorite xóa bài và DELETE khi chưa có vẫn trả về 204', async () => {
      const lessonId = lessonIds[1];

      // Xóa lần 1
      await http()
        .delete(`/api/v1/learning/lessons/${lessonId}/favorite`)
        .set(bearer(tokenUserA))
        .expect(204);

      // Kiểm tra DB đã bị xóa
      const count = await prisma.userFavorite.count({
        where: { userId: userAId, lessonId },
      });
      expect(count).toBe(0);

      // Xóa lần 2 (khi không còn trong DB) → vẫn 204
      await http()
        .delete(`/api/v1/learning/lessons/${lessonId}/favorite`)
        .set(bearer(tokenUserA))
        .expect(204);
    });
  });

  describe('Ghi chú (Notes)', () => {
    it('note "   " chỉ có khoảng trắng → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .post(`/api/v1/learning/lessons/${lessonIds[0]}/notes`)
        .set(bearer(tokenUserA))
        .send({ content: '     ' })
        .expect(400);

      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('VALIDATION_FAILED');
    });

    it('note "  abc  " lưu "abc" (đã trim)', async () => {
      const res = await http()
        .post(`/api/v1/learning/lessons/${lessonIds[0]}/notes`)
        .set(bearer(tokenUserA))
        .send({ content: '   Nội dung cần nhớ   ' })
        .expect(201);

      const note = res.body as NoteDto;
      expect(note.content).toBe('Nội dung cần nhớ');
      expect(note.lesson_id).toBe(lessonIds[0]);
      expect(note.user_id).toBe(userAId);
    });

    it('GET notes trả về danh sách sắp created_at desc, id desc', async () => {
      const lessonId = lessonIds[2];
      const n1 = await prisma.userNote.create({
        data: {
          userId: userAId,
          lessonId,
          content: 'Ghi chú 1',
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
        },
      });
      const n2 = await prisma.userNote.create({
        data: {
          userId: userAId,
          lessonId,
          content: 'Ghi chú 2',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
      });
      const n3 = await prisma.userNote.create({
        data: {
          userId: userAId,
          lessonId,
          content: 'Ghi chú 3',
          createdAt: new Date('2026-01-02T10:00:00.000Z'),
        },
      });

      const res = await http()
        .get(`/api/v1/learning/lessons/${lessonId}/notes`)
        .set(bearer(tokenUserA))
        .expect(200);

      const items = res.body as NoteDto[];
      const ids = items.map((i) => i.id);
      // n3 và n2 cùng ngày 2026-01-02, n3 tạo sau nên id desc n3 trước n2, rồi đến n1
      expect(ids).toEqual([n3.id, n2.id, n1.id]);
    });
  });

  describe('Popup luyện tập (Practices)', () => {
    it('practices có quizzes lồng đúng, quiz_id = null → quizzes: null', async () => {
      const lessonId = lessonIds[3];

      // Tạo practice có quiz
      await prisma.lessonPractice.create({
        data: {
          lessonId,
          quizId: testQuizId,
          triggerAtSeconds: 30,
          title: 'Practice 1',
          displayOrder: 1,
        },
      });

      // Tạo practice không có quiz (quizId = null)
      await prisma.lessonPractice.create({
        data: {
          lessonId,
          quizId: null,
          triggerAtSeconds: 120,
          title: 'Practice 2',
          displayOrder: 2,
        },
      });

      const res = await http()
        .get(`/api/v1/learning/lessons/${lessonId}/practices`)
        .expect(200);

      const items = res.body as PracticeDto[];
      expect(items).toHaveLength(2);
      expect(items[0].trigger_at_seconds).toBe(30);
      expect(items[0].quiz_id).toBe(testQuizId);
      expect(items[0].quizzes).toEqual({
        id: testQuizId,
        title: 'Quiz popup luyện tập',
        total_questions: 3,
      });

      expect(items[1].trigger_at_seconds).toBe(120);
      expect(items[1].quiz_id).toBeNull();
      expect(items[1].quizzes).toBeNull();
    });
  });

  describe('Phân quyền / Độc lập dữ liệu người dùng (Tenant isolation: User A vs User B)', () => {
    it('User A không đọc, sửa hoặc xóa được dữ liệu của User B', async () => {
      const targetLesson = lessonIds[4];

      // Seed dữ liệu cho User B:
      // 1. Tiến độ hoàn thành = true
      await prisma.userLessonProgress.create({
        data: {
          userId: userBId,
          lessonId: targetLesson,
          isCompleted: true,
          lastWatchedAt: new Date(),
        },
      });

      // 2. Yêu thích bài học
      await prisma.userFavorite.create({
        data: {
          userId: userBId,
          lessonId: targetLesson,
        },
      });

      // 3. Ghi chú của B
      await prisma.userNote.create({
        data: {
          userId: userBId,
          lessonId: targetLesson,
          content: 'Ghi chú bí mật của User B',
        },
      });

      // User A gọi GET /progress → không thấy bản ghi của B
      const progressRes = await http()
        .get('/api/v1/learning/progress')
        .set(bearer(tokenUserA))
        .expect(200);
      const progresses = progressRes.body as LessonProgressDto[];
      expect(progresses.some((p) => p.user_id === userBId)).toBe(false);

      // User A gọi PUT /progress cho targetLesson → tạo bản ghi cho A, không ảnh hưởng B
      await http()
        .put(`/api/v1/learning/lessons/${targetLesson}/progress`)
        .set(bearer(tokenUserA))
        .send({ is_completed: false })
        .expect(200);

      const progressB = await prisma.userLessonProgress.findUnique({
        where: { userId_lessonId: { userId: userBId, lessonId: targetLesson } },
      });
      expect(progressB?.isCompleted).toBe(true); // Vẫn giữ nguyên true của B

      // User A gọi GET /favorites → không thấy yêu thích của B
      const favRes = await http()
        .get('/api/v1/learning/favorites')
        .set(bearer(tokenUserA))
        .expect(200);
      const favs = favRes.body as FavoriteDto[];
      expect(favs.some((f) => f.user_id === userBId)).toBe(false);

      // User A gọi DELETE /favorite → không xóa yêu thích của B
      await http()
        .delete(`/api/v1/learning/lessons/${targetLesson}/favorite`)
        .set(bearer(tokenUserA))
        .expect(204);

      const favB = await prisma.userFavorite.findUnique({
        where: { userId_lessonId: { userId: userBId, lessonId: targetLesson } },
      });
      expect(favB).not.toBeNull(); // Vẫn còn nguyên

      // User A gọi GET /notes → không thấy ghi chú của B
      const noteRes = await http()
        .get(`/api/v1/learning/lessons/${targetLesson}/notes`)
        .set(bearer(tokenUserA))
        .expect(200);
      const notes = noteRes.body as NoteDto[];
      expect(notes.some((n) => n.content.includes('User B'))).toBe(false);
    });
  });
});
