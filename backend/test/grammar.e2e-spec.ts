/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return -- phản hồi JSON trong e2e được kiểm bằng expect */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

type Body = Record<string, any>;
const as = (res: { body: unknown }): Body => res.body as Body;

/**
 * Ngữ pháp (D16, tính năng mới — không có RLS cũ). Quy tắc kiểm tra:
 * - Khách xem được danh sách chủ điểm, bài học, công thức; làm bài / tiến độ / sổ lỗi / ôn cần đăng nhập.
 * - Lượt bài tập, phiên ôn, lỗi chỉ của chính mình (người khác → 404).
 * - Đáp án không gửi trước khi trả lời; chấm, lịch ôn, XP tính ở server; câu đã trả lời không sửa được.
 * - Câu TOEIC sai không có bản thứ hai: Sổ lỗi ngữ pháp đọc lại từ Sổ câu sai.
 * - Chỉ admin quản trị nội dung và chủ điểm của câu TOEIC.
 */
describe('GrammarModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@grammar.test';
  const TAG = '[e2e-grammar]';
  const t = { a: '', b: '', admin: '' };
  const ids = { a: '', b: '', admin: '' };
  const qs: { id: number; correct: number; wrong: number }[] = [];
  let passiveId = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.quiz.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.fullTest.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.grammarTopic.deleteMany({
      where: { slug: { startsWith: 'e2e-' } },
    });
  }

  /** Đáp án đúng của câu bài tập (đọc thẳng DB — client không bao giờ nhận được trước khi trả lời). */
  async function rightAnswer(exerciseId: number) {
    const e = await prisma.grammarExercise.findUniqueOrThrow({
      where: { id: exerciseId },
    });
    return e.kind === 'fill'
      ? { text: e.acceptedAnswers[0] }
      : { choice: e.answerIndex! };
  }
  async function wrongAnswer(exerciseId: number) {
    const e = await prisma.grammarExercise.findUniqueOrThrow({
      where: { id: exerciseId },
    });
    return e.kind === 'fill'
      ? { text: 'zzz-wrong' }
      : { choice: (e.answerIndex! + 1) % 4 };
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

    // Đề miễn phí có 6 câu Part 5 dạng bị động
    const course = await prisma.course.create({
      data: {
        title: `${TAG} Free`,
        courseType: 'fulltest',
        isActive: true,
        isFree: true,
      },
    });
    const test = await prisma.fullTest.create({
      data: { courseId: course.id, title: `${TAG} Đề 01` },
    });
    const quiz = await prisma.quiz.create({ data: { title: `${TAG} P5` } });
    await prisma.fullTestSection.create({
      data: { testId: test.id, partNumber: 5, quizId: quiz.id },
    });
    for (let i = 0; i < 6; i++) {
      const q = await prisma.question.create({
        data: {
          quizId: quiz.id,
          questionText: `The report ____ yesterday ${i}.`,
          displayOrder: i,
        },
      });
      const opts = ['was submitted', 'submitted', 'submitting', 'submits'];
      const made = [];
      for (let k = 0; k < 4; k++)
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
      qs.push({ id: q.id, correct: made[0].id, wrong: made[1].id });
    }
    passiveId = (
      await prisma.grammarTopic.findUniqueOrThrow({
        where: { slug: 'cau-bi-dong' },
      })
    ).id;
    // Practice gắn nhãn Part/đề nguồn
    await http().get('/api/v1/practice/catalog').set(auth(t.admin)).expect(200);
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('khách: xem danh sách, bài học, công thức; mọi thao tác khác → 401', async () => {
    const ov = as(await http().get('/api/v1/grammar/overview').expect(200));
    expect(ov.topics.length).toBeGreaterThanOrEqual(18);
    expect(ov.level).toBeNull();
    expect(ov.topics[0].status).toBeNull();
    const topic = as(
      await http().get('/api/v1/grammar/topics/cau-bi-dong').expect(200),
    );
    expect(topic.lesson.structure).toContain('be');
    expect(topic.formulas.length).toBeGreaterThan(0);
    expect(topic.progress).toBeNull();
    expect(
      (await http().get('/api/v1/grammar/formulas').expect(200)).body.length,
    ).toBe(ov.topics.length);
    await http().get('/api/v1/grammar/topics/khong-co').expect(404);

    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/exercise-sessions')
      .send({ level: 'basic', count: 10 })
      .expect(401);
    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/toeic-sessions')
      .send({ count: 5, mode: 'practice' })
      .expect(401);
    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/progress')
      .send({ action: 'open' })
      .expect(401);
    await http().get('/api/v1/grammar/review').expect(401);
    await http().get('/api/v1/grammar/mistakes').expect(401);
    await http()
      .get('/api/v1/grammar/category-topic?category=verb_tense')
      .expect(401);
    await http().get('/api/v1/grammar/admin/topics').expect(401);
  });

  it('học viên không vào được API admin → 403', async () => {
    await http().get('/api/v1/grammar/admin/topics').set(auth(t.a)).expect(403);
    await http().post('/api/v1/grammar/admin/retag').set(auth(t.a)).expect(403);
    await http()
      .put(`/api/v1/grammar/admin/questions/${qs[0].id}/topic`)
      .set(auth(t.a))
      .send({ topic_id: passiveId })
      .expect(403);
  });

  it('cấp gợi ý: người mới → hộp chọn mức; chọn tay thì dùng mức đó', async () => {
    const ov = as(
      await http().get('/api/v1/grammar/overview').set(auth(t.a)).expect(200),
    );
    expect(ov.level).toMatchObject({
      level: 'basic',
      source: 'default',
      needs_prompt: true,
    });
    expect(ov.suggestions.length).toBeGreaterThan(0);
    expect(ov.suggestions[0].reason).toBe('Chủ điểm nền tảng');
    const lv = as(
      await http()
        .put('/api/v1/grammar/settings')
        .set(auth(t.a))
        .send({ level: 'intermediate' })
        .expect(200),
    );
    expect(lv).toMatchObject({
      level: 'intermediate',
      source: 'manual',
      needs_prompt: false,
    });
  });

  it('lượt bài tập: không lộ đáp án, chấm ở server, chốt câu, chỉ của chính mình', async () => {
    const s = as(
      await http()
        .post('/api/v1/grammar/topics/cau-bi-dong/exercise-sessions')
        .set(auth(t.a))
        .send({ level: 'basic', count: 10, kind: 'all', allow_less: true })
        .expect(201),
    );
    expect(s.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(s.items)).not.toMatch(/answer_index|accepted/);
    // người khác → 404
    await http()
      .get(`/api/v1/grammar/sessions/${s.id}`)
      .set(auth(t.b))
      .expect(404);
    await http()
      .post(`/api/v1/grammar/sessions/${s.id}/answers`)
      .set(auth(t.b))
      .send({ index: 0, choice: 0 })
      .expect(404);

    const first = s.items[0].exercise.id;
    const fb = as(
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/answers`)
        .set(auth(t.a))
        .send({ index: 0, ...(await wrongAnswer(first)) })
        .expect(200),
    );
    expect(fb.correct).toBe(false);
    expect(fb.correct_choice !== null || fb.accepted.length > 0).toBe(true);
    await http()
      .post(`/api/v1/grammar/sessions/${s.id}/answers`)
      .set(auth(t.a))
      .send({ index: 0, choice: 0, text: 'x' })
      .expect(409);
    for (let i = 1; i < s.items.length; i++) {
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/answers`)
        .set(auth(t.a))
        .send({ index: i, ...(await rightAnswer(s.items[i].exercise.id)) })
        .expect(200);
    }
    const r = as(
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/finish`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(r).toMatchObject({ correct: s.items.length - 1, xp_new: true });
    expect(r.xp).toBe(Math.max(10, (s.items.length - 1) * 5));
    expect(r.wrong_indexes).toEqual([0]);
    const again = as(
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/finish`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(again.xp_new).toBe(false);

    // Câu sai vào Sổ lỗi ngữ pháp; người khác không sửa được ghi chú
    const book = as(
      await http().get('/api/v1/grammar/mistakes').set(auth(t.a)).expect(200),
    );
    const group = book.groups.find((g: Body) => g.topic.slug === 'cau-bi-dong');
    expect(group.items.find((i: Body) => i.ref_id === first)).toMatchObject({
      type: 'ex',
      status: 'not_reviewed',
      wrong_count: 1,
    });
    await http()
      .put(`/api/v1/grammar/mistakes/exercises/${first}/note`)
      .set(auth(t.b))
      .send({ note: 'x' })
      .expect(404);
    await http()
      .put(`/api/v1/grammar/mistakes/exercises/${first}/note`)
      .set(auth(t.a))
      .send({ note: 'hay quên be' })
      .expect(200);

    // Làm lại câu sai → tạo lượt mới chỉ có câu đó
    const retry = as(
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/retry-wrong`)
        .set(auth(t.a))
        .expect(201),
    );
    expect(retry.items.map((i: Body) => i.exercise.id)).toEqual([first]);
  });

  it('tiến độ chủ điểm: đọc xong + lượt ≥ 70% → Đã học', async () => {
    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/progress')
      .set(auth(t.a))
      .send({ action: 'lesson_done' })
      .expect(200);
    const topic = as(
      await http()
        .get('/api/v1/grammar/topics/cau-bi-dong')
        .set(auth(t.a))
        .expect(200),
    );
    const f = topic.formulas[0].id;
    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/progress')
      .set(auth(t.a))
      .send({ action: 'formula', formula_id: f })
      .expect(200);
    await http()
      .post('/api/v1/grammar/topics/tu-loai/progress')
      .set(auth(t.a))
      .send({ action: 'formula', formula_id: f })
      .expect(404);
    const after = as(
      await http()
        .get('/api/v1/grammar/topics/cau-bi-dong')
        .set(auth(t.a))
        .expect(200),
    );
    expect(after.status).toBe('learned');
    expect(after.progress.steps).toMatchObject({
      lesson: true,
      exercises: true,
    });
    expect(after.progress.remembered).toEqual([f]);
    expect(after.progress.suggested_level).toBe('intermediate');
  });

  it('phiên ôn: chủ điểm có lỗi vào lịch (hạn ngày mai); đến hạn → ôn, lịch tính ở server', async () => {
    const r0 = as(
      await http().get('/api/v1/grammar/review').set(auth(t.a)).expect(200),
    );
    expect(r0.due_count).toBe(0);
    expect(r0.has_mistakes).toBe(true);
    const ut = await prisma.userGrammarTopic.findUniqueOrThrow({
      where: { userId_topicId: { userId: ids.a, topicId: passiveId } },
    });
    expect(ut.reviewStep).toBe(0);
    // Giả lập đã tới hạn
    await prisma.userGrammarTopic.update({
      where: { id: ut.id },
      data: { reviewDue: new Date('2020-01-01') },
    });
    const r1 = as(
      await http().get('/api/v1/grammar/review').set(auth(t.a)).expect(200),
    );
    expect(r1.due.map((d: Body) => d.slug)).toEqual(['cau-bi-dong']);
    await http().get(`/api/v1/grammar/review`).set(auth(t.b)).expect(200);

    const s = as(
      await http()
        .post('/api/v1/grammar/review')
        .set(auth(t.a))
        .send({})
        .expect(201),
    );
    expect(s.kind).toBe('review');
    expect(s.items.length).toBe(5);
    expect(s.recap[String(passiveId)].formulas.length).toBeGreaterThan(0);
    expect(s.recap[String(passiveId)].notes).toContain('hay quên be');
    let last: Body = {};
    for (const it of s.items) {
      const body =
        it.type === 'ex'
          ? await rightAnswer(it.exercise.id)
          : { answer_id: qs.find((q) => q.id === it.question.id)!.correct };
      last = as(
        await http()
          .post(`/api/v1/grammar/sessions/${s.id}/answers`)
          .set(auth(t.a))
          .send({ index: it.index, ...body })
          .expect(200),
      );
    }
    expect(last.topic_result).toMatchObject({
      correct: 5,
      total: 5,
      rescheduled: true,
    });
    const done = as(
      await http()
        .post(`/api/v1/grammar/sessions/${s.id}/finish`)
        .set(auth(t.a))
        .expect(200),
    );
    expect(done.xp).toBe(10);
    expect(done.fixed_count).toBeGreaterThanOrEqual(1);
    const ut2 = await prisma.userGrammarTopic.findUniqueOrThrow({
      where: { id: ut.id },
    });
    expect(ut2.reviewStep).toBe(1);
  });

  it('câu TOEIC: admin gắn chủ điểm; lượt luyện theo chủ điểm; câu sai hiện ở Sổ lỗi ngữ pháp, không tạo bản thứ hai', async () => {
    for (const q of qs)
      await http()
        .put(`/api/v1/grammar/admin/questions/${q.id}/topic`)
        .set(auth(t.admin))
        .send({ topic_id: passiveId })
        .expect(200);
    const tagged = await prisma.question.findUniqueOrThrow({
      where: { id: qs[0].id },
    });
    expect(tagged).toMatchObject({
      grammarTopicId: passiveId,
      grammarTagSource: 'admin',
    });
    // Gắn lại tự động không đè nhãn admin
    await http()
      .post('/api/v1/grammar/admin/retag')
      .set(auth(t.admin))
      .expect(200);
    expect(
      (await prisma.question.findUniqueOrThrow({ where: { id: qs[0].id } }))
        .grammarTagSource,
    ).toBe('admin');

    const map = as(
      await http()
        .get(
          `/api/v1/grammar/question-topics?ids=${qs.map((q) => q.id).join(',')}`,
        )
        .expect(200),
    );
    expect(map).toHaveLength(6);
    expect(map[0]).toMatchObject({ slug: 'cau-bi-dong' });

    const detail = as(
      await http()
        .get('/api/v1/grammar/topics/cau-bi-dong')
        .set(auth(t.b))
        .expect(200),
    );
    expect(detail.toeic).toMatchObject({ available: 6, tests: 1 });

    const ps = as(
      await http()
        .post('/api/v1/grammar/topics/cau-bi-dong/toeic-sessions')
        .set(auth(t.b))
        .send({ count: 5, mode: 'practice' })
        .expect(201),
    );
    expect(ps).toMatchObject({ kind: 'grammar_topic', total_questions: 5 });
    expect(ps.config.grammar_topic).toBe('cau-bi-dong');
    await http()
      .post('/api/v1/grammar/topics/cau-bi-dong/toeic-sessions')
      .set(auth(t.b))
      .send({ count: 20, mode: 'practice' })
      .expect(422)
      .expect((r) => expect(r.body.details.available).toBe(6));

    const sess = as(
      await http()
        .get(`/api/v1/practice/sessions/${ps.id}`)
        .set(auth(t.b))
        .expect(200),
    );
    const wrongQ = sess.questions[0].id;
    for (const q of sess.questions) {
      const ref = qs.find((x) => x.id === q.id)!;
      await http()
        .put(`/api/v1/practice/sessions/${ps.id}/answers`)
        .set(auth(t.b))
        .send({
          question_id: q.id,
          selected_answer_id: q.id === wrongQ ? ref.wrong : ref.correct,
        })
        .expect(200);
    }
    await http()
      .post(`/api/v1/practice/sessions/${ps.id}/submit`)
      .set(auth(t.b))
      .expect(200);

    const practiceBook = as(
      await http()
        .get('/api/v1/practice/mistakes?grammar=true')
        .set(auth(t.b))
        .expect(200),
    );
    expect(
      practiceBook.items.map((i: Body) => i.question_id ?? i.question?.id),
    ).toContain(wrongQ);
    const book = as(
      await http()
        .get('/api/v1/grammar/mistakes?source=toeic')
        .set(auth(t.b))
        .expect(200),
    );
    const item = book.groups[0].items.find((i: Body) => i.ref_id === wrongQ);
    expect(item).toMatchObject({ type: 'q', status: 'not_reviewed' });
    expect(
      await prisma.mistakeNotebookItem.count({
        where: { userId: ids.b, questionId: wrongQ },
      }),
    ).toBe(1);
    await http()
      .put(`/api/v1/grammar/mistakes/questions/${wrongQ}/note`)
      .set(auth(t.a))
      .send({ note: 'x' })
      .expect(404);

    // "Làm lại" trong cửa sổ nổi: đúng → Đã sửa đúng (cùng một bản ghi sổ câu sai)
    const retry = as(
      await http()
        .post('/api/v1/grammar/mistakes/retry')
        .set(auth(t.b))
        .send({ type: 'q', id: wrongQ })
        .expect(201),
    );
    await http()
      .post('/api/v1/grammar/mistakes/retry')
      .set(auth(t.a))
      .send({ type: 'q', id: wrongQ })
      .expect(404);
    expect(retry.items[0].question.answers.length).toBe(4);
    const fb = as(
      await http()
        .post(`/api/v1/grammar/sessions/${retry.id}/answers`)
        .set(auth(t.b))
        .send({ index: 0, answer_id: qs.find((x) => x.id === wrongQ)!.correct })
        .expect(200),
    );
    expect(fb.correct).toBe(true);
    const row = await prisma.mistakeNotebookItem.findFirstOrThrow({
      where: { userId: ids.b, questionId: wrongQ },
    });
    expect(row.status).toBe('fixed');
    // Lượt 1 câu của ngữ pháp không hiện ở lịch sử luyện đề
    const hist = as(
      await http()
        .get('/api/v1/practice/sessions?limit=50')
        .set(auth(t.b))
        .expect(200),
    );
    expect(hist.every((h: Body) => h.kind !== 'grammar_review')).toBe(true);
  });

  it('admin: chủ điểm ẩn / chưa có nội dung không hiện; kiểm tra câu bài tập; nhập JSON', async () => {
    const created = as(
      await http()
        .post('/api/v1/grammar/admin/topics')
        .set(auth(t.admin))
        .send({
          name: 'E2E chủ điểm',
          slug: 'e2e-chu-diem',
          group_name: 'E2E',
          level: 'basic',
        })
        .expect(201),
    );
    expect(created.visible).toBe(false);
    await http().get('/api/v1/grammar/topics/e2e-chu-diem').expect(404);
    await http()
      .post(`/api/v1/grammar/admin/topics/${created.id}/exercises`)
      .set(auth(t.admin))
      .send({
        kind: 'error',
        level: 'basic',
        prompt: '[[a]] b c',
        answer_index: 0,
      })
      .expect(422);
    const ex = as(
      await http()
        .post(`/api/v1/grammar/admin/topics/${created.id}/exercises`)
        .set(auth(t.admin))
        .send({
          kind: 'fill',
          level: 'basic',
          prompt: 'She ___ (go) home.',
          accepted_answers: ['goes'],
        })
        .expect(201),
    );
    expect(ex.accepted_answers).toEqual(['goes']);
    await http().get('/api/v1/grammar/topics/e2e-chu-diem').expect(200);
    await http()
      .patch(`/api/v1/grammar/admin/topics/${created.id}`)
      .set(auth(t.admin))
      .send({ hidden: true })
      .expect(200);
    await http().get('/api/v1/grammar/topics/e2e-chu-diem').expect(404);

    const imp = as(
      await http()
        .post('/api/v1/grammar/admin/import')
        .set(auth(t.admin))
        .send({
          topics: [
            {
              name: 'E2E nhập',
              slug: 'e2e-nhap',
              group_name: 'E2E',
              level: 'advanced',
              lesson: {
                when_to_use: 'x',
                structure: 'y',
                examples: [],
                mistakes: [],
                signals: [],
              },
              formulas: [{ pattern: 'S + V', usage: 'u' }],
              exercises: [
                {
                  kind: 'choice',
                  level: 'advanced',
                  prompt: 'A ___ B',
                  options: ['1', '2'],
                  answer_index: 1,
                },
              ],
            },
          ],
        })
        .expect(200),
    );
    expect(imp).toEqual({ topics: 1, formulas: 1, exercises: 1 });
    await http()
      .post('/api/v1/grammar/admin/import')
      .set(auth(t.admin))
      .send({
        topics: [
          {
            name: 'E2E lỗi',
            slug: 'e2e-loi',
            group_name: 'E2E',
            level: 'basic',
            exercises: [
              {
                kind: 'fill',
                level: 'basic',
                prompt: 'no blank',
                accepted_answers: ['a'],
              },
            ],
          },
        ],
      })
      .expect(422);
    expect(
      await prisma.grammarTopic.count({ where: { slug: 'e2e-loi' } }),
    ).toBe(0);
  });
});
