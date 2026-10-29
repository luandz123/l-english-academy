import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  FullTestAnswerDetailDto,
  FullTestQuestionDto,
  FullTestResultDto,
} from '../src/modules/assessment/dto';

/**
 * Cũ: đề + đáp án đọc công khai, client tự chấm và tự ghi điểm; quyền theo khóa trên URL,
 * ghi danh hết hạn vẫn vào được. Mới: câu hỏi chỉ trả khi được vào khóa của đề
 * (canAccessCourse), server chấm/quy đổi ETS, kết quả chỉ chủ hoặc admin xem.
 */
describe('AssessmentModule — Full Test (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@fulltest.test';
  const tokens = { a: '', b: '', expired: '', admin: '' };
  let paidTestId = 0;
  let freeTestId = 0;
  /** câu theo Part của đề trả phí: part → [{ id, correct, wrong }] */
  const qByPart: Record<
    number,
    { id: number; correct: number; wrong: number }[]
  > = {};

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-ft]' } },
    });
    await prisma.quiz.deleteMany({
      where: { title: { startsWith: '[e2e-ft]' } },
    });
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
  }

  async function userWithToken(email: string) {
    const user = await prisma.user.create({
      data: { email, emailVerifiedAt: new Date() },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  async function makeTest(
    courseId: number,
    title: string,
    parts: number[],
    perPart: number,
  ) {
    const test = await prisma.fullTest.create({ data: { courseId, title } });
    for (const part of parts) {
      const quiz = await prisma.quiz.create({
        data: { title: `[e2e-ft] ${title} P${part}` },
      });
      await prisma.fullTestSection.create({
        data: { testId: test.id, partNumber: part, quizId: quiz.id },
      });
      qByPart[part] = qByPart[part] ?? [];
      for (let i = 0; i < perPart; i++) {
        const q = await prisma.question.create({
          data: {
            quizId: quiz.id,
            questionText: `P${part}.${i}`,
            displayOrder: i,
            explanation: 'giải',
          },
        });
        const correct = await prisma.answer.create({
          data: {
            questionId: q.id,
            answerText: 'A',
            isCorrect: true,
            displayOrder: 0,
          },
        });
        const wrong = await prisma.answer.create({
          data: {
            questionId: q.id,
            answerText: 'B',
            isCorrect: false,
            displayOrder: 1,
          },
        });
        if (title.includes('paid'))
          qByPart[part].push({
            id: q.id,
            correct: correct.id,
            wrong: wrong.id,
          });
      }
    }
    return test.id;
  }

  /** Bài nộp: chọn đúng nếu `isRight(part, i)`. */
  function body(
    parts: number[],
    isRight: (part: number, i: number) => boolean,
    extra: object = {},
  ) {
    const answers = parts.flatMap((p) =>
      qByPart[p].map((q, i) => ({
        question_id: q.id,
        selected_answer_id: isRight(p, i) ? q.correct : q.wrong,
      })),
    );
    const answers_map = Object.fromEntries(
      answers.map((a, i) => [String(i), a.selected_answer_id]),
    );
    return {
      answers,
      selected_parts: parts,
      test_mode: 'exam',
      time_spent_seconds: 1200,
      pause_count: 1,
      time_allocated_minutes: 120,
      answers_map,
      ...extra,
    };
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

    const paid = await prisma.course.create({
      data: { title: '[e2e-ft] paid', courseType: 'fulltest' },
    });
    const free = await prisma.course.create({
      data: { title: '[e2e-ft] free', courseType: 'fulltest', isFree: true },
    });
    paidTestId = await makeTest(paid.id, 'paid', [1, 2, 3, 4, 5, 6, 7], 4);
    freeTestId = await makeTest(free.id, 'free', [5], 2);

    const a = await userWithToken(`a${SUFFIX}`);
    const b = await userWithToken(`b${SUFFIX}`);
    const expired = await userWithToken(`expired${SUFFIX}`);
    const admin = await userWithToken(`admin${SUFFIX}`);
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    await prisma.enrollment.create({
      data: { userId: a.id, courseId: paid.id },
    });
    await prisma.enrollment.create({
      data: {
        userId: expired.id,
        courseId: paid.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    Object.assign(tokens, {
      a: a.token,
      b: b.token,
      expired: expired.token,
      admin: admin.token,
    });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  const questions = (id: number, token?: string) => {
    const req = http().get(`/api/v1/assessment/full-tests/${id}/questions`);
    return token ? req.set(bearer(token)) : req;
  };
  const submit = (token: string, b: object, id = paidTestId) =>
    http()
      .post(`/api/v1/assessment/full-tests/${id}/submit`)
      .set(bearer(token))
      .send(b);
  const code = (res: { body: unknown }) => (res.body as { code: string }).code;

  describe('quyền vào đề', () => {
    it('đề trả phí: khách, chưa mua, ghi danh hết hạn → 403 FULLTEST_LOCKED', async () => {
      for (const t of [undefined, tokens.b, tokens.expired]) {
        expect(code(await questions(paidTestId, t).expect(403))).toBe(
          'FULLTEST_LOCKED',
        );
      }
    });

    it('đã ghi danh và admin → câu hỏi kèm part_number và đáp án, sắp theo Part', async () => {
      const res = await questions(paidTestId, tokens.a).expect(200);
      const qs = res.body as FullTestQuestionDto[];
      expect(qs).toHaveLength(28);
      expect(qs.map((q) => q.part_number)).toEqual(
        [...qs.map((q) => q.part_number)].sort(),
      );
      expect(qs[0].answers.some((x) => x.is_correct === true)).toBe(true);
      await questions(paidTestId, tokens.admin).expect(200);
    });

    it('khóa free → khách cũng vào được; đề không tồn tại → []', async () => {
      await questions(freeTestId).expect(200);
      expect((await questions(999999).expect(200)).body).toEqual([]);
      await http().get('/api/v1/assessment/full-tests/999999').expect(404);
    });

    it('chưa mua nộp bài → 403, không ghi', async () => {
      const before = await prisma.userFullTestResult.count();
      expect(
        code(
          await submit(
            tokens.b,
            body([5], () => true),
          ).expect(403),
        ),
      ).toBe('FULLTEST_LOCKED');
      expect(await prisma.userFullTestResult.count()).toBe(before);
    });
  });

  describe('chấm ở server', () => {
    it('đủ 7 Part đúng hết → 990, ghi đủ chi tiết kèm part', async () => {
      const res = await submit(
        tokens.a,
        body([1, 2, 3, 4, 5, 6, 7], () => true),
      ).expect(201);
      const r = res.body as FullTestResultDto;
      expect(r).toMatchObject({
        total_score: 990,
        listening_score: 495,
        reading_score: 495,
        correct_answers: 28,
        total_questions: 28,
        listening_correct: 16,
        reading_correct: 12,
        test_mode: 'exam',
        pause_count: 1,
        time_spent_seconds: 1200,
      });
      const details = await prisma.fullTestAnswerDetail.findMany({
        where: { resultId: r.id },
      });
      expect(details).toHaveLength(28);
      expect(details.every((d) => d.isCorrect && d.partNumber)).toBe(true);
      const meta = (r.answers_detail as { _meta: { total_in_test: number } })
        ._meta;
      expect(meta.total_in_test).toBe(28);
    });

    it('chỉ Part 5, đúng 2/4 → tổng = round(2/4 × 990); câu bỏ trống tính sai', async () => {
      const b = body([5], (_p, i) => i < 2);
      b.answers = b.answers.slice(0, 3); // câu thứ 4 bỏ trống
      const r = (await submit(tokens.a, b).expect(201))
        .body as FullTestResultDto;
      expect(r).toMatchObject({
        total_questions: 4,
        correct_answers: 2,
        total_score: Math.round((2 / 4) * 990),
      });
      const details = await prisma.fullTestAnswerDetail.findMany({
        where: { resultId: r.id },
      });
      expect(details).toHaveLength(4);
      expect(details.filter((d) => d.selectedAnswerId === null)).toHaveLength(
        1,
      );
    });

    it('gửi điểm/số câu đúng → 400; câu ngoài Part đã chọn, trùng câu, đáp án câu khác → 400', async () => {
      await submit(
        tokens.a,
        body([5], () => true, { total_score: 990 }),
      ).expect(400);
      await submit(
        tokens.a,
        body([5], () => true, { correct_answers: 4 }),
      ).expect(400);
      const p1 = qByPart[1][0];
      const p5 = qByPart[5][0];
      for (const answers of [
        [{ question_id: p1.id, selected_answer_id: p1.correct }],
        [
          { question_id: p5.id, selected_answer_id: p5.correct },
          { question_id: p5.id, selected_answer_id: p5.wrong },
        ],
        [{ question_id: p5.id, selected_answer_id: p1.correct }],
      ]) {
        expect(
          code(
            await submit(tokens.a, {
              ...body([5], () => true),
              answers,
            }).expect(400),
          ),
        ).toBe('INVALID_ANSWER');
      }
      await submit(
        tokens.a,
        body([5], () => true, { selected_parts: [5, 5] }),
      ).expect(400);
      await submit(
        tokens.a,
        body([5], () => true, { selected_parts: [8] }),
      ).expect(400);
    });
  });

  describe('xem kết quả', () => {
    it('chủ và admin xem được kết quả + chi tiết; người khác 404 và []; latest trả lần mới nhất', async () => {
      const r = (
        await submit(
          tokens.a,
          body([6], () => true),
        ).expect(201)
      ).body as FullTestResultDto;
      await http()
        .get(`/api/v1/assessment/full-test-results/${r.id}`)
        .set(bearer(tokens.a))
        .expect(200);
      await http()
        .get(`/api/v1/assessment/full-test-results/${r.id}`)
        .set(bearer(tokens.admin))
        .expect(200);
      expect(
        code(
          await http()
            .get(`/api/v1/assessment/full-test-results/${r.id}`)
            .set(bearer(tokens.b))
            .expect(404),
        ),
      ).toBe('RESULT_NOT_FOUND');
      const own = await http()
        .get(`/api/v1/assessment/full-test-results/${r.id}/answers`)
        .set(bearer(tokens.a))
        .expect(200);
      expect((own.body as FullTestAnswerDetailDto[]).length).toBe(4);
      const other = await http()
        .get(`/api/v1/assessment/full-test-results/${r.id}/answers`)
        .set(bearer(tokens.b))
        .expect(200);
      expect(other.body).toEqual([]);
      const latest = await http()
        .get(`/api/v1/assessment/full-tests/${paidTestId}/results/latest`)
        .set(bearer(tokens.a))
        .expect(200);
      expect((latest.body as { result: FullTestResultDto }).result.id).toBe(
        r.id,
      );
      const none = await http()
        .get(`/api/v1/assessment/full-tests/${paidTestId}/results/latest`)
        .set(bearer(tokens.b))
        .expect(200);
      expect(none.body).toEqual({ result: null });
    });
  });
});
