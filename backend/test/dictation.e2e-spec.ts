import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  DictationProgressResponseDto,
  DictationQuizDetailDto,
  DictationUserAnswerDto,
  QuizResultDto,
  VocabWordDto,
} from '../src/modules/assessment/dto';

describe('AssessmentModule — dictation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@dictation.test';

  const tokens = { a: '', b: '', admin: '' };
  const userIds = { a: '', b: '', admin: '' };

  let quizId = 0;
  let lockedQuizId = 0;
  let lessonId = 0;
  let questionIds: number[] = [];

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-dictation]' } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { startsWith: '[e2e-dictation]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
  }

  async function userWithToken(
    email: string,
    role: 'student' | 'admin' = 'student',
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

    const uA = await userWithToken(`usera${EMAIL_SUFFIX}`);
    tokens.a = uA.token;
    userIds.a = uA.id;

    const uB = await userWithToken(`userb${EMAIL_SUFFIX}`);
    tokens.b = uB.token;
    userIds.b = uB.id;

    const uAdmin = await userWithToken(`admin${EMAIL_SUFFIX}`, 'admin');
    tokens.admin = uAdmin.token;
    userIds.admin = uAdmin.id;

    // Free course with quiz
    const course = await prisma.course.create({
      data: {
        title: '[e2e-dictation] Course Free',
        courseType: 'video_quiz',
        isFree: true,
      },
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: 'Mod 1', displayOrder: 0 },
    });
    const quiz = await prisma.quiz.create({
      data: {
        moduleId: mod.id,
        title: '[e2e-dictation] Quiz 1',
        totalQuestions: 2,
        isFree: true,
        displayOrder: 0,
        audioUrl: 'https://example.com/quiz.mp3',
      },
    });
    quizId = quiz.id;

    const lesson = await prisma.lesson.create({
      data: {
        moduleId: mod.id,
        title: 'Lesson 1',
        displayOrder: 0,
        lessonType: 'practice',
        quizId: quiz.id,
      },
    });
    lessonId = lesson.id;

    // 2 Questions with answers
    const q1 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        questionText: 'Listen and write sentence 1',
        questionType: 'dictation',
        displayOrder: 0,
        transcript: 'The meeting will start soon.',
        dictationKeywords: 'meeting,start,soon',
        translation: 'Cuộc họp sẽ bắt đầu sớm.',
        explanation: 'Thì tương lai đơn',
        answers: {
          create: [
            {
              answerText: 'The meeting will start soon.',
              isCorrect: true,
              displayOrder: 0,
            },
          ],
        },
      },
    });

    const q2 = await prisma.question.create({
      data: {
        quizId: quiz.id,
        questionText: 'Listen and write sentence 2',
        questionType: 'dictation',
        displayOrder: 1,
        transcript: 'Please sign the contract.',
        dictationKeywords: 'sign,contract',
        translation: 'Vui lòng ký hợp đồng.',
        answers: {
          create: [
            {
              answerText: 'Please sign the contract.',
              isCorrect: true,
              displayOrder: 0,
            },
          ],
        },
      },
    });
    questionIds = [q1.id, q2.id];

    // Linked vocab for q1
    await prisma.vocabQuestion.create({
      data: {
        word: 'contract',
        phonetic: '/ˈkɑːn.trækt/',
        definitionVi: 'hợp đồng',
        displayOrder: 0,
        questionId: q2.id,
      },
    });

    // Locked paid course with quiz (user A and B not enrolled)
    const paidCourse = await prisma.course.create({
      data: {
        title: '[e2e-dictation] Paid Course',
        courseType: 'video_quiz',
        isFree: false,
      },
    });
    const paidMod = await prisma.module.create({
      data: { courseId: paidCourse.id, title: 'Mod Paid', displayOrder: 0 },
    });
    const lockedQuiz = await prisma.quiz.create({
      data: {
        moduleId: paidMod.id,
        title: '[e2e-dictation] Locked Quiz',
        totalQuestions: 1,
        isFree: false,
        displayOrder: 0,
      },
    });
    lockedQuizId = lockedQuiz.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('GET /api/v1/assessment/dictation/quizzes/:quizId', () => {
    it('returns 404 when quiz does not exist', async () => {
      const res = await http().get(
        '/api/v1/assessment/dictation/quizzes/999999',
      );
      expect(res.status).toBe(404);
    });

    it('returns 403 when quiz is locked and user not enrolled', async () => {
      const res = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${lockedQuizId}`)
        .set(bearer(tokens.a));
      expect(res.status).toBe(403);
    });

    it('returns 200 with full transcript, keywords, translation and answers with is_correct', async () => {
      const res = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}`)
        .set(bearer(tokens.a));

      expect(res.status).toBe(200);
      const body = res.body as DictationQuizDetailDto;
      expect(body.quiz.id).toBe(quizId);
      expect(body.questions).toHaveLength(2);

      const q1 = body.questions[0];
      expect(q1.transcript).toBe('The meeting will start soon.');
      expect(q1.dictation_keywords).toBe('meeting,start,soon');
      expect(q1.translation).toBe('Cuộc họp sẽ bắt đầu sớm.');
      expect(q1.answers).toHaveLength(1);
      expect(q1.answers[0].is_correct).toBe(true);
    });

    it('admin can access locked quiz', async () => {
      const res = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${lockedQuizId}`)
        .set(bearer(tokens.admin));
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/assessment/dictation/quizzes/:quizId/lesson', () => {
    it('returns associated lesson id', async () => {
      const res = await http().get(
        `/api/v1/assessment/dictation/quizzes/${quizId}/lesson`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: lessonId });
    });

    it('returns null when quiz has no lesson', async () => {
      const res = await http().get(
        `/api/v1/assessment/dictation/quizzes/${lockedQuizId}/lesson`,
      );
      expect(res.status).toBe(200);
      expect(res.text).toBe('');
    });
  });

  describe('GET /api/v1/assessment/dictation/quizzes/:quizId/vocab', () => {
    it('returns vocab questions linked to questions of the quiz', async () => {
      const res = await http().get(
        `/api/v1/assessment/dictation/quizzes/${quizId}/vocab`,
      );
      expect(res.status).toBe(200);
      const list = res.body as VocabWordDto[];
      expect(list).toHaveLength(1);
      expect(list[0].word).toBe('contract');
      expect(list[0].question_id).toBe(questionIds[1]);
    });
  });

  describe('Progress Tracking & Mutations', () => {
    it('GET result requires auth (401)', async () => {
      const res = await http().get(
        `/api/v1/assessment/dictation/quizzes/${quizId}/result`,
      );
      expect(res.status).toBe(401);
    });

    it('GET result initializes user_quiz_results with score 0', async () => {
      const res = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/result`)
        .set(bearer(tokens.a));

      expect(res.status).toBe(200);
      const body = res.body as QuizResultDto;
      expect(body.user_id).toBe(userIds.a);
      expect(body.score).toBe(0);
      expect(body.correct_answers).toBe(0);
      expect(body.total_questions).toBe(2);
    });

    it('PUT mark question done updates score on server', async () => {
      const res = await http()
        .put(
          `/api/v1/assessment/dictation/quizzes/${quizId}/questions/${questionIds[0]}/done`,
        )
        .set(bearer(tokens.a));

      expect(res.status).toBe(200);
      const body = res.body as DictationProgressResponseDto;
      expect(body.score).toBe(1);
      expect(body.correct_answers).toBe(1);
      expect(body.total_questions).toBe(2);

      // Verify answers list
      const ansRes = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/answers`)
        .set(bearer(tokens.a));
      expect(ansRes.status).toBe(200);
      const answers = ansRes.body as DictationUserAnswerDto[];
      expect(answers).toHaveLength(1);
      expect(answers[0].question_id).toBe(questionIds[0]);
      expect(answers[0].is_correct).toBe(true);
    });

    it('DELETE unmark question done decrements score on server', async () => {
      const res = await http()
        .delete(
          `/api/v1/assessment/dictation/quizzes/${quizId}/questions/${questionIds[0]}/done`,
        )
        .set(bearer(tokens.a));

      expect(res.status).toBe(200);
      const body = res.body as DictationProgressResponseDto;
      expect(body.score).toBe(0);
      expect(body.correct_answers).toBe(0);

      // Answers list is now empty or has is_correct = false
      const ansRes = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/answers`)
        .set(bearer(tokens.a));
      expect(ansRes.status).toBe(200);
      const answers = ansRes.body as DictationUserAnswerDto[];
      expect(answers).toHaveLength(0);
    });

    it('POST syncSession updates multiple questions and score at once', async () => {
      const res = await http()
        .post(`/api/v1/assessment/dictation/quizzes/${quizId}/sync`)
        .set(bearer(tokens.a))
        .send({ question_ids: [questionIds[0], questionIds[1]] });

      expect(res.status).toBe(200);
      const body = res.body as DictationProgressResponseDto;
      expect(body.score).toBe(2);
      expect(body.correct_answers).toBe(2);
      expect(body.total_questions).toBe(2);

      // Verify answers list
      const ansRes = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/answers`)
        .set(bearer(tokens.a));
      expect(ansRes.status).toBe(200);
      const answers = ansRes.body as DictationUserAnswerDto[];
      expect(answers).toHaveLength(2);
    });

    it('POST resetAll clears all completed questions and resets score to 0', async () => {
      const res = await http()
        .post(`/api/v1/assessment/dictation/quizzes/${quizId}/reset`)
        .set(bearer(tokens.a));

      expect(res.status).toBe(200);
      const body = res.body as DictationProgressResponseDto;
      expect(body.score).toBe(0);
      expect(body.correct_answers).toBe(0);

      const ansRes = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/answers`)
        .set(bearer(tokens.a));
      expect(ansRes.status).toBe(200);
      const answers = ansRes.body as DictationUserAnswerDto[];
      expect(answers).toHaveLength(0);
    });

    it('User B cannot see User A results or answers (RLS parity)', async () => {
      // First mark question 0 as done for user A
      await http()
        .put(
          `/api/v1/assessment/dictation/quizzes/${quizId}/questions/${questionIds[0]}/done`,
        )
        .set(bearer(tokens.a));

      // User B checks answers
      const bAnswers = await http()
        .get(`/api/v1/assessment/dictation/quizzes/${quizId}/answers`)
        .set(bearer(tokens.b));
      expect(bAnswers.status).toBe(200);
      const answers = bAnswers.body as DictationUserAnswerDto[];
      expect(answers).toHaveLength(0);
    });
  });
});
