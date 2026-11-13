/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return -- phản hồi JSON trong e2e được kiểm bằng expect */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import { DIAGNOSTIC_SET_KEY } from '../src/modules/practice/diagnostic.service';

type Body = Record<string, any>;
const as = (res: { body: unknown }): Body => res.body as Body;

/**
 * Phân tích & cá nhân hóa (D14, tính năng mới — không có RLS cũ). Quy tắc kiểm tra:
 * - Mọi endpoint cần đăng nhập; chỉ dữ liệu của chính người gọi; so sánh lượt của người khác → 404.
 * - Số liệu chỉ từ lượt đã nộp; dạng câu chỉ kết luận khi ≥ 10 câu.
 * - "Chỉ câu chưa làm" không lấy lại câu đã gặp; thiếu câu → 422 kèm số câu còn lại.
 * - Bài kiểm tra trình độ: kết quả chỉ của chủ lượt; admin mới tạo lại bộ câu.
 * - Lộ trình dùng kết quả chẩn đoán làm điểm xuất phát và có "Việc tuần này" chốt theo tuần.
 */
describe('AnalyticsModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@analytics.test';
  const TAG = '[e2e-analytics]';
  const t = { a: '', b: '', admin: '' };
  const ids = { a: '', b: '', admin: '' };
  const p5: { id: number; correct: number; wrong: number }[] = [];
  const full: { id: number; correct: number; wrong: number }[] = [];
  let fullTestId = 0;
  let otherTestId = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.quiz.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.fullTest.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.platformSetting.deleteMany({
      where: { key: DIAGNOSTIC_SET_KEY },
    });
  }

  async function addQuestion(
    quizId: number,
    text: string,
    order: number,
    opts: string[],
  ) {
    const q = await prisma.question.create({
      data: { quizId, questionText: text, displayOrder: order },
    });
    const made = [];
    for (let k = 0; k < opts.length; k++) {
      made.push(
        await prisma.answer.create({
          data: {
            questionId: q.id,
            answerText: opts[k],
            isCorrect: k === 0,
            displayOrder: k,
          },
        }),
      );
    }
    return { id: q.id, correct: made[0].id, wrong: made[1].id };
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

    const course = await prisma.course.create({
      data: {
        title: `${TAG} Free`,
        courseType: 'fulltest',
        isActive: true,
        isFree: true,
      },
    });
    // Đề luyện: Part 5 có 20 câu dạng Từ vựng
    const test1 = await prisma.fullTest.create({
      data: { courseId: course.id, title: `${TAG} Đề 2025 - Đề số 01` },
    });
    otherTestId = test1.id;
    const quiz5 = await prisma.quiz.create({ data: { title: `${TAG} P5` } });
    await prisma.fullTestSection.create({
      data: { testId: test1.id, partNumber: 5, quizId: quiz5.id },
    });
    for (let i = 0; i < 20; i++) {
      p5.push(
        await addQuestion(quiz5.id, `The team will ____ the plan ${i}.`, i, [
          'schedule',
          'reservation',
          'payment',
          'agenda',
        ]),
      );
    }
    // Part 2 có audio riêng từng câu (để bài chẩn đoán có cả Listening)
    const quiz2 = await prisma.quiz.create({ data: { title: `${TAG} P2` } });
    await prisma.fullTestSection.create({
      data: { testId: test1.id, partNumber: 2, quizId: quiz2.id },
    });
    for (let i = 0; i < 8; i++) {
      const q = await addQuestion(quiz2.id, 'Where is the meeting?', i, [
        'In room B.',
        'Yes, it is.',
        'At noon.',
      ]);
      await prisma.question.update({
        where: { id: q.id },
        data: { audioUrl: `https://example.com/a${i}.mp3` },
      });
    }
    // Đề đủ 7 Part (mỗi Part 1 câu) để có điểm quy đổi và so sánh
    const test2 = await prisma.fullTest.create({
      data: { courseId: course.id, title: `${TAG} Đề 2024 - Đề số 02` },
    });
    fullTestId = test2.id;
    for (let part = 1; part <= 7; part++) {
      const quiz = await prisma.quiz.create({
        data: { title: `${TAG} full P${part}` },
      });
      await prisma.fullTestSection.create({
        data: { testId: test2.id, partNumber: part, quizId: quiz.id },
      });
      full.push(
        await addQuestion(quiz.id, `Full question ${part}?`, 0, [
          'he',
          'him',
          'his',
          'himself',
        ]),
      );
    }
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  const submitFull = (token: string, picks: (number | null)[]) =>
    http()
      .post(`/api/v1/assessment/full-tests/${fullTestId}/submit`)
      .set(auth(token))
      .send({
        answers: full.map((q, i) => ({
          question_id: q.id,
          selected_answer_id: picks[i],
        })),
        selected_parts: [1, 2, 3, 4, 5, 6, 7],
        test_mode: 'exam',
        time_spent_seconds: 600,
        pause_count: 0,
        time_allocated_minutes: 120,
        answers_map: {},
      })
      .expect(201);

  it('chưa đăng nhập → 401', async () => {
    for (const path of [
      'weaknesses',
      'progress',
      'compare?ids=1,2',
      'recommendations',
    ]) {
      await http().get(`/api/v1/analytics/${path}`).expect(401);
    }
    await http().get('/api/v1/practice/diagnostic').expect(401);
  });

  it('người mới: trạng thái trống, không có số mặc định', async () => {
    const w = as(
      await http()
        .get('/api/v1/analytics/weaknesses')
        .set(auth(t.a))
        .expect(200),
    );
    expect(w).toMatchObject({ state: 'empty', top: [] });
    expect(w.parts).toHaveLength(7);
    const p = as(
      await http().get('/api/v1/analytics/progress').set(auth(t.a)).expect(200),
    );
    expect(p).toMatchObject({
      state: 'empty',
      estimate: null,
      score_points: [],
    });
    expect(p.weekly).toHaveLength(8);
  });

  it('điểm yếu sau một lượt luyện: đủ 10 câu mới kết luận; "chỉ câu chưa làm" không lặp câu', async () => {
    const s = as(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'question_type',
          parts: [5],
          categories: ['vocabulary'],
          count: 12,
          mode: 'test',
          order: 'sequential',
        })
        .expect(201),
    );
    const byId = new Map(p5.map((q) => [q.id, q]));
    const detail = as(
      await http()
        .get(`/api/v1/practice/sessions/${s.id}`)
        .set(auth(t.a))
        .expect(200),
    );
    const used = (detail.questions as Body[]).map((q) => q.id as number);
    for (const [i, qid] of used.entries()) {
      await http()
        .put(`/api/v1/practice/sessions/${s.id}/answers`)
        .set(auth(t.a))
        .send({
          question_id: qid,
          selected_answer_id:
            i < 3 ? byId.get(qid)!.correct : byId.get(qid)!.wrong,
        })
        .expect(200);
    }
    await http()
      .post(`/api/v1/practice/sessions/${s.id}/submit`)
      .set(auth(t.a))
      .expect(200);
    const timed = await prisma.practiceAnswer.count({
      where: { sessionId: s.id, timeSeconds: { not: null } },
    });
    expect(timed).toBeGreaterThanOrEqual(0);

    const w = as(
      await http()
        .get('/api/v1/analytics/weaknesses')
        .set(auth(t.a))
        .expect(200),
    );
    expect(w.state).toBe('ready');
    expect(w.top[0]).toMatchObject({
      part: 5,
      category: 'vocabulary',
      answered: 12,
      correct: 3,
      accuracy: 25,
      level: 'weak',
    });
    expect(w.top[0].practice).toMatchObject({
      action: 'practice',
      available: 8,
    });
    expect(w.summary).toMatchObject({ answered: 12, attempts: 1 });
    // Người khác không thấy dữ liệu của a
    expect(
      as(
        await http()
          .get('/api/v1/analytics/weaknesses')
          .set(auth(t.b))
          .expect(200),
      ).state,
    ).toBe('empty');
    // Chỉ Listening → chưa có dữ liệu Listening
    const l = as(
      await http()
        .get('/api/v1/analytics/weaknesses')
        .query({ skill: 'listening' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(l.parts.map((p: Body) => p.part)).toEqual([1, 2, 3, 4]);
    await http()
      .get('/api/v1/analytics/weaknesses')
      .query({ window: '15' })
      .set(auth(t.a))
      .expect(400);

    const lack = await http()
      .post('/api/v1/practice/sessions')
      .set(auth(t.a))
      .send({
        kind: 'question_type',
        parts: [5],
        categories: ['vocabulary'],
        count: 10,
        mode: 'practice',
        unseen_only: true,
      })
      .expect(422);
    expect(as(lack).details).toEqual({ available: 8 });
    const fresh = as(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'question_type',
          parts: [5],
          categories: ['vocabulary'],
          count: 8,
          mode: 'practice',
          unseen_only: true,
        })
        .expect(201),
    );
    const freshQs = as(
      await http()
        .get(`/api/v1/practice/sessions/${fresh.id}`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(
      (freshQs.questions as Body[]).some((q) => used.includes(q.id as number)),
    ).toBe(false);
    await http()
      .post(`/api/v1/practice/sessions/${fresh.id}/abandon`)
      .set(auth(t.a))
      .expect(204);
  });

  let r1 = 0;
  let r2 = 0;
  it('so sánh 2 lượt Full Test cùng đề: điểm, Part, câu sai → đúng; người khác → 404', async () => {
    r1 = as(
      await submitFull(
        t.a,
        full.map((q, i) => (i < 3 ? q.correct : q.wrong)),
      ),
    ).id as number;
    r2 = as(
      await submitFull(
        t.a,
        full.map((q, i) => (i < 5 ? q.correct : i === 6 ? null : q.wrong)),
      ),
    ).id as number;

    const c = as(
      await http()
        .get('/api/v1/analytics/compare')
        .query({ ids: `${r2},${r1}` })
        .set(auth(t.a))
        .expect(200),
    );
    expect(c.attempts.map((x: Body) => x.id)).toEqual([r1, r2]);
    expect(c.same_test).toBe(true);
    expect(c.score_diff.total).toEqual(expect.any(Number));
    expect(c.parts).toHaveLength(7);
    expect(c.questions.fixed).toHaveLength(2);
    expect(c.questions.still_wrong).toHaveLength(2);
    expect(c.questions.still_right).toHaveLength(3);
    expect(c.questions.accessible).toBe(true);

    await http()
      .get('/api/v1/analytics/compare')
      .query({ ids: `${r1},${r2}` })
      .set(auth(t.b))
      .expect(404);
    await http()
      .get('/api/v1/analytics/compare')
      .query({ ids: `${r1}` })
      .set(auth(t.a))
      .expect(400);
    await http()
      .get('/api/v1/analytics/compare')
      .query({ ids: `${r1},${r1}` })
      .set(auth(t.a))
      .expect(400);

    // "Luyện lại N câu này" từ danh sách câu
    const retry = as(
      await http()
        .post('/api/v1/practice/sessions')
        .set(auth(t.a))
        .send({
          kind: 'questions',
          question_ids: c.questions.still_wrong.map((q: Body) => q.question_id),
          mode: 'practice',
        })
        .expect(201),
    );
    expect(retry).toMatchObject({ kind: 'retry', total_questions: 2 });
    await http()
      .post(`/api/v1/practice/sessions/${retry.id}/abandon`)
      .set(auth(t.a))
      .expect(204);
  });

  it('tiến độ: điểm ước lượng từ Full Test đủ 7 Part, lịch sử, hoạt động theo tuần', async () => {
    const p = as(
      await http().get('/api/v1/analytics/progress').set(auth(t.a)).expect(200),
    );
    expect(p.state).toBe('full');
    expect(p.score_points).toHaveLength(2);
    expect(p.estimate).toMatchObject({ source: 'full_test' });
    expect(p.change_30d).toEqual(expect.any(Number));
    expect(p.history.length).toBeGreaterThanOrEqual(3);
    const week = p.weekly[7];
    expect(week.reading + week.listening).toBeGreaterThan(0);
  });

  it('đề xuất đề: đề chưa làm lên trước, có lý do; "Không phải lúc này" ẩn 7 ngày', async () => {
    const r = as(
      await http()
        .get('/api/v1/analytics/recommendations')
        .set(auth(t.a))
        .expect(200),
    );
    expect(r.kind).toBe('exam');
    expect(r.primary.reasons.length).toBeGreaterThan(0);
    const first = r.primary.test_id as number;
    await http()
      .post(`/api/v1/analytics/recommendations/${first}/skip`)
      .set(auth(t.a))
      .expect(204);
    const again = as(
      await http()
        .get('/api/v1/analytics/recommendations')
        .set(auth(t.a))
        .expect(200),
    );
    expect(again.primary?.test_id).not.toBe(first);
    await http()
      .post('/api/v1/analytics/recommendations/99999999/skip')
      .set(auth(t.a))
      .expect(404);
    expect([otherTestId, fullTestId]).toContain(first);
  });

  let diagId = '';
  it('bài kiểm tra trình độ: tự rút bộ câu, làm như lượt Test, kết quả chỉ của chủ lượt', async () => {
    const st = as(
      await http()
        .get('/api/v1/practice/diagnostic')
        .set(auth(t.b))
        .expect(200),
    );
    expect(st.available).toBe(true);
    expect(st.total_questions).toBeGreaterThan(0);
    const s1 = as(
      await http()
        .post('/api/v1/practice/diagnostic')
        .set(auth(t.b))
        .send({})
        .expect(200),
    );
    const s2 = as(
      await http()
        .post('/api/v1/practice/diagnostic')
        .set(auth(t.b))
        .send({})
        .expect(200),
    );
    expect(s2.id).toBe(s1.id);
    expect(s1).toMatchObject({ kind: 'diagnostic', mode: 'test' });
    diagId = s1.id as string;

    const detail = as(
      await http()
        .get(`/api/v1/practice/sessions/${diagId}`)
        .set(auth(t.b))
        .expect(200),
    );
    for (const q of detail.questions as Body[]) {
      await http()
        .put(`/api/v1/practice/sessions/${diagId}/answers`)
        .set(auth(t.b))
        .send({
          question_id: q.id,
          selected_answer_id: (q.answers as Body[])[0].id,
        })
        .expect(200);
    }
    await http()
      .get(`/api/v1/practice/diagnostic/${diagId}/report`)
      .set(auth(t.b))
      .expect(403);
    await http()
      .post(`/api/v1/practice/sessions/${diagId}/submit`)
      .set(auth(t.b))
      .expect(200);
    const rep = as(
      await http()
        .get(`/api/v1/practice/diagnostic/${diagId}/report`)
        .set(auth(t.b))
        .expect(200),
    );
    expect(rep.usable).toBe(true);
    expect(rep.parts).toHaveLength(7);
    await http()
      .get(`/api/v1/practice/diagnostic/${diagId}/report`)
      .set(auth(t.a))
      .expect(404);

    await http()
      .post('/api/v1/practice/admin/diagnostic/regenerate')
      .set(auth(t.b))
      .expect(403);
    const admin = as(
      await http()
        .post('/api/v1/practice/admin/diagnostic/regenerate')
        .set(auth(t.admin))
        .expect(201),
    );
    expect(admin.available).toBe(true);
  });

  it('lộ trình: điểm xuất phát từ bài chẩn đoán; có trọng tâm và "Việc tuần này" chốt theo tuần', async () => {
    const placement = as(
      await http().get('/api/v1/roadmap/placement').set(auth(t.b)).expect(200),
    );
    expect(placement.diagnostic).toMatchObject({ minutes: 40 });
    expect(placement.latest_result).toMatchObject({
      source: 'diagnostic',
      session_id: diagId,
    });

    const saved = as(
      await http()
        .put('/api/v1/roadmap/me')
        .set(auth(t.b))
        .send({
          current_mode: 'placement',
          target_score: 990,
          purpose: 'job',
          duration_weeks: 12,
          minutes_per_day: 60,
          days_per_week: 5,
        })
        .expect(200),
    );
    expect(saved.current_score).toBe(placement.latest_result.estimated_score);
    expect(saved.personal.week.tasks.length).toBeGreaterThan(0);

    // a có điểm yếu từ phân tích → trọng tâm + tỉ trọng điều chỉnh
    const ra = as(
      await http()
        .put('/api/v1/roadmap/me')
        .set(auth(t.a))
        .send({
          current_mode: 'score',
          current_score: 400,
          target_score: 700,
          purpose: 'job',
          duration_weeks: 12,
          minutes_per_day: 60,
          days_per_week: 5,
        })
        .expect(200),
    );
    expect(ra.personal.focus_source).toBe('analysis');
    expect(ra.personal.focus[0]).toMatchObject({
      part: 5,
      category: 'vocabulary',
      achieved: false,
    });
    expect(ra.personal.adjustment_note).toEqual(expect.any(String));
    const again = as(
      await http().get('/api/v1/roadmap/me').set(auth(t.a)).expect(200),
    );
    expect(again.roadmap.personal.week.tasks).toEqual(ra.personal.week.tasks);
    expect(
      await prisma.roadmapWeekPlan.count({ where: { userId: ids.a } }),
    ).toBe(1);
  });
});
