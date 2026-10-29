import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

describe('Admin Quiz Questions Batch Import (e2e - T-034)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@quiz-import.test';

  const tokens = { student: '', admin: '' };
  let testQuizId: number;
  let testLessonId: number;
  let testCourseId: number;

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
    if (testCourseId) {
      await prisma.course
        .delete({ where: { id: testCourseId } })
        .catch(() => null);
    }
    if (testQuizId) {
      await prisma.quiz.delete({ where: { id: testQuizId } }).catch(() => null);
    }
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

    const student = await userWithToken(`student${EMAIL_SUFFIX}`);
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: admin.id, role: 'admin' },
    });

    tokens.student = student.token;
    tokens.admin = admin.token;

    // Create a course, module, lesson, and quiz
    const course = await prisma.course.create({
      data: { title: 'Import Test Course', courseType: 'video_quiz' },
    });
    testCourseId = course.id;

    const moduleItem = await prisma.module.create({
      data: { courseId: course.id, title: 'Import Test Module' },
    });

    const quiz = await prisma.quiz.create({
      data: { title: 'Import Test Quiz', totalQuestions: 0, displayOrder: 0 },
    });
    testQuizId = quiz.id;

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: moduleItem.id,
        title: 'Import Test Lesson',
        quizId: quiz.id,
      },
    });
    testLessonId = lesson.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC bảo mật cho import questions', () => {
    it('401 khi không có token', async () => {
      await http()
        .post(`/api/v1/assessment/admin/quizzes/${testQuizId}/import-questions`)
        .send({ questions: [] })
        .expect(401);
    });

    it('403 khi là học viên (student token)', async () => {
      await http()
        .post(`/api/v1/assessment/admin/quizzes/${testQuizId}/import-questions`)
        .set(bearer(tokens.student))
        .send({ questions: [] })
        .expect(403);
    });
  });

  describe('Kiểm tra dữ liệu đầu vào và tồn tại đối tượng', () => {
    it('404 khi quiz không tồn tại', async () => {
      const res = await http()
        .post('/api/v1/assessment/admin/quizzes/999999/import-questions')
        .set(bearer(tokens.admin))
        .send({ questions: [] })
        .expect(404);

      const body = res.body as { code: string };
      expect(body.code).toBe('QUIZ_NOT_FOUND');
    });

    it('404 khi effective_lesson_id không tồn tại', async () => {
      const res = await http()
        .post(`/api/v1/assessment/admin/quizzes/${testQuizId}/import-questions`)
        .set(bearer(tokens.admin))
        .send({
          questions: [],
          effective_lesson_id: 999999,
        })
        .expect(404);

      const body = res.body as { code: string };
      expect(body.code).toBe('LESSON_NOT_FOUND');
    });
  });

  describe('Import thành công câu hỏi + đáp án + từ vựng trong 1 transaction', () => {
    it('tạo 2 câu hỏi, đáp án, từ vựng và tự động cập nhật bộ đếm total_questions', async () => {
      const payload = {
        effective_lesson_id: testLessonId,
        quiz_title: 'Bài test import',
        questions: [
          {
            question_text: 'What is the capital of Vietnam?',
            question_type: 'multiple_choice',
            translation: 'Thủ đô của Việt Nam là gì?',
            answers: [
              { text: 'Hanoi', is_correct: true, explanation: 'Chính xác' },
              { text: 'HCM City', is_correct: false },
              { text: 'Da Nang', is_correct: false },
            ],
            vocab_text:
              'capital|thủ đô|/ˈkæp.ə.t̬əl/|Hanoi is the capital; vietnam|Việt Nam||',
          },
          {
            question_text: 'Choose the correct answer',
            question_type: 'multiple_choice',
            answers: [
              { text: 'Option A', is_correct: true },
              { text: 'Option B', is_correct: false },
            ],
          },
        ],
      };

      const res = await http()
        .post(`/api/v1/assessment/admin/quizzes/${testQuizId}/import-questions`)
        .set(bearer(tokens.admin))
        .send(payload)
        .expect(201);

      expect(res.body).toEqual({ success: true, count: 2 });

      // Check questions created
      const questionsInDb = await prisma.question.findMany({
        where: { quizId: testQuizId },
        include: { answers: true },
        orderBy: { displayOrder: 'asc' },
      });
      expect(questionsInDb.length).toBe(2);
      expect(questionsInDb[0].questionText).toBe(
        'What is the capital of Vietnam?',
      );
      expect(questionsInDb[0].answers.length).toBe(3);
      expect(
        questionsInDb[0].answers.find((a) => a.answerText === 'Hanoi')
          ?.isCorrect,
      ).toBe(true);

      // Check quiz counter updated
      const quizInDb = await prisma.quiz.findUnique({
        where: { id: testQuizId },
      });
      expect(quizInDb?.totalQuestions).toBe(2);

      // Check vocab quiz created
      const vocabQuizInDb = await prisma.vocabQuiz.findFirst({
        where: { lessonId: testLessonId },
        include: { vocabQuestions: true },
      });
      expect(vocabQuizInDb).toBeDefined();
      expect(vocabQuizInDb?.title).toBe('Từ vựng - Bài test import');
      expect(vocabQuizInDb?.totalQuestions).toBe(2);
      expect(vocabQuizInDb?.vocabQuestions.length).toBe(2);

      const capitalWord = vocabQuizInDb?.vocabQuestions.find(
        (w) => w.word === 'capital',
      );
      expect(capitalWord).toBeDefined();
      expect(capitalWord?.definitionVi).toBe('thủ đô');
      expect(capitalWord?.phonetic).toBe('/ˈkæp.ə.t̬əl/');
      expect(capitalWord?.questionId).toBe(questionsInDb[0].id);
    });

    it('import thêm đợt 2 tự động tăng display_order và cập nhật lại bộ đếm', async () => {
      const payload = {
        effective_lesson_id: testLessonId,
        questions: [
          {
            question_text: 'Third question',
            question_type: 'multiple_choice',
            answers: [{ text: 'Yes', is_correct: true }],
            vocab_text: 'third|thứ ba||',
          },
        ],
      };

      const res = await http()
        .post(`/api/v1/assessment/admin/quizzes/${testQuizId}/import-questions`)
        .set(bearer(tokens.admin))
        .send(payload)
        .expect(201);

      expect(res.body).toEqual({ success: true, count: 1 });

      const quizInDb = await prisma.quiz.findUnique({
        where: { id: testQuizId },
      });
      expect(quizInDb?.totalQuestions).toBe(3);

      const vocabQuizInDb = await prisma.vocabQuiz.findFirst({
        where: { lessonId: testLessonId },
      });
      expect(vocabQuizInDb?.totalQuestions).toBe(3);
    });
  });
});
