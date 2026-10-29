import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import type {
  QuizDto,
  ReviewQuestionDto,
} from '../src/modules/assessment/dto';

interface RbacRouteCase {
  name: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: () => string;
  body?: () => unknown;
  expectedAdminStatus: number;
}

describe('AssessmentAdmin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const PREFIX = '[E2E_ADMIN_QUIZ]';

  let adminToken: string;
  let studentToken: string;

  let courseId: number;
  let moduleId: number;
  let lessonNoQuizId: number;
  let lessonWithQuizId: number;
  let lessonNoModuleId: number;
  let quizId: number;
  let otherQuizId: number;
  let question1Id: number;
  let question2Id: number;
  let otherQuestionId: number;

  // RBAC fixture IDs
  let rbacQuizId: number;
  let rbacQuestionId: number;
  let rbacQuestionDeleteId: number;
  let rbacQuizDeleteId: number;
  let rbacLessonId: number;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.answer.deleteMany({
      where: { question: { questionText: { contains: PREFIX } } },
    });
    await prisma.question.deleteMany({
      where: { questionText: { contains: PREFIX } },
    });
    await prisma.lesson.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.module.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.course.deleteMany({
      where: { title: { contains: PREFIX } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { email: { endsWith: '@assessment-admin.test' } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@assessment-admin.test' } },
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
      'admin@assessment-admin.test',
      AppRole.admin,
    );
    const student = await createUserWithRole(
      'student@assessment-admin.test',
      AppRole.student,
    );
    adminToken = admin.token;
    studentToken = student.token;

    // Fixtures
    const course = await prisma.course.create({
      data: {
        title: `${PREFIX} Course`,
        courseType: 'video_quiz',
        isActive: false,
      },
    });
    courseId = course.id;

    const mod = await prisma.module.create({
      data: {
        courseId,
        title: `${PREFIX} Module`,
        displayOrder: 0,
      },
    });
    moduleId = mod.id;

    const quiz = await prisma.quiz.create({
      data: {
        moduleId,
        title: `${PREFIX} Quiz For Questions`,
        displayOrder: 0,
      },
    });
    quizId = quiz.id;

    const otherQuiz = await prisma.quiz.create({
      data: {
        moduleId,
        title: `${PREFIX} Other Quiz`,
        displayOrder: 1,
      },
    });
    otherQuizId = otherQuiz.id;

    const q1 = await prisma.question.create({
      data: {
        quizId,
        questionText: `${PREFIX} Question 1`,
        displayOrder: 0,
      },
    });
    question1Id = q1.id;

    const q2 = await prisma.question.create({
      data: {
        quizId,
        questionText: `${PREFIX} Question 2`,
        displayOrder: 1,
      },
    });
    question2Id = q2.id;

    const otherQ = await prisma.question.create({
      data: {
        quizId: otherQuizId,
        questionText: `${PREFIX} Other Question`,
        displayOrder: 0,
      },
    });
    otherQuestionId = otherQ.id;

    const lNoQuiz = await prisma.lesson.create({
      data: {
        moduleId,
        title: `${PREFIX} Lesson No Quiz`,
        displayOrder: 0,
      },
    });
    lessonNoQuizId = lNoQuiz.id;

    const lWithQuiz = await prisma.lesson.create({
      data: {
        moduleId,
        title: `${PREFIX} Lesson With Quiz`,
        displayOrder: 1,
        quizId,
      },
    });
    lessonWithQuizId = lWithQuiz.id;

    const lNoModule = await prisma.lesson.create({
      data: {
        moduleId: null,
        title: `${PREFIX} Lesson No Module`,
        displayOrder: 2,
      },
    });
    lessonNoModuleId = lNoModule.id;

    // RBAC fixtures
    const rbacQuiz = await prisma.quiz.create({
      data: {
        moduleId,
        title: `${PREFIX} RBAC Quiz`,
        displayOrder: 2,
      },
    });
    rbacQuizId = rbacQuiz.id;

    const rbacQuizDelete = await prisma.quiz.create({
      data: {
        moduleId,
        title: `${PREFIX} RBAC Quiz Delete`,
        displayOrder: 3,
      },
    });
    rbacQuizDeleteId = rbacQuizDelete.id;

    const rbacQ = await prisma.question.create({
      data: {
        quizId: rbacQuizId,
        questionText: `${PREFIX} RBAC Question`,
        displayOrder: 0,
      },
    });
    rbacQuestionId = rbacQ.id;

    const rbacQDelete = await prisma.question.create({
      data: {
        quizId: rbacQuizId,
        questionText: `${PREFIX} RBAC Question Delete`,
        displayOrder: 1,
      },
    });
    rbacQuestionDeleteId = rbacQDelete.id;

    const rbacLesson = await prisma.lesson.create({
      data: {
        moduleId,
        title: `${PREFIX} RBAC Lesson`,
        displayOrder: 3,
      },
    });
    rbacLessonId = rbacLesson.id;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('Phân quyền 12 route admin assessment (401 không token, 403 học viên, 2xx admin)', () => {
    const rbacRoutes: RbacRouteCase[] = [
      {
        name: 'GET /quizzes/:quizId/questions',
        method: 'get',
        path: () => `/api/v1/assessment/admin/quizzes/${rbacQuizId}/questions`,
        expectedAdminStatus: 200,
      },
      {
        name: 'POST /quizzes/:quizId/questions',
        method: 'post',
        path: () => `/api/v1/assessment/admin/quizzes/${rbacQuizId}/questions`,
        body: () => ({
          question_text: `${PREFIX} RBAC Created Question`,
          answers: [{ answer_text: 'Option A', is_correct: true }],
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /questions/:id',
        method: 'put',
        path: () =>
          `/api/v1/assessment/admin/questions/${rbacQuestionId}`,
        body: () => ({
          question_text: `${PREFIX} RBAC Updated Question`,
          answers: [{ answer_text: 'Option B', is_correct: true }],
        }),
        expectedAdminStatus: 200,
      },
      {
        name: 'DELETE /questions/:id',
        method: 'delete',
        path: () =>
          `/api/v1/assessment/admin/questions/${rbacQuestionDeleteId}`,
        expectedAdminStatus: 204,
      },
      {
        name: 'POST /quizzes/:quizId/questions/bulk-delete',
        method: 'post',
        path: () =>
          `/api/v1/assessment/admin/quizzes/${rbacQuizId}/questions/bulk-delete`,
        body: () => ({ question_ids: [rbacQuestionId] }),
        expectedAdminStatus: 204,
      },
      {
        name: 'PUT /quizzes/:quizId/question-order',
        method: 'put',
        path: () =>
          `/api/v1/assessment/admin/quizzes/${quizId}/question-order`,
        body: () => ({ question_ids: [question1Id, question2Id] }),
        expectedAdminStatus: 204,
      },
      {
        name: 'PUT /quizzes/:quizId/question-images',
        method: 'put',
        path: () =>
          `/api/v1/assessment/admin/quizzes/${quizId}/question-images`,
        body: () => ({
          items: [{ question_id: question1Id, image_url: 'https://img.test' }],
        }),
        expectedAdminStatus: 204,
      },
      {
        name: 'PATCH /quizzes/:quizId',
        method: 'patch',
        path: () => `/api/v1/assessment/admin/quizzes/${rbacQuizId}`,
        body: () => ({ audio_url: 'https://audio.test' }),
        expectedAdminStatus: 200,
      },
      {
        name: 'POST /modules/:moduleId/quizzes',
        method: 'post',
        path: () => `/api/v1/assessment/admin/modules/${moduleId}/quizzes`,
        body: () => ({
          title: `${PREFIX} RBAC Independent Quiz`,
          total_questions: 10,
          time_limit_seconds: 600,
        }),
        expectedAdminStatus: 201,
      },
      {
        name: 'PUT /quizzes/:id',
        method: 'put',
        path: () => `/api/v1/assessment/admin/quizzes/${rbacQuizId}`,
        body: () => ({
          title: `${PREFIX} RBAC Updated Quiz`,
          total_questions: 5,
        }),
        expectedAdminStatus: 200,
      },
      {
        name: 'DELETE /quizzes/:id',
        method: 'delete',
        path: () => `/api/v1/assessment/admin/quizzes/${rbacQuizDeleteId}`,
        expectedAdminStatus: 204,
      },
      {
        name: 'POST /lessons/:lessonId/quiz',
        method: 'post',
        path: () => `/api/v1/assessment/admin/lessons/${rbacLessonId}/quiz`,
        expectedAdminStatus: 201,
      },
    ];

    it.each(rbacRoutes)(
      '$name → 401 không token, 403 học viên, $expectedAdminStatus admin',
      async ({ method, path, body, expectedAdminStatus }) => {
        const payload = body ? body() : undefined;

        // 1. Không token → 401
        const reqNoToken = http()[method](path());
        if (payload) reqNoToken.send(payload);
        await reqNoToken.expect(401);

        // 2. Học viên → 403
        const reqStudent = http()[method](path()).set(bearer(studentToken));
        if (payload) reqStudent.send(payload);
        await reqStudent.expect(403);

        // 3. Admin → expected status
        const reqAdmin = http()[method](path()).set(bearer(adminToken));
        if (payload) reqAdmin.send(payload);
        await reqAdmin.expect(expectedAdminStatus);
      },
    );
  });

  describe('Nghiệp vụ quản lý câu hỏi & đáp án (ADM-011)', () => {
    let createdQId: number;

    it('POST /quizzes/:quizId/questions: tạo câu hỏi → display_order max+1, đáp án đúng thứ tự, bỏ qua đáp án rỗng sau trim, cập nhật total_questions', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/quizzes/${quizId}/questions`)
        .set(bearer(adminToken))
        .send({
          question_text: `${PREFIX} Created Q3`,
          translation: 'Dịch câu 3',
          dictation_keywords: 'keyword1, keyword2',
          question_type: 'multiple_choice',
          answers: [
            { answer_text: 'Option 1', is_correct: true, explanation: 'Exp 1' },
            { answer_text: '   ', is_correct: false }, // Rỗng -> bỏ qua
            { answer_text: 'Option 2', is_correct: false, explanation: 'Exp 2' },
          ],
        })
        .expect(201);

      const q = res.body as ReviewQuestionDto;
      createdQId = q.id;
      expect(q.question_text).toBe(`${PREFIX} Created Q3`);
      expect(q.display_order).toBe(2); // q1 = 0, q2 = 1 -> max+1 = 2
      expect(q.translation).toBe('Dịch câu 3');
      expect(q.answers).toHaveLength(2);
      expect(q.answers[0].answer_text).toBe('Option 1');
      expect(q.answers[0].display_order).toBe(0);
      expect(q.answers[0].is_correct).toBe(true);
      expect(q.answers[1].answer_text).toBe('Option 2');
      expect(q.answers[1].display_order).toBe(1);

      // Quiz total_questions được cập nhật
      const quizInDb = await prisma.quiz.findUniqueOrThrow({
        where: { id: quizId },
      });
      expect(quizInDb.totalQuestions).toBeGreaterThanOrEqual(3);
    });

    it('PUT /questions/:id: sửa câu hỏi → thay thế toàn bộ đáp án cũ, cập nhật trường', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/questions/${createdQId}`)
        .set(bearer(adminToken))
        .send({
          question_text: `${PREFIX} Q3 Modified`,
          translation: 'Dịch sửa',
          answers: [
            { answer_text: 'New Option A', is_correct: false },
            { answer_text: 'New Option B', is_correct: true },
          ],
        })
        .expect(200);

      const q = res.body as ReviewQuestionDto;
      expect(q.question_text).toBe(`${PREFIX} Q3 Modified`);
      expect(q.answers).toHaveLength(2);
      expect(q.answers[0].answer_text).toBe('New Option A');
      expect(q.answers[1].answer_text).toBe('New Option B');
      expect(q.answers[1].is_correct).toBe(true);

      // Đáp án cũ đã bị xóa khỏi DB
      const answersInDb = await prisma.answer.findMany({
        where: { questionId: createdQId },
      });
      expect(answersInDb).toHaveLength(2);
      expect(answersInDb.some((a) => a.answerText === 'Option 1')).toBe(false);
    });

    it('PUT /questions/:id: 404 khi id không tồn tại', async () => {
      await http()
        .put('/api/v1/assessment/admin/questions/9999999')
        .set(bearer(adminToken))
        .send({
          question_text: 'Không tồn tại',
          answers: [],
        })
        .expect(404);
    });

    it('PUT /quizzes/:quizId/question-order: kiểm tra id lạ / id quiz khác → 400 QUESTION_IDS_INVALID, thứ tự không đổi', async () => {
      // 1. Gửi ID từ otherQuiz
      await http()
        .put(`/api/v1/assessment/admin/quizzes/${quizId}/question-order`)
        .set(bearer(adminToken))
        .send({ question_ids: [question1Id, otherQuestionId] })
        .expect(400);

      // 2. Gửi ID trùng
      await http()
        .put(`/api/v1/assessment/admin/quizzes/${quizId}/question-order`)
        .set(bearer(adminToken))
        .send({ question_ids: [question1Id, question1Id] })
        .expect(400);
    });

    it('PUT /quizzes/:quizId/question-order: cập nhật thứ tự thành công khi hợp lệ', async () => {
      await http()
        .put(`/api/v1/assessment/admin/quizzes/${quizId}/question-order`)
        .set(bearer(adminToken))
        .send({ question_ids: [question2Id, question1Id] })
        .expect(204);

      const q1 = await prisma.question.findUniqueOrThrow({
        where: { id: question1Id },
      });
      const q2 = await prisma.question.findUniqueOrThrow({
        where: { id: question2Id },
      });
      expect(q2.displayOrder).toBe(0);
      expect(q1.displayOrder).toBe(1);
    });

    it('PUT /quizzes/:quizId/question-images: gán ảnh hàng loạt, id lạ → 400', async () => {
      // ID quiz khác -> 400
      await http()
        .put(`/api/v1/assessment/admin/quizzes/${quizId}/question-images`)
        .set(bearer(adminToken))
        .send({
          items: [{ question_id: otherQuestionId, image_url: 'img.png' }],
        })
        .expect(400);

      // Hợp lệ -> 204
      await http()
        .put(`/api/v1/assessment/admin/quizzes/${quizId}/question-images`)
        .set(bearer(adminToken))
        .send({
          items: [
            { question_id: question1Id, image_url: 'https://cdn.example.com/q1.png' },
            { question_id: question2Id, image_url: null },
          ],
        })
        .expect(204);

      const q1 = await prisma.question.findUniqueOrThrow({
        where: { id: question1Id },
      });
      expect(q1.imageUrl).toBe('https://cdn.example.com/q1.png');
    });

    it('PATCH /quizzes/:quizId: cập nhật audio_url thành công', async () => {
      const res = await http()
        .patch(`/api/v1/assessment/admin/quizzes/${quizId}`)
        .set(bearer(adminToken))
        .send({ audio_url: 'https://cdn.example.com/quiz-audio.mp3' })
        .expect(200);

      const quiz = res.body as QuizDto;
      expect(quiz.audio_url).toBe('https://cdn.example.com/quiz-audio.mp3');
    });

    it('POST /quizzes/:quizId/questions/bulk-delete: xóa nhiều câu; id quiz khác → 400, không xóa gì', async () => {
      // ID quiz khác -> 400
      await http()
        .post(`/api/v1/assessment/admin/quizzes/${quizId}/questions/bulk-delete`)
        .set(bearer(adminToken))
        .send({ question_ids: [question1Id, otherQuestionId] })
        .expect(400);

      // question1Id vẫn còn
      let q1 = await prisma.question.findUnique({ where: { id: question1Id } });
      expect(q1).not.toBeNull();

      // Xóa createdQId
      await http()
        .post(`/api/v1/assessment/admin/quizzes/${quizId}/questions/bulk-delete`)
        .set(bearer(adminToken))
        .send({ question_ids: [createdQId] })
        .expect(204);

      const qDeleted = await prisma.question.findUnique({
        where: { id: createdQId },
      });
      expect(qDeleted).toBeNull();
    });

    it('DELETE /questions/:id: xóa 1 câu hỏi → giảm total_questions; xóa lần 2 trả 204', async () => {
      // Tạo 1 câu qua API để total_questions của quiz được cập nhật đồng bộ
      const createRes = await http()
        .post(`/api/v1/assessment/admin/quizzes/${quizId}/questions`)
        .set(bearer(adminToken))
        .send({
          question_text: `${PREFIX} Temp Question To Delete`,
          answers: [{ answer_text: 'Ans', is_correct: true }],
        })
        .expect(201);
      const tempQ = createRes.body as ReviewQuestionDto;

      const beforeQuiz = await prisma.quiz.findUniqueOrThrow({
        where: { id: quizId },
      });

      await http()
        .delete(`/api/v1/assessment/admin/questions/${tempQ.id}`)
        .set(bearer(adminToken))
        .expect(204);

      const afterQuiz = await prisma.quiz.findUniqueOrThrow({
        where: { id: quizId },
      });
      expect(afterQuiz.totalQuestions).toBe(beforeQuiz.totalQuestions - 1);

      // Gọi lần 2 vẫn trả 204
      await http()
        .delete(`/api/v1/assessment/admin/questions/${tempQ.id}`)
        .set(bearer(adminToken))
        .expect(204);
    });
  });

  describe('Nghiệp vụ quản lý quiz độc lập & quiz theo bài học (ADM-010)', () => {
    let createdModuleQuizId: number;

    it('POST /modules/:moduleId/quizzes: tạo quiz độc lập với display_order = số quiz cũ; body có display_order/module_id → 400', async () => {
      // Body chứa display_order / module_id -> 400 do whitelist/forbidNonWhitelisted
      await http()
        .post(`/api/v1/assessment/admin/modules/${moduleId}/quizzes`)
        .set(bearer(adminToken))
        .send({
          title: `${PREFIX} Quiz With Extra Props`,
          total_questions: 10,
          display_order: 5,
        })
        .expect(400);

      await http()
        .post(`/api/v1/assessment/admin/modules/${moduleId}/quizzes`)
        .set(bearer(adminToken))
        .send({
          title: `${PREFIX} Quiz With ModuleId`,
          total_questions: 10,
          module_id: 1,
        })
        .expect(400);

      // Đếm số quiz trước khi tạo
      const currentQuizzesCount = await prisma.quiz.count({
        where: { moduleId },
      });

      // Tạo quiz hợp lệ
      const res = await http()
        .post(`/api/v1/assessment/admin/modules/${moduleId}/quizzes`)
        .set(bearer(adminToken))
        .send({
          title: `${PREFIX} Independent Quiz`,
          total_questions: 20,
          time_limit_seconds: 900,
        })
        .expect(201);

      const quiz = res.body as QuizDto;
      createdModuleQuizId = quiz.id;
      expect(quiz.title).toBe(`${PREFIX} Independent Quiz`);
      expect(quiz.total_questions).toBe(20);
      expect(quiz.display_order).toBe(currentQuizzesCount);
    });

    it('PUT /quizzes/:id: sửa quiz độc lập giữ nguyên display_order', async () => {
      const res = await http()
        .put(`/api/v1/assessment/admin/quizzes/${createdModuleQuizId}`)
        .set(bearer(adminToken))
        .send({
          title: `${PREFIX} Independent Quiz Renamed`,
          total_questions: 25,
          time_limit_seconds: 1200,
        })
        .expect(200);

      const quiz = res.body as QuizDto;
      expect(quiz.title).toBe(`${PREFIX} Independent Quiz Renamed`);
      expect(quiz.total_questions).toBe(25);
    });

    it('DELETE /quizzes/:id: xóa quiz thành công → 204; gọi lại trả 204', async () => {
      await http()
        .delete(`/api/v1/assessment/admin/quizzes/${createdModuleQuizId}`)
        .set(bearer(adminToken))
        .expect(204);

      await http()
        .delete(`/api/v1/assessment/admin/quizzes/${createdModuleQuizId}`)
        .set(bearer(adminToken))
        .expect(204);
    });

    it('POST /lessons/:lessonId/quiz: tạo quiz cho bài học; gọi lại lần 2 → 409 LESSON_ALREADY_HAS_QUIZ', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/lessons/${lessonNoQuizId}/quiz`)
        .set(bearer(adminToken))
        .expect(201);

      const quiz = res.body as QuizDto;
      expect(quiz.title).toBe(`Quiz - ${PREFIX} Lesson No Quiz`);

      // Lesson trong DB đã được gắn quiz_id
      const lessonInDb = await prisma.lesson.findUniqueOrThrow({
        where: { id: lessonNoQuizId },
      });
      expect(lessonInDb.quizId).toBe(quiz.id);

      // Gọi lần 2 -> 409
      await http()
        .post(`/api/v1/assessment/admin/lessons/${lessonNoQuizId}/quiz`)
        .set(bearer(adminToken))
        .expect(409);
    });

    it('POST /lessons/:lessonId/quiz: bài học không thuộc module → 400 LESSON_HAS_NO_MODULE', async () => {
      await http()
        .post(`/api/v1/assessment/admin/lessons/${lessonNoModuleId}/quiz`)
        .set(bearer(adminToken))
        .expect(400);
    });

    it('POST /lessons/:lessonId/quiz: bài học không tồn tại → 404 LESSON_NOT_FOUND', async () => {
      await http()
        .post('/api/v1/assessment/admin/lessons/9999999/quiz')
        .set(bearer(adminToken))
        .expect(404);
    });
  });
});
