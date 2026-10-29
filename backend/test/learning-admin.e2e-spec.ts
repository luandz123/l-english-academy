import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import type { ErrorResponseBody } from '../src/common/filters/all-exceptions.filter';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  AdminEnrollmentDto,
  AdminEnrollmentListDto,
  CourseEnrollmentDto,
  CurriculumModuleDto,
  LessonDto,
  PracticeDto,
} from '../src/modules/learning/dto';
import { LearningAdminService } from '../src/modules/learning/learning-admin.service';
import { LearningRepository } from '../src/modules/learning/learning.repository';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

interface RbacRouteCase {
  name: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: () => string;
  body?: () => Record<string, unknown>;
  expectedAdminStatus: number;
}

describe('LearningModule — Admin quản lý bài học, luyện tập, ghi danh (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken = '';
  let studentToken = '';
  let studentId = '';
  let rbacStudentId = '';

  let courseId = 0;
  let rbacCourseId = 0;
  let emptyModuleId = 0;
  let otherModuleId = 0;
  let rbacModuleId = 0;

  let rbacLessonUpdateId = 0;
  let rbacLessonDeleteId = 0;
  let rbacPracticeUpdateId = 0;
  let rbacPracticeDeleteId = 0;
  let rbacEnrollmentDeleteId = 0;

  let existingQuizId = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  const SEEDED_COURSE_TITLES = [
    'Khóa học TOEIC Admin Test',
    'Khóa học RBAC',
    'Khóa học khác không lẫn',
    'Khóa học trống',
  ];

  async function cleanup(): Promise<void> {
    const seededCourses = await prisma.course.findMany({
      where: { title: { in: SEEDED_COURSE_TITLES } },
      select: { id: true },
    });
    const cIds = seededCourses.map((c) => c.id);

    if (cIds.length > 0) {
      await prisma.material.deleteMany({
        where: { courseId: { in: cIds } },
      });
      await prisma.quiz.deleteMany({
        where: { module: { courseId: { in: cIds } } },
      });
      await prisma.course.deleteMany({
        where: { id: { in: cIds } },
      });
    }

    await prisma.userRole.deleteMany({
      where: { user: { email: { endsWith: '@learning-admin.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@learning-admin.test' } },
    });
  }

  async function createUserWithRole(
    email: string,
    role: AppRole,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        roles: { create: { role } },
      },
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

    const admin = await createUserWithRole(
      'admin@learning-admin.test',
      AppRole.admin,
    );
    const student = await createUserWithRole(
      'student@learning-admin.test',
      AppRole.student,
    );
    const rbacStudent = await createUserWithRole(
      'rbac-student@learning-admin.test',
      AppRole.student,
    );

    adminToken = admin.token;
    studentToken = student.token;
    studentId = student.id;
    rbacStudentId = rbacStudent.id;

    // Seed courses & modules
    const course = await prisma.course.create({
      data: {
        title: 'Khóa học TOEIC Admin Test',
        courseType: 'video_quiz',
        isFree: false,
      },
    });
    courseId = course.id;

    const rbacCourse = await prisma.course.create({
      data: {
        title: 'Khóa học RBAC',
        courseType: 'video_quiz',
        isFree: false,
      },
    });
    rbacCourseId = rbacCourse.id;

    const modEmpty = await prisma.module.create({
      data: {
        courseId: course.id,
        title: 'Chương 1 (Rỗng)',
        displayOrder: 0,
        isFree: false,
        isPublished: true,
      },
    });
    emptyModuleId = modEmpty.id;

    const modOther = await prisma.module.create({
      data: {
        courseId: course.id,
        title: 'Chương 2 (Khác)',
        displayOrder: 1,
        isFree: false,
        isPublished: true,
      },
    });
    otherModuleId = modOther.id;

    const modRbac = await prisma.module.create({
      data: {
        courseId: rbacCourse.id,
        title: 'Chương RBAC',
        displayOrder: 0,
        isFree: false,
        isPublished: true,
      },
    });
    rbacModuleId = modRbac.id;

    // Seed fixtures cho bảng RBAC 11 routes
    const lUpdate = await prisma.lesson.create({
      data: {
        moduleId: rbacModuleId,
        title: 'Bài RBAC Update',
        displayOrder: 0,
      },
    });
    rbacLessonUpdateId = lUpdate.id;

    const lDelete = await prisma.lesson.create({
      data: {
        moduleId: rbacModuleId,
        title: 'Bài RBAC Delete',
        displayOrder: 1,
      },
    });
    rbacLessonDeleteId = lDelete.id;

    const pUpdate = await prisma.lessonPractice.create({
      data: {
        lessonId: rbacLessonUpdateId,
        title: 'Practice RBAC Update',
        triggerAtSeconds: 10,
        displayOrder: 0,
      },
    });
    rbacPracticeUpdateId = pUpdate.id;

    const pDelete = await prisma.lessonPractice.create({
      data: {
        lessonId: rbacLessonUpdateId,
        title: 'Practice RBAC Delete',
        triggerAtSeconds: 20,
        displayOrder: 1,
      },
    });
    rbacPracticeDeleteId = pDelete.id;

    const eDelete = await prisma.enrollment.create({
      data: {
        userId: rbacStudentId,
        courseId: course.id,
      },
    });
    rbacEnrollmentDeleteId = eDelete.id;

    const q = await prisma.quiz.create({
      data: {
        moduleId: otherModuleId,
        title: 'Quiz có sẵn',
        totalQuestions: 5,
        displayOrder: 0,
      },
    });
    existingQuizId = q.id;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('Phân quyền các route admin (không token 401, học viên 403, admin 2xx)', () => {
    const rbacRoutes: RbacRouteCase[] = [
      {
        name: 'POST /modules/:moduleId/lessons',
        method: 'post',
        path: () => `/api/v1/learning/admin/modules/${rbacModuleId}/lessons`,
        body: () => ({
          title: 'Bài mới RBAC',
          lesson_type: 'video',
          video_url: 'https://cdn.example.com/rbac.mp4',
          duration_seconds: 120,
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /lessons/:id',
        method: 'put',
        path: () => `/api/v1/learning/admin/lessons/${rbacLessonUpdateId}`,
        body: () => ({
          title: 'Bài RBAC đã sửa',
          lesson_type: 'video',
          video_url: 'https://cdn.example.com/rbac-updated.mp4',
          duration_seconds: 180,
        }),
        expectedAdminStatus: 200,
      },
      {
        name: 'PATCH /lessons/:id',
        method: 'patch',
        path: () => `/api/v1/learning/admin/lessons/${rbacLessonUpdateId}`,
        body: () => ({ is_free: true }),
        expectedAdminStatus: 200,
      },
      {
        name: 'PUT /modules/:moduleId/lesson-order',
        method: 'put',
        path: () =>
          `/api/v1/learning/admin/modules/${rbacModuleId}/lesson-order`,
        body: () => ({ lesson_ids: [rbacLessonUpdateId] }),
        expectedAdminStatus: 204,
      },
      {
        name: 'DELETE /lessons/:id',
        method: 'delete',
        path: () => `/api/v1/learning/admin/lessons/${rbacLessonDeleteId}`,
        expectedAdminStatus: 204,
      },
      {
        name: 'POST /lessons/:lessonId/practices',
        method: 'post',
        path: () =>
          `/api/v1/learning/admin/lessons/${rbacLessonUpdateId}/practices`,
        body: () => ({
          quiz_id: null,
          trigger_at_seconds: 45,
          title: 'Practice RBAC mới',
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /practices/:id',
        method: 'put',
        path: () => `/api/v1/learning/admin/practices/${rbacPracticeUpdateId}`,
        body: () => ({
          quiz_id: null,
          trigger_at_seconds: 60,
          title: 'Practice RBAC đã sửa',
        }),
        expectedAdminStatus: 200,
      },
      {
        name: 'DELETE /practices/:id',
        method: 'delete',
        path: () => `/api/v1/learning/admin/practices/${rbacPracticeDeleteId}`,
        expectedAdminStatus: 204,
      },
      {
        name: 'GET /learning/admin/enrollments',
        method: 'get',
        path: () => '/api/v1/learning/admin/enrollments',
        expectedAdminStatus: 200,
      },
      {
        name: 'GET /courses/:courseId/enrollments',
        method: 'get',
        path: () =>
          `/api/v1/learning/admin/courses/${rbacCourseId}/enrollments`,
        expectedAdminStatus: 200,
      },
      {
        name: 'GET /users/:userId/enrollments',
        method: 'get',
        path: () => `/api/v1/learning/admin/users/${rbacStudentId}/enrollments`,
        expectedAdminStatus: 200,
      },
      {
        name: 'POST /users/:userId/enrollments',
        method: 'post',
        path: () => `/api/v1/learning/admin/users/${rbacStudentId}/enrollments`,
        body: () => ({
          course_id: rbacCourseId,
          expires_in_days: 30,
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'DELETE /enrollments/:id',
        method: 'delete',
        path: () =>
          `/api/v1/learning/admin/enrollments/${rbacEnrollmentDeleteId}`,
        expectedAdminStatus: 204,
      },
    ];

    it.each(rbacRoutes)(
      '$name → 401 khi không token, 403 khi học viên, $expectedAdminStatus khi admin',
      async ({ method, path, body, expectedAdminStatus }) => {
        const payload = body ? body() : undefined;

        // 1. Không token → 401
        const reqNoToken = http()[method](path());
        if (payload) reqNoToken.send(payload);
        await reqNoToken.expect(401);

        // 2. Học viên → 403 (bao gồm policy Users enroll themselves bị đóng)
        const reqStudent = http()[method](path()).set(bearer(studentToken));
        if (payload) reqStudent.send(payload);
        await reqStudent.expect(403);

        // 3. Admin → 2xx
        const reqAdmin = http()[method](path()).set(bearer(adminToken));
        if (payload) reqAdmin.send(payload);
        await reqAdmin.expect(expectedAdminStatus);
      },
    );
  });

  describe('4.1 Quản lý bài học (Lessons)', () => {
    let lesson1Id = 0;
    let lesson2Id = 0;
    let lesson3Id = 0;
    let lesson2QuizId = 0;

    it('tạo bài vào module rỗng → display_order = 0, bài thứ hai → 1', async () => {
      const res1 = await http()
        .post(`/api/v1/learning/admin/modules/${emptyModuleId}/lessons`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài 1 Video',
          lesson_type: 'video',
          video_url: 'https://cdn.example.com/lesson1.mp4',
          pdf_url: 'https://cdn.example.com/lesson1.pdf',
          duration_seconds: 300,
        })
        .expect(201);

      const l1 = res1.body as LessonDto;
      lesson1Id = l1.id;
      expect(l1.display_order).toBe(0);
      expect(l1.video_url).toBe('https://cdn.example.com/lesson1.mp4');
      expect(l1.pdf_url).toBe('https://cdn.example.com/lesson1.pdf');
      expect(l1.quiz_id).toBeNull();

      // Bài thứ 2: lesson_type = 'exam' → tự tạo quiz "Quiz - <title>", total_questions = 0
      const res2 = await http()
        .post(`/api/v1/learning/admin/modules/${emptyModuleId}/lessons`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài 2 Kiểm tra',
          lesson_type: 'exam',
          duration_seconds: 900,
        })
        .expect(201);

      const l2 = res2.body as LessonDto;
      lesson2Id = l2.id;
      expect(l2.display_order).toBe(1);
      expect(l2.quiz_id).not.toBeNull();
      lesson2QuizId = l2.quiz_id!;

      const quizInDb = await prisma.quiz.findUnique({
        where: { id: lesson2QuizId },
      });
      expect(quizInDb).not.toBeNull();
      expect(quizInDb?.title).toBe('Quiz - Bài 2 Kiểm tra');
      expect(quizInDb?.totalQuestions).toBe(0);
      expect(quizInDb?.moduleId).toBe(emptyModuleId);
      expect(quizInDb?.displayOrder).toBe(0);
    });

    it('lesson_type = practice kèm video_url → lưu video_url = null và tạo quiz', async () => {
      const res3 = await http()
        .post(`/api/v1/learning/admin/modules/${emptyModuleId}/lessons`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài 3 Luyện tập',
          lesson_type: 'practice',
          video_url: 'https://cdn.example.com/should-be-null.mp4',
          pdf_url: 'https://cdn.example.com/should-be-null.pdf',
          duration_seconds: 450,
        })
        .expect(201);

      const l3 = res3.body as LessonDto;
      lesson3Id = l3.id;
      expect(l3.display_order).toBe(2);
      expect(l3.video_url).toBeNull();
      expect(l3.pdf_url).toBeNull();
      expect(l3.quiz_id).not.toBeNull();

      const quiz3 = await prisma.quiz.findUnique({
        where: { id: l3.quiz_id! },
      });
      expect(quiz3?.displayOrder).toBe(1);
    });

    it('sửa bài video có sẵn (chưa có quiz) thành dictation → tự tạo quiz và giữ nguyên display_order', async () => {
      const res = await http()
        .put(`/api/v1/learning/admin/lessons/${lesson1Id}`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài 1 Nghe chép',
          lesson_type: 'dictation',
          video_url: 'https://cdn.example.com/ignored.mp4',
          duration_seconds: 360,
        })
        .expect(200);

      const updated = res.body as LessonDto;
      expect(updated.display_order).toBe(0);
      expect(updated.video_url).toBeNull();
      expect(updated.quiz_id).not.toBeNull();

      const createdQuiz = await prisma.quiz.findUnique({
        where: { id: updated.quiz_id! },
      });
      expect(createdQuiz?.title).toBe('Quiz - Bài 1 Nghe chép');
      expect(createdQuiz?.totalQuestions).toBe(0);
    });

    it('sửa bài đã có quiz → không tạo quiz mới', async () => {
      const quizCountBefore = await prisma.quiz.count({
        where: { moduleId: emptyModuleId },
      });

      const res = await http()
        .put(`/api/v1/learning/admin/lessons/${lesson2Id}`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài 2 Kiểm tra (Đã đổi tên)',
          lesson_type: 'exam',
          duration_seconds: 1200,
        })
        .expect(200);

      const updated = res.body as LessonDto;
      expect(updated.quiz_id).toBe(lesson2QuizId);
      expect(updated.display_order).toBe(1);

      const quizCountAfter = await prisma.quiz.count({
        where: { moduleId: emptyModuleId },
      });
      expect(quizCountAfter).toBe(quizCountBefore);
    });

    it('body gửi kèm display_order, module_id hoặc quiz_id → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .post(`/api/v1/learning/admin/modules/${emptyModuleId}/lessons`)
        .set(bearer(adminToken))
        .send({
          title: 'Bài gian lận display_order',
          lesson_type: 'video',
          duration_seconds: 100,
          display_order: 99,
        })
        .expect(400);

      const body = res.body as ErrorResponseBody;
      expect(body.code).toBe('VALIDATION_FAILED');
    });

    it('transaction rollback: lỗi ghi bài sau khi tạo quiz → không còn quiz mồ côi trong DB', async () => {
      const spy = jest
        .spyOn(LearningRepository.prototype, 'createLesson')
        .mockRejectedValueOnce(new Error('Simulated DB failure'));

      try {
        await expect(
          app.get(LearningAdminService).createLesson(emptyModuleId, {
            title: 'Bài Transaction Rollback',
            lesson_type: 'exam',
            duration_seconds: 300,
          }),
        ).rejects.toThrow('Simulated DB failure');

        const orphanQuiz = await prisma.quiz.findFirst({
          where: { title: 'Quiz - Bài Transaction Rollback' },
        });
        expect(orphanQuiz).toBeNull();
      } finally {
        spy.mockRestore();
      }
    });

    it('lesson-order: đảo 3 bài → display_order 0,1,2 đúng thứ tự gửi; id trùng hoặc id module khác → 400 và display_order không đổi', async () => {
      // Đảo thứ tự: [lesson3Id, lesson1Id, lesson2Id]
      await http()
        .put(`/api/v1/learning/admin/modules/${emptyModuleId}/lesson-order`)
        .set(bearer(adminToken))
        .send({ lesson_ids: [lesson3Id, lesson1Id, lesson2Id] })
        .expect(204);

      const afterReorder = await prisma.lesson.findMany({
        where: { id: { in: [lesson1Id, lesson2Id, lesson3Id] } },
        orderBy: { displayOrder: 'asc' },
      });
      expect(afterReorder.map((l) => [l.id, l.displayOrder])).toEqual([
        [lesson3Id, 0],
        [lesson1Id, 1],
        [lesson2Id, 2],
      ]);

      // Gửi ID trùng → 400 LESSON_ORDER_INVALID
      const dupRes = await http()
        .put(`/api/v1/learning/admin/modules/${emptyModuleId}/lesson-order`)
        .set(bearer(adminToken))
        .send({ lesson_ids: [lesson1Id, lesson1Id, lesson2Id] })
        .expect(400);
      expect((dupRes.body as ErrorResponseBody).code).toBe(
        'LESSON_ORDER_INVALID',
      );

      // Tạo 1 bài ở module khác rồi gửi vào emptyModuleId → 400 LESSON_ORDER_INVALID
      const otherLesson = await prisma.lesson.create({
        data: {
          moduleId: otherModuleId,
          title: 'Bài của module khác',
          displayOrder: 0,
        },
      });

      const wrongModRes = await http()
        .put(`/api/v1/learning/admin/modules/${emptyModuleId}/lesson-order`)
        .set(bearer(adminToken))
        .send({ lesson_ids: [lesson1Id, lesson2Id, otherLesson.id] })
        .expect(400);
      expect((wrongModRes.body as ErrorResponseBody).code).toBe(
        'LESSON_ORDER_INVALID',
      );

      // Kiểm tra display_order trong DB vẫn giữ nguyên [lesson3Id: 0, lesson1Id: 1, lesson2Id: 2]
      const unchanged = await prisma.lesson.findMany({
        where: { id: { in: [lesson1Id, lesson2Id, lesson3Id] } },
        orderBy: { displayOrder: 'asc' },
      });
      expect(unchanged.map((l) => [l.id, l.displayOrder])).toEqual([
        [lesson3Id, 0],
        [lesson1Id, 1],
        [lesson2Id, 2],
      ]);
    });

    it('PATCH: bật/tắt is_free, is_published; body rỗng → 400; bài ẩn không còn trong curriculum của học viên (T-005)', async () => {
      // Body rỗng → 400 VALIDATION_FAILED
      const emptyRes = await http()
        .patch(`/api/v1/learning/admin/lessons/${lesson1Id}`)
        .set(bearer(adminToken))
        .send({})
        .expect(400);
      expect((emptyRes.body as ErrorResponseBody).code).toBe(
        'VALIDATION_FAILED',
      );

      // Bật is_free = true, tắt is_published = false cho lesson2Id
      const patchRes = await http()
        .patch(`/api/v1/learning/admin/lessons/${lesson2Id}`)
        .set(bearer(adminToken))
        .send({ is_free: true, is_published: false })
        .expect(200);
      const patched = patchRes.body as LessonDto;
      expect(patched.is_free).toBe(true);
      expect(patched.is_published).toBe(false);

      // Học viên gọi GET /api/v1/learning/courses/:courseId/curriculum → không thấy lesson2Id đã ẩn
      const currRes = await http()
        .get(`/api/v1/learning/courses/${courseId}/curriculum`)
        .set(bearer(studentToken))
        .expect(200);
      const modules = currRes.body as CurriculumModuleDto[];
      const mod1 = modules.find((m) => m.id === emptyModuleId);
      expect(mod1).toBeDefined();
      expect(mod1!.lessons.some((l) => l.id === lesson2Id)).toBe(false);

      // Bật lại is_published = true
      await http()
        .patch(`/api/v1/learning/admin/lessons/${lesson2Id}`)
        .set(bearer(adminToken))
        .send({ is_published: true })
        .expect(200);
    });

    it('DELETE bài: practice/tiến độ biến mất, materials.lesson_id thành null; xóa lần 2 → 204', async () => {
      // Seed practice, progress, material gắn với lesson3Id
      const prac = await prisma.lessonPractice.create({
        data: {
          lessonId: lesson3Id,
          title: 'Practice sẽ cascade',
          triggerAtSeconds: 15,
        },
      });
      await prisma.userLessonProgress.create({
        data: {
          userId: studentId,
          lessonId: lesson3Id,
          isCompleted: true,
        },
      });
      const mat = await prisma.material.create({
        data: {
          courseId,
          lessonId: lesson3Id,
          title: 'Tài liệu giữ lại khi xóa bài',
          fileUrl: 'https://cdn.example.com/doc.pdf',
        },
      });

      // Xóa lần 1 → 204
      await http()
        .delete(`/api/v1/learning/admin/lessons/${lesson3Id}`)
        .set(bearer(adminToken))
        .expect(204);

      // Kiểm tra practice và progress biến mất
      const pracAfter = await prisma.lessonPractice.findUnique({
        where: { id: prac.id },
      });
      expect(pracAfter).toBeNull();

      const progAfter = await prisma.userLessonProgress.findUnique({
        where: {
          userId_lessonId: { userId: studentId, lessonId: lesson3Id },
        },
      });
      expect(progAfter).toBeNull();

      // Kiểm tra material vẫn còn nhưng lessonId = null
      const matAfter = await prisma.material.findUnique({
        where: { id: mat.id },
      });
      expect(matAfter).not.toBeNull();
      expect(matAfter?.lessonId).toBeNull();

      // Xóa lần 2 (không tồn tại) → vẫn 204
      await http()
        .delete(`/api/v1/learning/admin/lessons/${lesson3Id}`)
        .set(bearer(adminToken))
        .expect(204);
    });
  });

  describe('4.2 Quản lý popup luyện tập (Practices)', () => {
    let targetLessonId = 0;
    let p1Id = 0;
    let p2Id = 0;

    beforeAll(async () => {
      const lesson = await prisma.lesson.create({
        data: {
          moduleId: otherModuleId,
          title: 'Bài học có popup practice',
          displayOrder: 10,
        },
      });
      targetLessonId = lesson.id;
    });

    it('tạo practice mới → display_order = số practice cũ (0, rồi 1); quiz_id = null hợp lệ', async () => {
      const res1 = await http()
        .post(`/api/v1/learning/admin/lessons/${targetLessonId}/practices`)
        .set(bearer(adminToken))
        .send({
          quiz_id: existingQuizId,
          trigger_at_seconds: 60,
          title: 'Popup 1 có quiz',
        })
        .expect(201);

      const p1 = res1.body as PracticeDto;
      p1Id = p1.id;
      expect(p1.display_order).toBe(0);
      expect(p1.quiz_id).toBe(existingQuizId);
      expect(p1.quizzes).toEqual({
        id: existingQuizId,
        title: 'Quiz có sẵn',
        total_questions: 5,
      });

      const res2 = await http()
        .post(`/api/v1/learning/admin/lessons/${targetLessonId}/practices`)
        .set(bearer(adminToken))
        .send({
          quiz_id: null,
          trigger_at_seconds: 120,
          title: 'Popup 2 không quiz',
        })
        .expect(201);

      const p2 = res2.body as PracticeDto;
      p2Id = p2.id;
      expect(p2.display_order).toBe(1);
      expect(p2.quiz_id).toBeNull();
      expect(p2.quizzes).toBeNull();
    });

    it('sửa practice giữ nguyên display_order', async () => {
      const res = await http()
        .put(`/api/v1/learning/admin/practices/${p2Id}`)
        .set(bearer(adminToken))
        .send({
          quiz_id: existingQuizId,
          trigger_at_seconds: 180,
          title: 'Popup 2 đã gắn quiz',
        })
        .expect(200);

      const updated = res.body as PracticeDto;
      expect(updated.display_order).toBe(1);
      expect(updated.trigger_at_seconds).toBe(180);
      expect(updated.quiz_id).toBe(existingQuizId);
      expect(updated.quizzes?.title).toBe('Quiz có sẵn');
    });

    it('quiz_id không tồn tại → 404 QUIZ_NOT_FOUND', async () => {
      const resPost = await http()
        .post(`/api/v1/learning/admin/lessons/${targetLessonId}/practices`)
        .set(bearer(adminToken))
        .send({
          quiz_id: 999999,
          trigger_at_seconds: 30,
          title: 'Quiz sai',
        })
        .expect(404);
      expect((resPost.body as ErrorResponseBody).code).toBe('QUIZ_NOT_FOUND');

      const resPut = await http()
        .put(`/api/v1/learning/admin/practices/${p1Id}`)
        .set(bearer(adminToken))
        .send({
          quiz_id: 999999,
          trigger_at_seconds: 30,
          title: 'Quiz sai',
        })
        .expect(404);
      expect((resPut.body as ErrorResponseBody).code).toBe('QUIZ_NOT_FOUND');
    });

    it('DELETE practice xóa bản ghi và gọi lại vẫn trả 204', async () => {
      await http()
        .delete(`/api/v1/learning/admin/practices/${p1Id}`)
        .set(bearer(adminToken))
        .expect(204);

      await http()
        .delete(`/api/v1/learning/admin/practices/${p1Id}`)
        .set(bearer(adminToken))
        .expect(204);
    });
  });

  describe('4.3 Quản lý ghi danh (Enrollments)', () => {
    let paidLessonId = 0;
    let firstEnrollmentId = 0;

    beforeAll(async () => {
      const paidLesson = await prisma.lesson.create({
        data: {
          moduleId: emptyModuleId,
          title: 'Bài trả phí chỉ học viên ghi danh mới xem được URL',
          lessonType: 'video',
          videoUrl: 'https://cdn.example.com/paid-secret-video.mp4',
          pdfUrl: 'https://cdn.example.com/paid-secret-doc.pdf',
          isFree: false,
          isPublished: true,
          displayOrder: 99,
        },
      });
      paidLessonId = paidLesson.id;
    });

    it('trước khi ghi danh: học viên gọi curriculum không thấy video_url của bài trả phí', async () => {
      const res = await http()
        .get(`/api/v1/learning/courses/${courseId}/curriculum`)
        .set(bearer(studentToken))
        .expect(200);
      const modules = res.body as CurriculumModuleDto[];
      const lesson = modules
        .flatMap((m) => m.lessons)
        .find((l) => l.id === paidLessonId);
      expect(lesson).toBeDefined();
      expect(lesson!.video_url).toBeNull();
    });

    it('POST ghi danh với expires_in_days: 30 → expires_at cách now 30 ngày (sai số ≤ 1 phút)', async () => {
      const before = Date.now();
      const res = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: courseId,
          expires_in_days: 30,
        })
        .expect(201);

      const enrollment = res.body as AdminEnrollmentDto;
      firstEnrollmentId = enrollment.id;
      expect(enrollment.user_id).toBe(studentId);
      expect(enrollment.course_id).toBe(courseId);
      expect(enrollment.courses).toEqual({
        title: 'Khóa học TOEIC Admin Test',
      });
      expect(enrollment.expires_at).not.toBeNull();

      const expiresTime = new Date(enrollment.expires_at!).getTime();
      const expectedTime = before + 30 * 86_400_000;
      expect(Math.abs(expiresTime - expectedTime)).toBeLessThanOrEqual(60_000);
    });

    it('học viên vừa được ghi danh học được bài trả phí (gọi curriculum T-005 thấy video_url)', async () => {
      const res = await http()
        .get(`/api/v1/learning/courses/${courseId}/curriculum`)
        .set(bearer(studentToken))
        .expect(200);
      const modules = res.body as CurriculumModuleDto[];
      const lesson = modules
        .flatMap((m) => m.lessons)
        .find((l) => l.id === paidLessonId);
      expect(lesson).toBeDefined();
      expect(lesson!.video_url).toBe(
        'https://cdn.example.com/paid-secret-video.mp4',
      );
    });

    it('POST ghi danh với expires_in_days: null → expires_at = null', async () => {
      const res = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: rbacCourseId,
          expires_in_days: null,
        })
        .expect(201);

      const enrollment = res.body as AdminEnrollmentDto;
      expect(enrollment.expires_at).toBeNull();
      expect(enrollment.courses).toEqual({ title: 'Khóa học RBAC' });
    });

    it('POST ghi danh trùng (user, course) → 409 ENROLLMENT_EXISTS', async () => {
      const res = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: courseId,
          expires_in_days: 30,
        })
        .expect(409);

      expect((res.body as ErrorResponseBody).code).toBe('ENROLLMENT_EXISTS');
    });

    it('khóa học không tồn tại → 404 COURSE_NOT_FOUND; user không tồn tại → 404 USER_NOT_FOUND', async () => {
      const resNoCourse = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: 999999,
          expires_in_days: 30,
        })
        .expect(404);
      expect((resNoCourse.body as ErrorResponseBody).code).toBe(
        'COURSE_NOT_FOUND',
      );

      const nonExistentUserId = '00000000-0000-4000-8000-000000000000';
      const resNoUser = await http()
        .post(`/api/v1/learning/admin/users/${nonExistentUserId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: courseId,
          expires_in_days: 30,
        })
        .expect(404);
      expect((resNoUser.body as ErrorResponseBody).code).toBe('USER_NOT_FOUND');
    });

    it('body có expires_at → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: courseId,
          expires_in_days: 30,
          expires_at: '2099-01-01T00:00:00.000Z',
        })
        .expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
    });

    it('thiếu expires_in_days → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .post(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .send({
          course_id: courseId,
        })
        .expect(400);

      expect((res.body as ErrorResponseBody).code).toBe('VALIDATION_FAILED');
    });

    it('GET /users/:userId/enrollments trả danh sách kèm courses.title sắp theo id asc', async () => {
      const res = await http()
        .get(`/api/v1/learning/admin/users/${studentId}/enrollments`)
        .set(bearer(adminToken))
        .expect(200);

      const list = res.body as AdminEnrollmentDto[];
      expect(list).toHaveLength(2);
      expect(list[0].id).toBeLessThan(list[1].id);
      expect(list[0].courses).toEqual({ title: 'Khóa học TOEIC Admin Test' });
      expect(list[1].courses).toEqual({ title: 'Khóa học RBAC' });
    });

    it('DELETE /enrollments/:id xóa ghi danh và gọi lần 2 vẫn trả 204', async () => {
      await http()
        .delete(`/api/v1/learning/admin/enrollments/${firstEnrollmentId}`)
        .set(bearer(adminToken))
        .expect(204);

      await http()
        .delete(`/api/v1/learning/admin/enrollments/${firstEnrollmentId}`)
        .set(bearer(adminToken))
        .expect(204);
    });

    it('GET /enrollments trả danh sách toàn hệ thống kèm courses và profiles sắp enrolled_at desc nulls last, id desc', async () => {
      // Tạo profile cho studentId
      await prisma.profile.create({
        data: {
          userId: studentId,
          fullName: 'Học viên Test',
        },
      });

      // Tạo thêm 1 user không có profile và ghi danh vào courseId với enrolledAt = null
      const student2 = await prisma.user.create({
        data: {
          email: `student2-no-profile-${Date.now()}@learning-admin.test`,
          emailVerifiedAt: new Date(),
        },
      });
      const nullEnrolled = await prisma.enrollment.create({
        data: {
          userId: student2.id,
          courseId,
          enrolledAt: null,
        },
      });

      const res = await http()
        .get('/api/v1/learning/admin/enrollments')
        .set(bearer(adminToken))
        .expect(200);

      const list = res.body as AdminEnrollmentListDto[];
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(2);

      // enrolledAt != null phải đứng trước enrolledAt == null
      const nonNullIndex = list.findIndex((e) => e.enrolled_at !== null);
      const nullIndex = list.findIndex((e) => e.id === nullEnrolled.id);
      expect(nullIndex).toBeGreaterThan(nonNullIndex);

      // User có profile: kèm profiles.full_name
      const withProfile = list.find((e) => e.user_id === studentId);
      expect(withProfile).toBeDefined();
      expect(withProfile?.courses?.title).toBeDefined();
      expect(withProfile?.profiles).not.toBeNull();
      expect(withProfile?.profiles?.full_name).toBe('Học viên Test');

      // User không có profile: profiles: null
      const noProfile = list.find((e) => e.id === nullEnrolled.id);
      expect(noProfile).toBeDefined();
      expect(noProfile?.profiles).toBeNull();
    });

    it('GET /courses/:courseId/enrollments trả danh sách học viên ghi danh khóa học sắp xếp enrolled_at desc nulls last, id desc kèm profiles.full_name, khóa khác không lẫn, khóa không có trả []', async () => {
      // Đảm bảo studentId (có profile "Học viên Test") được ghi danh vào courseId với enrolledAt xác định
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: studentId, courseId } },
        update: { enrolledAt: new Date('2026-05-01T00:00:00.000Z') },
        create: {
          userId: studentId,
          courseId,
          enrolledAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      });

      // Tạo một khóa học khác và ghi danh một học viên để kiểm tra không bị lẫn
      const otherCourse = await prisma.course.create({
        data: {
          title: 'Khóa học khác không lẫn',
          price: 100_000,
          courseType: 'video_quiz',
        },
      });
      await prisma.enrollment.create({
        data: {
          userId: studentId,
          courseId: otherCourse.id,
          enrolledAt: new Date(),
        },
      });

      const res = await http()
        .get(`/api/v1/learning/admin/courses/${courseId}/enrollments`)
        .set(bearer(adminToken))
        .expect(200);

      const enrollments = res.body as CourseEnrollmentDto[];
      expect(Array.isArray(enrollments)).toBe(true);
      // Đảm bảo chỉ gồm courseId, không có otherCourse.id
      expect(enrollments.every((e) => e.course_id === courseId)).toBe(true);
      expect(enrollments.some((e) => e.course_id === otherCourse.id)).toBe(
        false,
      );

      // Sắp xếp: enrolled_at desc nulls last
      const nullIdx = enrollments.findIndex((e) => e.enrolled_at === null);
      const nonNullIdx = enrollments.findLastIndex(
        (e) => e.enrolled_at !== null,
      );
      if (nullIdx !== -1 && nonNullIdx !== -1) {
        expect(nullIdx).toBeGreaterThan(nonNullIdx);
      }

      // Có profile: studentId có full_name 'Học viên Test'
      const withProf = enrollments.find((e) => e.user_id === studentId);
      expect(withProf).toBeDefined();
      expect(withProf?.profiles).toEqual({
        user_id: studentId,
        full_name: 'Học viên Test',
      });

      // Khóa học không có ai ghi danh → trả []
      const emptyCourse = await prisma.course.create({
        data: {
          title: 'Khóa học trống',
          price: 0,
          courseType: 'video_quiz',
        },
      });
      const emptyRes = await http()
        .get(`/api/v1/learning/admin/courses/${emptyCourse.id}/enrollments`)
        .set(bearer(adminToken))
        .expect(200);
      expect(emptyRes.body).toEqual([]);

      // Dọn dẹp courses phụ tạo trong test này
      await prisma.enrollment.deleteMany({
        where: { courseId: { in: [otherCourse.id, emptyCourse.id] } },
      });
      await prisma.course.deleteMany({
        where: { id: { in: [otherCourse.id, emptyCourse.id] } },
      });
    });
  });
});
