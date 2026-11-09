import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  DailyChallengeDto,
  MistakeListDto,
  MistakeSummaryDto,
  PracticeCatalogDto,
  SaveAnswerResultDto,
  SessionDetailDto,
  SessionResultDto,
  SessionSummaryDto,
} from '../src/modules/practice/dto/practice.dto';
import type {
  AdminExamDto,
  ExamCardDto,
  ExamLibraryDto,
  FavoriteExamDto,
  ReportDto,
} from '../src/modules/practice/dto/library.dto';

type ErrorBody = { code: string; details?: { available?: number } };
const as = <T>(res: { body: unknown }): T => res.body as T;

/**
 * Luyện đề (tính năng mới, không có RLS cũ). Quy tắc kiểm tra:
 * - Cần đăng nhập; lượt luyện / sổ câu sai / yêu thích chỉ của chính mình (người khác → 404).
 * - Kho câu = câu thuộc đề học viên có quyền (khóa free / ghi danh còn hạn / admin).
 * - Đề trả về không kèm đáp án đúng; đáp án chỉ lộ khi câu đã chốt hoặc lượt đã nộp. Server chấm.
 * - Sổ câu sai: tự ghi khi nộp (lượt luyện + Full Test), không trùng dòng, làm đúng → "fixed" không xóa.
 * - Admin: chỉ admin xác minh đề (đủ 9 mục), sửa nội dung đề đã xác minh → needs_review.
 */
