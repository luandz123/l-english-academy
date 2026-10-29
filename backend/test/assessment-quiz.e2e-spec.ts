import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  LatestQuizResultResponseDto,
  QuestionDto,
  QuizResultDto,
  ReviewQuestionDto,
  SubmitQuizResponseDto,
  UserAnswerDto,
} from '../src/modules/assessment/dto';

/**
 * Policy RLS cũ → kiểm tra mới:
 * - "Quizzes/Questions/Answers viewable by all": đề công khai, nhưng **không** kèm
 *   is_correct/lời giải; đáp án chỉ mở qua /review sau khi đã nộp (HLD AssessmentModule).
 * - "Users insert own results/answers": user lấy từ token; điểm và is_correct do server tính.
 * - "Users view own results/answers", "Admins view all results/answers".
 */
describe('AssessmentModule — quiz (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@assessment.test';

  const tokens = { a: '', b: '', admin: '', expired: '' };
  const userIds = { a: '', b: '' };
  let quizId = 0;
  let emptyQuizId = 0;
  /** Quiz không gắn module, chỉ gắn với một bài free của khóa trả phí. */
  let freeLessonQuizId = 0;
  /** Quiz không gắn module hay bài nào. */
  let orphanQuizId = 0;
  /** [câu][đáp án] → id; đáp án đúng: câu 0 → 0, câu 1 → 1, câu 2 → 0. */
  const answerIds: number[][] = [];
  const questionIds: number[] = [];

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-assessment]' } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { startsWith: '[e2e-assessment]' } },
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

  const submit = (token: string, body: object, id = quizId) =>
    http()
      .post(`/api/v1/assessment/quizzes/${id}/submit`)
      .set(bearer(token))
      .send(body);

  /** Chọn đáp án theo chỉ số cho từng câu (null = bỏ trống). */
  const pick = (choices: (number | null)[]) => ({
    answers: choices.map((c, i) => ({
      question_id: questionIds[i],
      selected_answer_id: c === null ? null : answerIds[i][c],
    })),
    time_spent_seconds: 42,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    // Khóa trả phí → module trả phí → quiz chính (gắn module + bài exam trả phí)
    const course = await prisma.course.create({
      data: { title: '[e2e-assessment] Khóa', courseType: 'video_quiz' },
    });
    const mod = await prisma.module.create({
      data: { courseId: course.id, title: 'M', displayOrder: 0 },
    });
    const quiz = await prisma.quiz.create({
      data: {
        moduleId: mod.id,
        title: '[e2e-assessment] Quiz',
        totalQuestions: 3,
        timeLimitSeconds: 300,
      },
    });
    quizId = quiz.id;
    await prisma.lesson.create({
      data: { moduleId: mod.id, title: 'Bài thi', lessonType: 'exam', quizId },
    });
    const empty = await prisma.quiz.create({
      data: { title: '[e2e-assessment] Rỗng', isFree: true },
    });
    emptyQuizId = empty.id;
    const freeLessonQuiz = await prisma.quiz.create({
      data: { title: '[e2e-assessment] Bài free' },
    });
    freeLessonQuizId = freeLessonQuiz.id;
    await prisma.question.create({
      data: { quizId: freeLessonQuizId, questionText: 'Q', displayOrder: 0 },
    });
    await prisma.lesson.create({
      data: {
        moduleId: mod.id,
        title: 'Luyện tập free',
        lessonType: 'practice',
        quizId: freeLessonQuizId,
        isFree: true,
        displayOrder: 1,
      },
    });
    const orphan = await prisma.quiz.create({
      data: { title: '[e2e-assessment] Mồ côi' },
    });
    orphanQuizId = orphan.id;
    await prisma.question.create({
      data: { quizId: orphanQuizId, questionText: 'Q', displayOrder: 0 },
    });

    const correctIndex = [0, 1, 0];
    // Tạo theo thứ tự display_order ngược để kiểm server sắp lại
    for (let i = 2; i >= 0; i--) {
      const q = await prisma.question.create({
        data: {
          quizId,
          questionText: `Câu ${i + 1}`,
          displayOrder: i,
          explanation: `Giải thích ${i + 1}`,
          transcript: `Transcript ${i + 1}`,
          translation: `Dịch ${i + 1}`,
          dictationKeywords: `kw${i + 1}`,
        },
      });
      questionIds[i] = q.id;
      answerIds[i] = [];
      for (let j = 0; j < 2; j++) {
        const a = await prisma.answer.create({
          data: {
            questionId: q.id,
            answerText: `Đáp án ${j}`,
            isCorrect: j === correctIndex[i],
            explanation: `Lý do ${j}`,
            displayOrder: j,
          },
        });
        answerIds[i][j] = a.id;
      }
    }

    const a = await userWithToken(`a${EMAIL_SUFFIX}`);
    const b = await userWithToken(`b${EMAIL_SUFFIX}`);
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    const expired = await userWithToken(`expired${EMAIL_SUFFIX}`);
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    await prisma.enrollment.create({
      data: { userId: a.id, courseId: course.id },
    });
    await prisma.enrollment.create({
      data: {
        userId: expired.id,
        courseId: course.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    Object.assign(tokens, {
      a: a.token,
      b: b.token,
      admin: admin.token,
      expired: expired.token,
    });
    Object.assign(userIds, { a: a.id, b: b.id });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('đọc đề (công khai)', () => {
    it('GET quiz không cần token; quiz không tồn tại → 404', async () => {
      const res = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: quizId,
        total_questions: 3,
        time_limit_seconds: 300,
      });
      const missing = await http()
        .get('/api/v1/assessment/quizzes/999999')
        .expect(404);
      expect((missing.body as { code: string }).code).toBe('QUIZ_NOT_FOUND');
    });

    it('câu hỏi theo display_order, không lộ đáp án đúng hay lời giải', async () => {
      const res = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/questions`)
        .set(bearer(tokens.a))
        .expect(200);
      const qs = res.body as QuestionDto[];
      expect(qs.map((q) => q.id)).toEqual(questionIds);
      const raw = JSON.stringify(res.body);
      for (const key of [
        'is_correct',
        'explanation',
        'transcript',
        'translation',
        'dictation_keywords',
      ]) {
        expect(raw).not.toContain(`"${key}"`);
      }
      expect(qs[0].answers.map((x) => x.id)).toEqual(answerIds[0]);
    });

    it('quiz không tồn tại → []', async () => {
      const res = await http()
        .get('/api/v1/assessment/quizzes/999999/questions')
        .expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('quyền làm quiz (#22a, cùng quy tắc canStudyLesson)', () => {
    const questions = (id: number, token?: string) => {
      const req = http().get(`/api/v1/assessment/quizzes/${id}/questions`);
      return token ? req.set(bearer(token)) : req;
    };
    const code = (res: { body: unknown }) =>
      (res.body as { code: string }).code;

    it('quiz của khóa trả phí: khách, chưa mua, ghi danh hết hạn → 403 QUIZ_LOCKED', async () => {
      for (const token of [undefined, tokens.b, tokens.expired]) {
        const res = await questions(quizId, token).expect(403);
        expect(code(res)).toBe('QUIZ_LOCKED');
      }
    });

    it('chưa mua nộp bài → 403 QUIZ_LOCKED, không ghi kết quả', async () => {
      const before = await prisma.userQuizResult.count({ where: { quizId } });
      const res = await submit(tokens.b, pick([0, 1, 0])).expect(403);
      expect(code(res)).toBe('QUIZ_LOCKED');
      expect(await prisma.userQuizResult.count({ where: { quizId } })).toBe(
        before,
      );
    });

    it('đã ghi danh và admin → 200', async () => {
      await questions(quizId, tokens.a).expect(200);
      await questions(quizId, tokens.admin).expect(200);
    });

    it('quiz gắn một bài free → ai cũng làm được, kể cả khách', async () => {
      await questions(freeLessonQuizId).expect(200);
      await questions(freeLessonQuizId, tokens.b).expect(200);
    });

    it('quiz không gắn module/bài → chỉ admin', async () => {
      expect(code(await questions(orphanQuizId, tokens.a).expect(403))).toBe(
        'QUIZ_LOCKED',
      );
      await questions(orphanQuizId, tokens.admin).expect(200);
    });

    it('token sai → 401 (không hạ xuống khách)', async () => {
      await questions(quizId, 'not-a-jwt').expect(401);
    });
  });

  describe('nộp bài', () => {
    it('không token → 401', async () => {
      await http()
        .post(`/api/v1/assessment/quizzes/${quizId}/submit`)
        .send(pick([0, 1, 0]))
        .expect(401);
    });

    it('/review trước khi nộp → 403 QUIZ_NOT_ATTEMPTED', async () => {
      const res = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/review`)
        .set(bearer(tokens.a))
        .expect(403);
      expect((res.body as { code: string }).code).toBe('QUIZ_NOT_ATTEMPTED');
    });

    it('server chấm: 2/3 đúng → score 6.67, ghi đủ 3 dòng user_answers', async () => {
      const res = await submit(tokens.a, pick([0, 0, 0])).expect(201);
      const body = res.body as SubmitQuizResponseDto;
      expect(body.is_first_attempt).toBe(true);
      expect(body.result).toMatchObject({
        user_id: userIds.a,
        quiz_id: quizId,
        score: 6.67,
        correct_answers: 2,
        total_questions: 3,
        time_spent_seconds: 42,
      });
      const rows = await prisma.userAnswer.findMany({
        where: { resultId: body.result.id },
        orderBy: { id: 'asc' },
      });
      expect(
        rows.map((r) => [r.questionId, r.selectedAnswerId, r.isCorrect]),
      ).toEqual([
        [questionIds[0], answerIds[0][0], true],
        [questionIds[1], answerIds[1][0], false],
        [questionIds[2], answerIds[2][0], true],
      ]);
    });

    it('câu bỏ trống hoặc không gửi → sai, vẫn có dòng với selected null', async () => {
      const body = pick([null, 1]);
      const res = await submit(tokens.a, body).expect(201);
      const result = (res.body as SubmitQuizResponseDto).result;
      expect(result).toMatchObject({
        correct_answers: 1,
        total_questions: 3,
        score: 3.33,
      });
      expect((res.body as SubmitQuizResponseDto).is_first_attempt).toBe(false);
      const rows = await prisma.userAnswer.findMany({
        where: { resultId: result.id },
      });
      expect(rows).toHaveLength(3);
      expect(rows.filter((r) => r.selectedAnswerId === null)).toHaveLength(2);
    });

    it('client gửi score/correct_answers/is_correct/user_id → 400, không ghi', async () => {
      const before = await prisma.userQuizResult.count({ where: { quizId } });
      for (const extra of [
        { score: 10 },
        { correct_answers: 3 },
        { user_id: userIds.b },
        { total_questions: 1 },
      ]) {
        await submit(tokens.a, { ...pick([0, 1, 0]), ...extra }).expect(400);
      }
      await submit(tokens.a, {
        answers: [
          {
            question_id: questionIds[0],
            selected_answer_id: answerIds[0][1],
            is_correct: true,
          },
        ],
        time_spent_seconds: 1,
      }).expect(400);
      expect(await prisma.userQuizResult.count({ where: { quizId } })).toBe(
        before,
      );
    });

    it('đáp án của câu khác / câu ngoài đề / gửi trùng → 400 INVALID_ANSWER', async () => {
      const bad = [
        [{ question_id: questionIds[0], selected_answer_id: answerIds[1][1] }],
        [{ question_id: 999999, selected_answer_id: null }],
        [
          { question_id: questionIds[0], selected_answer_id: answerIds[0][0] },
          { question_id: questionIds[0], selected_answer_id: answerIds[0][1] },
        ],
      ];
      for (const answers of bad) {
        const res = await submit(tokens.a, {
          answers,
          time_spent_seconds: 1,
        }).expect(400);
        expect((res.body as { code: string }).code).toBe('INVALID_ANSWER');
      }
    });

    it('time_spent_seconds < 1 → 400; quiz không tồn tại → 404', async () => {
      await submit(tokens.a, { answers: [], time_spent_seconds: 0 }).expect(
        400,
      );
      const res = await submit(
        tokens.a,
        { answers: [], time_spent_seconds: 1 },
        999999,
      ).expect(404);
      expect((res.body as { code: string }).code).toBe('QUIZ_NOT_FOUND');
    });

    it('quiz không có câu nào → score 0, total 0', async () => {
      const res = await submit(
        tokens.b,
        { answers: [], time_spent_seconds: 5 },
        emptyQuizId,
      ).expect(201);
      expect((res.body as SubmitQuizResponseDto).result).toMatchObject({
        score: 0,
        correct_answers: 0,
        total_questions: 0,
      });
    });
  });

  describe('xem kết quả', () => {
    let resultA = 0;

    beforeAll(async () => {
      const res = await submit(tokens.a, pick([0, 1, 0])).expect(201);
      resultA = (res.body as SubmitQuizResponseDto).result.id;
    });

    it('latest trả lần nộp mới nhất của chính mình; người chưa nộp → null', async () => {
      const mine = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/results/latest`)
        .set(bearer(tokens.a))
        .expect(200);
      expect((mine.body as LatestQuizResultResponseDto).result).toMatchObject({
        id: resultA,
        score: 10,
      });
      const none = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/results/latest`)
        .set(bearer(tokens.b))
        .expect(200);
      expect(none.body).toEqual({ result: null });
    });

    it('chủ xem được kết quả và chi tiết; người khác 404 và []', async () => {
      const own = await http()
        .get(`/api/v1/assessment/results/${resultA}`)
        .set(bearer(tokens.a))
        .expect(200);
      expect((own.body as QuizResultDto).id).toBe(resultA);
      const ownAnswers = await http()
        .get(`/api/v1/assessment/results/${resultA}/answers`)
        .set(bearer(tokens.a))
        .expect(200);
      expect(
        (ownAnswers.body as UserAnswerDto[]).map((x) => x.is_correct),
      ).toEqual([true, true, true]);

      const other = await http()
        .get(`/api/v1/assessment/results/${resultA}`)
        .set(bearer(tokens.b))
        .expect(404);
      expect((other.body as { code: string }).code).toBe('RESULT_NOT_FOUND');
      const otherAnswers = await http()
        .get(`/api/v1/assessment/results/${resultA}/answers`)
        .set(bearer(tokens.b))
        .expect(200);
      expect(otherAnswers.body).toEqual([]);
    });

    it('admin xem được kết quả và chi tiết của người khác', async () => {
      await http()
        .get(`/api/v1/assessment/results/${resultA}`)
        .set(bearer(tokens.admin))
        .expect(200);
      const res = await http()
        .get(`/api/v1/assessment/results/${resultA}/answers`)
        .set(bearer(tokens.admin))
        .expect(200);
      expect(res.body).toHaveLength(3);
    });

    it('/review sau khi nộp: đủ is_correct và lời giải; admin xem được khi chưa nộp', async () => {
      const res = await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/review`)
        .set(bearer(tokens.a))
        .expect(200);
      const qs = res.body as ReviewQuestionDto[];
      expect(qs.map((q) => q.id)).toEqual(questionIds);
      expect(qs[1].explanation).toBe('Giải thích 2');
      expect(qs[1].answers.map((x) => x.is_correct)).toEqual([false, true]);
      await http()
        .get(`/api/v1/assessment/quizzes/${quizId}/review`)
        .set(bearer(tokens.admin))
        .expect(200);
    });

    it('route cần đăng nhập không token → 401', async () => {
      for (const path of [
        `/api/v1/assessment/quizzes/${quizId}/review`,
        `/api/v1/assessment/quizzes/${quizId}/results/latest`,
        `/api/v1/assessment/results/${resultA}`,
        `/api/v1/assessment/results/${resultA}/answers`,
      ]) {
        await http().get(path).expect(401);
      }
    });
  });
});
