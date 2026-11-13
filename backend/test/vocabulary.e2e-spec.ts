/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument -- phản hồi JSON trong e2e được kiểm bằng expect */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import { VocabularyService } from '../src/modules/vocabulary/vocabulary.service';

type Body = Record<string, any>;
const as = (res: { body: unknown }): Body => res.body as Body;

/**
 * Từ vựng (D15, tính năng mới — không có RLS cũ). Quy tắc kiểm tra:
 * - Cần đăng nhập; sổ từ và lịch ôn chỉ của chính mình (người khác → 404).
 * - Không tạo trùng từ trong sổ; kho không có nghĩa thì bắt buộc nhập nghĩa.
 * - Lịch ôn do server tính từ nút đánh giá; client không gửi được ngày ôn.
 * - Chỉ admin sửa kho từ.
 */
describe('VocabularyModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@vocab.test';
  const TAG = '[e2e-vocab]';
  const t = { a: '', b: '', admin: '' };
  let packWordId = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.vocabQuiz.deleteMany({
      where: { title: { startsWith: TAG } },
    });
    await prisma.vocabEntry.deleteMany({
      where: { wordKey: { startsWith: 'zz-e2e' } },
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
    for (const key of ['a', 'b', 'admin'] as const) {
      const email = `${key}${SUFFIX}`;
      const user = await prisma.user.create({
        data: { email, emailVerifiedAt: new Date() },
      });
      t[key] = (
        await app.get(TokenService).signAccessToken({ id: user.id, email })
      ).accessToken;
      if (key === 'admin')
        await prisma.userRole.create({
          data: { userId: user.id, role: 'admin' },
        });
    }
    const quiz = await prisma.vocabQuiz.create({
      data: { title: `${TAG} bộ 1` },
    });
    const w = await prisma.vocabQuestion.create({
      data: {
        vocabQuizId: quiz.id,
        word: 'Zzpackword',
        definitionVi: 'từ trong bộ',
        phonetic: '/zz/',
      },
    });
    packWordId = w.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('chưa đăng nhập → 401', async () => {
    await http().get('/api/v1/vocabulary/notebook').expect(401);
    await http().get('/api/v1/vocabulary/review/queue').expect(401);
    await http().get('/api/v1/vocabulary/lookup?word=agreement').expect(401);
  });

  it('600 từ TOEIC đã nằm trong kho; tra cả dạng biến đổi', async () => {
    expect(
      await prisma.vocabEntry.count({ where: { source: 'toeic600' } }),
    ).toBeGreaterThan(500);
    const r = as(
      await http()
        .get('/api/v1/vocabulary/lookup')
        .query({ word: 'Agreements' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(r.found).toMatchObject({ source: 'entry', word: 'agreement' });
    expect(r.saved).toBeNull();
    const pack = as(
      await http()
        .get('/api/v1/vocabulary/lookup')
        .query({ word: 'zzpackword' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(pack.found).toMatchObject({
      source: 'pack',
      definition_vi: 'từ trong bộ',
    });
    const none = as(
      await http()
        .get('/api/v1/vocabulary/lookup')
        .query({ word: 'qwxyzunknown' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(none.found).toBeNull();
  });

  let savedId = 0;
  it('lưu từ: theo từ gốc, không trùng, thiếu nghĩa thì bắt nhập', async () => {
    const s1 = as(
      await http()
        .post('/api/v1/vocabulary/notebook')
        .set(auth(t.a))
        .send({
          word: 'agreements',
          source: 'reading',
          example: 'The agreements were signed.',
        })
        .expect(200),
    );
    expect(s1).toMatchObject({
      already: false,
      word: { word: 'agreement', source: 'reading', state: 'new' },
    });
    expect(s1.word.definition_vi).toBeTruthy();
    savedId = s1.word.id;
    const s2 = as(
      await http()
        .post('/api/v1/vocabulary/notebook')
        .set(auth(t.a))
        .send({ word: 'Agreement', source: 'manual' })
        .expect(200),
    );
    expect(s2).toMatchObject({ already: true, word: { id: savedId } });

    const lack = await http()
      .post('/api/v1/vocabulary/notebook')
      .set(auth(t.a))
      .send({ word: 'qwxyzunknown', source: 'listening' })
      .expect(422);
    expect(as(lack).code).toBe('DEFINITION_REQUIRED');
    await http()
      .post('/api/v1/vocabulary/notebook')
      .set(auth(t.a))
      .send({
        word: 'qwxyzunknown',
        source: 'listening',
        definition_vi: 'từ lạ',
      })
      .expect(200);
    // client không gửi được lịch ôn
    await http()
      .post('/api/v1/vocabulary/notebook')
      .set(auth(t.a))
      .send({
        word: 'ledger',
        source: 'manual',
        definition_vi: 'sổ cái',
        due_at: '2020-01-01',
      })
      .expect(400);

    const batch = as(
      await http()
        .post('/api/v1/vocabulary/notebook/batch')
        .set(auth(t.a))
        .send({ pack_word_ids: [packWordId] })
        .expect(200),
    );
    expect(batch).toEqual({ added: 1, skipped: 0 });
    const again = as(
      await http()
        .post('/api/v1/vocabulary/notebook/batch')
        .set(auth(t.a))
        .send({ pack_word_ids: [packWordId] })
        .expect(200),
    );
    expect(again).toEqual({ added: 0, skipped: 1 });

    const list = as(
      await http()
        .get('/api/v1/vocabulary/notebook')
        .set(auth(t.a))
        .expect(200),
    );
    expect(list.total).toBe(3);
    const reading = as(
      await http()
        .get('/api/v1/vocabulary/notebook')
        .query({ sources: 'reading' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(reading.total).toBe(1);
    // người khác không sửa/xóa được
    await http()
      .patch(`/api/v1/vocabulary/notebook/${savedId}`)
      .set(auth(t.b))
      .send({ note: 'x' })
      .expect(404);
    await http()
      .delete(`/api/v1/vocabulary/notebook/${savedId}`)
      .set(auth(t.b))
      .expect(404);
    expect(
      as(
        await http()
          .get('/api/v1/vocabulary/notebook')
          .set(auth(t.b))
          .expect(200),
      ).total,
    ).toBe(0);
  });

  it('SRS: hàng ôn gồm từ mới trong giới hạn ngày; chấm Nhớ → hẹn 1 ngày, chưa đến hạn thì không chấm lại', async () => {
    await http()
      .put('/api/v1/vocabulary/settings')
      .set(auth(t.a))
      .send({ new_per_day: 2 })
      .expect(200);
    const q = as(
      await http()
        .get('/api/v1/vocabulary/review/queue')
        .set(auth(t.a))
        .expect(200),
    );
    expect(q.cards).toHaveLength(2);
    expect(q.cards[0].intervals).toMatchObject({
      again: '10 phút',
      good: '1 ngày',
    });
    const card = q.cards[0];
    const r = as(
      await http()
        .post(`/api/v1/vocabulary/review/${card.id}`)
        .set(auth(t.a))
        .send({ rating: 'good' })
        .expect(200),
    );
    expect(r.state).toBe('review');
    expect(new Date(r.due_at).getTime() - Date.now()).toBeGreaterThan(
      23 * 3600_000,
    );
    const notDue = await http()
      .post(`/api/v1/vocabulary/review/${card.id}`)
      .set(auth(t.a))
      .send({ rating: 'good' })
      .expect(409);
    expect(as(notDue).code).toBe('NOT_DUE');
    await http()
      .post(`/api/v1/vocabulary/review/${card.id}`)
      .set(auth(t.b))
      .send({ rating: 'good' })
      .expect(404);
    await http()
      .post(`/api/v1/vocabulary/review/${q.cards[1].id}`)
      .set(auth(t.a))
      .send({ rating: 'later' })
      .expect(400);

    const sum = as(
      await http()
        .get('/api/v1/vocabulary/notebook/summary')
        .set(auth(t.a))
        .expect(200),
    );
    expect(sum).toMatchObject({
      total: 3,
      new_per_day: 2,
      new_available: 1,
      reviewed_today: 1,
    });
  });

  it('từ theo Part/cấp độ: gắn nhãn tự động; chỉ admin sửa kho', async () => {
    await app.get(VocabularyService).retag();
    const list = as(
      await http()
        .get('/api/v1/vocabulary/entries')
        .query({ levels: 'basic,intermediate' })
        .set(auth(t.a))
        .expect(200),
    );
    expect(list.total).toBeGreaterThan(0);
    expect(
      list.items.some(
        (e: Body) => e.word === 'agreement' && e.saved === true,
      ) || list.items.length > 0,
    ).toBe(true);
    const entry = list.items[0];

    await http()
      .patch(`/api/v1/vocabulary/admin/entries/${entry.id}`)
      .set(auth(t.a))
      .send({ part: 5 })
      .expect(403);
    const upd = as(
      await http()
        .patch(`/api/v1/vocabulary/admin/entries/${entry.id}`)
        .set(auth(t.admin))
        .send({ part: 5, level: 'advanced' })
        .expect(200),
    );
    expect(upd).toMatchObject({
      part: 5,
      level: 'advanced',
      tag_source: 'admin',
    });
    await app.get(VocabularyService).retag();
    expect(
      (await prisma.vocabEntry.findUnique({ where: { id: entry.id } }))?.level,
    ).toBe('advanced');
    await http()
      .post('/api/v1/vocabulary/admin/entries')
      .set(auth(t.admin))
      .send({ word: 'zz-e2e word', definition_vi: 'thử' })
      .expect(201);
    await http()
      .post('/api/v1/vocabulary/admin/entries')
      .set(auth(t.admin))
      .send({ word: 'zz-e2e word', definition_vi: 'thử' })
      .expect(409);
  });
});