describe('PracticeModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@practice.test';
  const TAG = '[e2e-practice]';
  const t = { a: '', b: '', admin: '' };
  const ids = { a: '', b: '', admin: '' };
  let freeTestId = 0;
  let paidTestId = 0;
  const p5Free: { id: number; correct: number; wrong: number }[] = [];
  const p5Paid: { id: number; correct: number; wrong: number }[] = [];

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.quiz.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.fullTest.deleteMany({ where: { title: { startsWith: TAG } } });
  }

  async function makeTest(
    courseId: number,
    title: string,
    perPart: number,
    bucket: typeof p5Free,
  ) {
    const test = await prisma.fullTest.create({ data: { courseId, title } });
    const quiz = await prisma.quiz.create({
      data: { title: `${TAG} ${title} P5` },
    });
    await prisma.fullTestSection.create({
      data: { testId: test.id, partNumber: 5, quizId: quiz.id },
    });
    for (let i = 0; i < perPart; i++) {
      const q = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: `The manager ____ the report ${i}.`,
          displayOrder: i,
        },
      });
      const opts = ['schedule', 'reservation', 'payment', 'agenda'];
      const created = [];
      for (let k = 0; k < 4; k++) {
        created.push(
          await prisma.answer.create({
            data: {
              questionId: q.id,
              answerText: opts[k],
              isCorrect: k === 0,
              displayOrder: k,
              explanation: `exp ${k}`,
            },
          }),
        );
      }
      bucket.push({ id: q.id, correct: created[0].id, wrong: created[1].id });
    }
    return test.id;
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

    for (const key of ['a', 'b', 'admin'] as const) {
      const email = `${key}${SUFFIX}`;
      const user = await prisma.user.create({
        data: { email, emailVerifiedAt: new Date() },
      });
      ids[key] = user.id;
      t[key] = (
        await app.get(TokenService).signAccessToken({ id: user.id, email })
      ).accessToken;
    }
    await prisma.userRole.create({
      data: { userId: ids.admin, role: 'admin' },
    });

    const free = await prisma.course.create({
      data: {
        title: `${TAG} Free`,
        courseType: 'fulltest',
        isActive: true,
        isFree: true,
      },
    });
    const paid = await prisma.course.create({
      data: {
        title: `${TAG} Paid`,
        courseType: 'fulltest',
        isActive: true,
        isFree: false,
      },
    });
    freeTestId = await makeTest(
      free.id,
      `${TAG} Đề 2025 - Đề số 01`,
      6,
      p5Free,
    );
    paidTestId = await makeTest(
      paid.id,
      `${TAG} Đề 2024 - Đề số 02`,
      3,
      p5Paid,
    );
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('chưa đăng nhập → 401', async () => {
    await http().get('/api/v1/practice/catalog').expect(401);
    await http().get('/api/v1/practice/library/exams').expect(401);
  });

  it('catalog: gắn nhãn tự động, chỉ đếm câu thuộc đề có quyền', async () => {
    const res = await http()
      .get('/api/v1/practice/catalog')
      .set(auth(t.a))
      .expect(200);
    const cat = as<PracticeCatalogDto>(res);
    expect(cat.parts.map((p) => p.part)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const q = await prisma.question.findUnique({ where: { id: p5Paid[0].id } });
    expect(q).toMatchObject({
      toeicPart: 5,
      questionCategory: 'vocabulary',
      sourceTestId: paidTestId,
      practiceEligible: true,
    });
    const t2 = await prisma.fullTest.findUnique({ where: { id: freeTestId } });
    expect(t2?.year).toBe(2025);

    const adminCat = as<PracticeCatalogDto>(
      await http()
        .get('/api/v1/practice/catalog')
        .set(auth(t.admin))
        .expect(200),
    );
    const sum = (c: PracticeCatalogDto) =>
      c.counts
        .filter((x) => x.part === 5 && x.category === 'vocabulary')
        .reduce((n, x) => n + x.count, 0);
    // Admin thấy thêm 3 câu của đề trả phí
    expect(sum(adminCat) - sum(cat)).toBe(3);
  });

  it('thiếu câu → 422 INSUFFICIENT_QUESTIONS kèm số câu hiện có', async () => {
    const res = await http()
      .post('/api/v1/practice/sessions')
      .set(auth(t.a))
      .send({
        kind: 'question_type',
        parts: [5],
        categories: ['pronoun'],
        count: 100,
        mode: 'test',
      })
      .expect(422);
    expect(as<ErrorBody>(res).code).toBe('INSUFFICIENT_QUESTIONS');
    expect(typeof as<ErrorBody>(res).details?.available).toBe('number');
  });

  it('client không gửi được điểm/đáp án (forbidNonWhitelisted)', async () => {
    await http()
      .post('/api/v1/practice/sessions')
      .set(auth(t.a))
      .send({
        kind: 'question_type',
        parts: [5],
        categories: ['vocabulary'],
        count: 2,
        mode: 'test',
        score: 10,
      })
      .expect(400);
  });

  let testSession = '';
  it('lượt chế độ Test: không lộ đáp án, chấm ở server, ghi sổ câu sai', async () => {
    const created = as<SessionSummaryDto>(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'question_type',
          parts: [5],
          categories: ['vocabulary'],
          count: 3,
          mode: 'test',
          order: 'sequential',
        })
        .expect(201),
    );
    testSession = created.id;
    expect(created.total_questions).toBe(3);
    expect(created.time_limit_seconds).toBeGreaterThan(0);

    const detail = as<SessionDetailDto>(
      await http()
        .get(`/api/v1/practice/sessions/${created.id}`)
        .set(auth(t.a))
        .expect(200),
    );
    const qids = detail.questions.map((q) => q.id);
    expect(new Set(qids).size).toBe(3);
    // Câu của đề trả phí không được chọn cho học viên không có quyền
    expect(qids.some((id) => p5Paid.some((p) => p.id === id))).toBe(false);
    expect(JSON.stringify(detail)).not.toMatch(/is_correct|"explanation"/);
    expect(detail.questions.every((q) => q.feedback === null)).toBe(true);

    // Người khác không xem được
    await http()
      .get(`/api/v1/practice/sessions/${created.id}`)
      .set(auth(t.b))
      .expect(404);

    const byId = new Map(p5Free.map((p) => [p.id, p]));
    const [q1, q2] = qids;
    const save = (qid: number, aid: number) =>
      http()
        .put(`/api/v1/practice/sessions/${created.id}/answers`)
        .set(auth(t.a))
        .send({ question_id: qid, selected_answer_id: aid });
    const r1 = as<SaveAnswerResultDto>(
      await save(q1, byId.get(q1)!.correct).expect(200),
    );
    expect(r1).toEqual({ saved: true, locked: false, feedback: null });
    await save(q2, byId.get(q2)!.wrong).expect(200);
    // Đáp án của câu khác → 400
    await save(q1, byId.get(q2)!.correct).expect(400);

    const result = as<SessionResultDto>(
      await http()
        .post(`/api/v1/practice/sessions/${created.id}/submit`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(result).toMatchObject({
      status: 'submitted',
      correct_count: 1,
      wrong_count: 1,
      unanswered_count: 1,
    });
    expect(result.questions[1].feedback?.correct_answer_id).toBe(
      byId.get(q2)!.correct,
    );
    expect(result.by_part).toEqual([
      { part: 5, total: 3, correct: 1, wrong: 1, unanswered: 1 },
    ]);

    // Sau khi nộp không sửa được
    await save(q1, byId.get(q1)!.wrong).expect(409);

    const summary = as<MistakeSummaryDto>(
      await http()
        .get('/api/v1/practice/mistakes/summary')
        .set(auth(t.a))
        .expect(200),
    );
    expect(summary).toMatchObject({
      total_wrong: 1,
      not_reviewed: 1,
      fixed: 0,
    });
  });

  it('phản hồi ngay: chốt câu, trả đáp án + giải thích, không đổi được', async () => {
    const s = as<SessionSummaryDto>(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'question_type',
          parts: [5],
          categories: ['vocabulary'],
          count: 1,
          mode: 'practice',
          feedback: 'immediate',
        })
        .expect(201),
    );
    const d = as<SessionDetailDto>(
      await http()
        .get(`/api/v1/practice/sessions/${s.id}`)
        .set(auth(t.a))
        .expect(200),
    );
    const q = p5Free.find((p) => p.id === d.questions[0].id)!;
    const r = as<SaveAnswerResultDto>(
      await http()
        .put(`/api/v1/practice/sessions/${s.id}/answers`)
        .set(auth(t.a))
        .send({ question_id: q.id, selected_answer_id: q.wrong })
        .expect(200),
    );
    expect(r.locked).toBe(true);
    expect(r.feedback).toMatchObject({
      is_correct: false,
      correct_answer_id: q.correct,
    });
    const again = await http()
      .put(`/api/v1/practice/sessions/${s.id}/answers`)
      .set(auth(t.a))
      .send({ question_id: q.id, selected_answer_id: q.correct })
      .expect(409);
    expect(as<ErrorBody>(again).code).toBe('ANSWER_LOCKED');
    await http()
      .post(`/api/v1/practice/sessions/${s.id}/abandon`)
      .set(auth(t.a))
      .expect(204);
    const active = await http()
      .get('/api/v1/practice/sessions/active')
      .set(auth(t.a))
      .expect(200);
    expect(as<{ session: unknown }>(active).session).toBeNull();
  });

  it('luyện lại câu sai: làm đúng → "Đã sửa đúng", không xóa lịch sử, không trùng dòng', async () => {
    const retry = as<SessionSummaryDto>(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'retry',
          source_session_id: testSession,
          mode: 'practice',
          feedback: 'end',
        })
        .expect(201),
    );
    expect(retry.total_questions).toBe(2); // 1 sai + 1 bỏ trống
    const list = as<MistakeListDto>(
      await http().get('/api/v1/practice/mistakes').set(auth(t.a)).expect(200),
    );
    expect(list.total).toBe(1);
    const wrongQ = p5Free.find((p) => p.id === list.items[0].question_id)!;
    expect(list.items[0]).toMatchObject({
      wrong_count: 1,
      status: 'not_reviewed',
      correct_answer_id: wrongQ.correct,
      selected_answer_id: wrongQ.wrong,
    });

    await http()
      .put(`/api/v1/practice/sessions/${retry.id}/answers`)
      .set(auth(t.a))
      .send({ question_id: wrongQ.id, selected_answer_id: wrongQ.correct })
      .expect(200);
    await http()
      .post(`/api/v1/practice/sessions/${retry.id}/submit`)
      .set(auth(t.a))
      .expect(200);

    const after = as<MistakeListDto>(
      await http().get('/api/v1/practice/mistakes').set(auth(t.a)).expect(200),
    );
    expect(after.total).toBe(1);
    expect(after.items[0]).toMatchObject({
      status: 'fixed',
      wrong_count: 1,
      review_count: 1,
    });
    const hist = await http()
      .get(`/api/v1/practice/mistakes/${after.items[0].id}/history`)
      .set(auth(t.a))
      .expect(200);
    expect(as<unknown[]>(hist)).toHaveLength(2);
    // Người khác không xem lịch sử
    await http()
      .get(`/api/v1/practice/mistakes/${after.items[0].id}/history`)
      .set(auth(t.b))
      .expect(404);

    // Lọc theo trạng thái
    const fixed = as<MistakeListDto>(
      await http()
        .get('/api/v1/practice/mistakes')
        .query({ statuses: 'fixed' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(fixed.total).toBe(1);
    const notReviewed = as<MistakeListDto>(
      await http()
        .get('/api/v1/practice/mistakes')
        .query({ statuses: 'not_reviewed' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(notReviewed.total).toBe(0);
  });

  it('bookmark: chỉ câu có quyền; bookmark giữ khi trả lời đúng; câu chỉ bookmark bỏ thì biến mất', async () => {
    const locked = await http()
      .put(`/api/v1/practice/mistakes/bookmarks/${p5Paid[0].id}`)
      .set(auth(t.a))
      .expect(403);
    expect(as<ErrorBody>(locked).code).toBe('QUESTION_LOCKED');
    await http()
      .put(`/api/v1/practice/mistakes/bookmarks/${p5Paid[0].id}`)
      .set(auth(t.admin))
      .expect(200);

    const target = p5Free[5];
    await http()
      .put(`/api/v1/practice/mistakes/bookmarks/${target.id}`)
      .set(auth(t.b))
      .expect(200);
    await http()
      .put(`/api/v1/practice/mistakes/bookmarks/${target.id}`)
      .set(auth(t.b))
      .expect(200);
    const ids1 = as<{ question_ids: number[] }>(
      await http()
        .get('/api/v1/practice/mistakes/bookmarks')
        .set(auth(t.b))
        .expect(200),
    );
    expect(ids1.question_ids).toEqual([target.id]);
    const sum = as<MistakeSummaryDto>(
      await http()
        .get('/api/v1/practice/mistakes/summary')
        .set(auth(t.b))
        .expect(200),
    );
    expect(sum).toMatchObject({ bookmarked: 1, total_wrong: 0 });

    await http()
      .delete(`/api/v1/practice/mistakes/bookmarks/${target.id}`)
      .set(auth(t.b))
      .expect(200);
    const list = as<MistakeListDto>(
      await http().get('/api/v1/practice/mistakes').set(auth(t.b)).expect(200),
    );
    expect(list.total).toBe(0);
  });

  it('nộp Full Test → câu sai tự vào sổ câu sai', async () => {
    const q = p5Free[4];
    await http()
      .post(`/api/v1/assessment/full-tests/${freeTestId}/submit`)
      .set(auth(t.b))
      .send({
        answers: [{ question_id: q.id, selected_answer_id: q.wrong }],
        selected_parts: [5],
        test_mode: 'exam',
        time_spent_seconds: 60,
        pause_count: 0,
        time_allocated_minutes: 10,
        answers_map: {},
      })
      .expect(201);
    const list = as<MistakeListDto>(
      await http().get('/api/v1/practice/mistakes').set(auth(t.b)).expect(200),
    );
    expect(list.items.map((i) => i.question_id)).toEqual([q.id]);
    expect(list.items[0].source_test_id).toBe(freeTestId);
  });

  it('thư viện đề: bộ lọc, số đề, trạng thái đã làm, tìm theo mã', async () => {
    const lib = as<ExamLibraryDto>(
      await http()
        .get('/api/v1/practice/library/exams')
        .query({ q: TAG })
        .set(auth(t.b))
        .expect(200),
    );
    const mine = lib.items.filter((i) => i.title.startsWith(TAG));
    expect(mine).toHaveLength(2);
    const freeCard = mine.find((i) => i.id === freeTestId)!;
    expect(freeCard).toMatchObject({
      is_free: true,
      accessible: true,
      user_status: 'in_progress',
      attempts: 1,
      year: 2025,
    });
    expect(mine.find((i) => i.id === paidTestId)).toMatchObject({
      is_free: false,
      accessible: false,
    });

    const premium = as<ExamLibraryDto>(
      await http()
        .get('/api/v1/practice/library/exams')
        .query({ q: TAG, access: 'premium' })
        .set(auth(t.b))
        .expect(200),
    );
    expect(premium.items.map((i) => i.id)).toEqual([paidTestId]);
    const byCode = as<ExamLibraryDto>(
      await http()
        .get('/api/v1/practice/library/exams')
        .query({ q: freeCard.code })
        .set(auth(t.b))
        .expect(200),
    );
    expect(byCode.items.map((i) => i.id)).toEqual([freeTestId]);
    expect(lib.facets.years.length).toBeGreaterThan(0);
    await http()
      .get('/api/v1/practice/library/exams')
      .query({ sort: 'bogus' })
      .set(auth(t.b))
      .expect(400);
  });

  it('yêu thích: mỗi đề một lần, đề bị xóa → báo không còn khả dụng', async () => {
    const extra = await prisma.fullTest.create({
      data: { title: `${TAG} Đề tạm` },
    });
    await http()
      .put(`/api/v1/practice/favorites/${freeTestId}`)
      .set(auth(t.a))
      .expect(200);
    await http()
      .put(`/api/v1/practice/favorites/${freeTestId}`)
      .set(auth(t.a))
      .expect(200);
    await http()
      .put(`/api/v1/practice/favorites/${extra.id}`)
      .set(auth(t.a))
      .expect(200);
    await http()
      .put('/api/v1/practice/favorites/99999999')
      .set(auth(t.a))
      .expect(404);
    await prisma.fullTest.delete({ where: { id: extra.id } });

    const favs = as<FavoriteExamDto[]>(
      await http().get('/api/v1/practice/favorites').set(auth(t.a)).expect(200),
    );
    expect(favs).toHaveLength(2);
    expect(favs.find((f) => f.test_id === extra.id)).toMatchObject({
      available: false,
      exam: null,
      title: `${TAG} Đề tạm`,
    });
    expect(favs.find((f) => f.test_id === freeTestId)?.exam?.favorited).toBe(
      true,
    );
    // Người khác không thấy
    expect(
      as<unknown[]>(
        await http()
          .get('/api/v1/practice/favorites')
          .set(auth(t.b))
          .expect(200),
      ),
    ).toHaveLength(0);
    await http()
      .delete(`/api/v1/practice/favorites/${extra.id}`)
      .set(auth(t.a))
      .expect(200);
  });

  it('xác minh đề: chỉ admin, đủ 9 mục; sửa nội dung → cần duyệt lại', async () => {
    await http().get('/api/v1/practice/admin/exams').set(auth(t.a)).expect(403);
    await http()
      .put(`/api/v1/practice/admin/exams/${freeTestId}/verification`)
      .set(auth(t.a))
      .send({ checklist: Array(9).fill(true), verified: true })
      .expect(403);
    const incomplete = await http()
      .put(`/api/v1/practice/admin/exams/${freeTestId}/verification`)
      .set(auth(t.admin))
      .send({ checklist: [true, true, false], verified: true })
      .expect(400);
    expect(as<ErrorBody>(incomplete).code).toBe('CHECKLIST_INCOMPLETE');
    const ok = as<ExamCardDto>(
      await http()
        .put(`/api/v1/practice/admin/exams/${freeTestId}/verification`)
        .set(auth(t.admin))
        .send({ checklist: Array(9).fill(true), verified: true })
        .expect(200),
    );
    expect(ok.verification_status).toBe('verified');
    expect(ok.verified_at).not.toBeNull();

    const verifiedOnly = as<ExamLibraryDto>(
      await http()
        .get('/api/v1/practice/library/exams')
        .query({ q: TAG, verified: 'verified' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(verifiedOnly.items.map((i) => i.id)).toEqual([freeTestId]);

    // Gắn nhãn (không phải nội dung) không làm mất xác minh
    await http()
      .patch(`/api/v1/practice/admin/questions/${p5Free[0].id}/tags`)
      .set(auth(t.admin))
      .send({ difficulty: 'hard', category: 'word_form' })
      .expect(200);
    expect(
      (await prisma.fullTest.findUnique({ where: { id: freeTestId } }))
        ?.verificationStatus,
    ).toBe('verified');
    await http()
      .patch(`/api/v1/practice/admin/questions/${p5Free[0].id}/tags`)
      .set(auth(t.admin))
      .send({ category: 'single' })
      .expect(400);

    // Sửa nội dung câu hỏi → trigger chuyển sang needs_review
    await prisma.question.update({
      where: { id: p5Free[1].id },
      data: { questionText: 'Edited ____ text.' },
    });
    expect(
      (await prisma.fullTest.findUnique({ where: { id: freeTestId } }))
        ?.verificationStatus,
    ).toBe('needs_review');
    // Câu sửa nội dung được gắn nhãn lại; câu admin đã sửa nhãn giữ nguyên
    await http()
      .post('/api/v1/practice/admin/retag')
      .set(auth(t.admin))
      .send({ test_id: freeTestId })
      .expect(201);
    expect(
      (await prisma.question.findUnique({ where: { id: p5Free[0].id } }))
        ?.questionCategory,
    ).toBe('word_form');

    const exams = as<AdminExamDto[]>(
      await http()
        .get('/api/v1/practice/admin/exams')
        .set(auth(t.admin))
        .expect(200),
    );
    expect(exams.find((e) => e.id === freeTestId)).toMatchObject({
      verification_status: 'needs_review',
      checklist: Array(9).fill(true),
    });
  });

  it('báo lỗi: học viên gửi, admin xử lý', async () => {
    const r = as<ReportDto>(
      await http()
        .post('/api/v1/practice/reports')
        .set(auth(t.a))
        .send({
          question_id: p5Free[0].id,
          reason: 'wrong_answer',
          message: 'Đáp án sai',
        })
        .expect(201),
    );
    expect(r).toMatchObject({ test_id: freeTestId, status: 'open' });
    await http()
      .get('/api/v1/practice/admin/reports')
      .set(auth(t.a))
      .expect(403);
    const list = as<ReportDto[]>(
      await http()
        .get('/api/v1/practice/admin/reports')
        .query({ status: 'open' })
        .set(auth(t.admin))
        .expect(200),
    );
    expect(list.find((x) => x.id === r.id)?.reporter_email).toBe(`a${SUFFIX}`);
    const done = as<ReportDto>(
      await http()
        .patch(`/api/v1/practice/admin/reports/${r.id}`)
        .set(auth(t.admin))
        .send({ status: 'resolved' })
        .expect(200),
    );
    expect(done.resolved_at).not.toBeNull();
  });

  it('Mini Test và Daily Challenge: mỗi ngày một lượt', async () => {
    const bad = await http()
      .post('/api/v1/practice/sessions')
      .set(auth(t.b))
      .send({ kind: 'mini_test', skill: 'reading', count: 7, mode: 'test' })
      .expect(400);
    expect(as<ErrorBody>(bad).code).toBe('INVALID_PRACTICE_CONFIG');
    const mini = as<SessionSummaryDto>(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.b))
        .send({ kind: 'mini_test', parts: [5], count: 5, mode: 'test' })
        .expect(201),
    );
    expect(mini).toMatchObject({ kind: 'mini_test', total_questions: 5 });

    const d1 = as<SessionSummaryDto>(
      await http().post('/api/v1/practice/daily').set(auth(t.b)).expect(200),
    );
    const d2 = as<SessionSummaryDto>(
      await http().post('/api/v1/practice/daily').set(auth(t.b)).expect(200),
    );
    expect(d2.id).toBe(d1.id);
    expect(d1.kind).toBe('daily');
    const status = as<DailyChallengeDto>(
      await http().get('/api/v1/practice/daily').set(auth(t.b)).expect(200),
    );
    expect(status.session?.id).toBe(d1.id);
  });
});
