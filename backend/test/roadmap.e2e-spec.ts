import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import { PLACEMENT_QUIZ_SETTING_KEY } from '../src/modules/roadmap/roadmap.repository';
import type {
  MyRoadmapDto,
  PlacementDto,
  RoadmapDto,
} from '../src/modules/roadmap/dto/roadmap.dto';

type ErrorBody = { code: string };
const as = <T>(res: { body: unknown }): T => res.body as T;

const isoInDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Lộ trình học (tính năng mới, không có RLS cũ). Quy tắc kiểm tra:
 * - Chỉ người đăng nhập; mỗi người chỉ đọc/ghi lộ trình của chính mình (user id lấy từ token).
 * - Điểm xuất phát "placement" do server đọc từ user_quiz_results, không tin số client gửi.
 * - Client không gửi được giờ học / chặng (forbidNonWhitelisted).
 * - Bài test nhanh chỉ mời khi admin đã chọn quiz và học viên có quyền làm quiz đó.
 */
describe('RoadmapModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@roadmap.test';
  const TAG = '[e2e-roadmap]';
  const t = { a: '', b: '' };
  const ids = { a: '', b: '' };
  let courseId = 0;
  let freeQuizId = 0;
  let paidQuizId = 0;

  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const put = (token: string, body: object) =>
    http().put('/api/v1/roadmap/me').set(auth(token)).send(body);
  const BASE = {
    current_mode: 'score',
    current_score: 450,
    target_score: 650,
    purpose: 'job',
    duration_weeks: 12,
    minutes_per_day: 60,
    days_per_week: 5,
  };
  /** BASE bỏ đi một trường. */
  const without = (key: keyof typeof BASE): Record<string, unknown> =>
    Object.fromEntries(Object.entries(BASE).filter(([k]) => k !== key));

  async function cleanup() {
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.course.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.quiz.deleteMany({ where: { title: { startsWith: TAG } } });
    await prisma.platformSetting.deleteMany({
      where: { key: PLACEMENT_QUIZ_SETTING_KEY },
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

    for (const key of ['a', 'b'] as const) {
      const email = `${key}${SUFFIX}`;
      const user = await prisma.user.create({
        data: { email, emailVerifiedAt: new Date() },
      });
      ids[key] = user.id;
      t[key] = (
        await app.get(TokenService).signAccessToken({ id: user.id, email })
      ).accessToken;
    }

    const course = await prisma.course.create({
      data: {
        title: `${TAG} Khóa TOEIC`,
        courseType: 'video_quiz',
        isActive: true,
      },
    });
    courseId = course.id;
    const mod = await prisma.module.create({
      data: {
        courseId,
        title: `Part 5: Incomplete Sentences ${TAG}`,
        displayOrder: 0,
      },
    });
    const freeQuiz = await prisma.quiz.create({
      data: {
        moduleId: mod.id,
        title: `${TAG} Test nhanh`,
        totalQuestions: 10,
        isFree: true,
      },
    });
    freeQuizId = freeQuiz.id;
    const paidQuiz = await prisma.quiz.create({
      data: {
        moduleId: mod.id,
        title: `${TAG} Quiz trả phí`,
        totalQuestions: 5,
      },
    });
    paidQuizId = paidQuiz.id;
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  it('không token → 401 ở mọi endpoint', async () => {
    await http().get('/api/v1/roadmap/me').expect(401);
    await http().put('/api/v1/roadmap/me').send(BASE).expect(401);
    await http().delete('/api/v1/roadmap/me').expect(401);
    await http().get('/api/v1/roadmap/placement').expect(401);
  });

  it('chưa tạo → roadmap null', async () => {
    const res = as<MyRoadmapDto>(
      await http().get('/api/v1/roadmap/me').set(auth(t.a)).expect(200),
    );
    expect(res.roadmap).toBeNull();
  });

  it('dữ liệu sai → 400 với mã lỗi rõ ràng', async () => {
    const code = async (body: object) =>
      as<ErrorBody>(await put(t.a, body).expect(400)).code;

    expect(await code({ ...BASE, target_score: 450 })).toBe(
      'TARGET_NOT_ABOVE_CURRENT',
    );
    expect(await code({ ...BASE, target_score: 653 })).toBe('INVALID_TARGET');
    expect(await code({ ...BASE, exam_date: isoInDays(60) })).toBe(
      'INVALID_TIMEFRAME',
    );
    const noWeeks = without('duration_weeks');
    expect(await code(noWeeks)).toBe('INVALID_TIMEFRAME');
    expect(await code({ ...noWeeks, exam_date: isoInDays(5) })).toBe(
      'INVALID_EXAM_DATE',
    );
    // thiếu current_score khi tự khai điểm
    const noScore = without('current_score');
    await put(t.a, noScore).expect(400);
    // client không được gửi số liệu do server tính
    await put(t.a, { ...BASE, required_hours: 1 }).expect(400);
    await put(t.a, { ...BASE, minutes_per_day: 5 }).expect(400);
  });

  it('tạo lộ trình: server tính giờ, chặng, gắn chương "Part 5"', async () => {
    const res = as<RoadmapDto>(await put(t.a, BASE).expect(200));
    expect(res).toMatchObject({
      current_mode: 'score',
      current_score: 450,
      target_score: 650,
      duration_weeks: 12,
      exam_date: null,
    });
    expect(res.summary.required_hours).toBe(Math.ceil(205 * 1.15));
    expect(res.summary.available_hours).toBe(60);
    expect(res.summary.status).toBe('at_risk');
    expect(res.phases.map((p) => p.key)).toEqual([
      'breakthrough',
      'acceleration',
      'test_practice',
    ]);
    const modules = res.phases[0].resources.filter((r) => r.type === 'module');
    expect(modules).toContainEqual(
      expect.objectContaining({ url: `/courses/${courseId}/learn` }),
    );

    const mine = as<MyRoadmapDto>(
      await http().get('/api/v1/roadmap/me').set(auth(t.a)).expect(200),
    );
    expect(mine.roadmap?.id).toBe(res.id);
  });

  it('ngày thi → số tuần tính ở server; làm lại ghi đè (một lộ trình mỗi người)', async () => {
    const noWeeks = without('duration_weeks');
    const res = as<RoadmapDto>(
      await put(t.a, { ...noWeeks, exam_date: isoInDays(70) }).expect(200),
    );
    expect(res.duration_weeks).toBe(10);
    expect(res.exam_date).toBe(isoInDays(70));
    expect(await prisma.userRoadmap.count({ where: { userId: ids.a } })).toBe(
      1,
    );
  });

  it('người khác không thấy lộ trình của mình', async () => {
    const res = as<MyRoadmapDto>(
      await http().get('/api/v1/roadmap/me').set(auth(t.b)).expect(200),
    );
    expect(res.roadmap).toBeNull();
  });

  it('mất gốc → xuất phát ở mốc cố định, có chặng Nền tảng', async () => {
    const rest = without('current_score');
    const res = as<RoadmapDto>(
      await put(t.b, { ...rest, current_mode: 'none' }).expect(200),
    );
    expect(res.current_score).toBe(150);
    expect(res.phases[0].key).toBe('foundation');
  });

  it('bài test nhanh: chưa cấu hình → quiz null; placement bị từ chối', async () => {
    const res = as<PlacementDto>(
      await http().get('/api/v1/roadmap/placement').set(auth(t.a)).expect(200),
    );
    expect(res).toEqual({ quiz: null, diagnostic: null, latest_result: null });
    const rest = without('current_score');
    const err = as<ErrorBody>(
      await put(t.a, { ...rest, current_mode: 'placement' }).expect(400),
    );
    expect(err.code).toBe('PLACEMENT_RESULT_NOT_FOUND');
  });

  it('bài test trả phí, học viên chưa ghi danh → không mời làm', async () => {
    await prisma.platformSetting.upsert({
      where: { key: PLACEMENT_QUIZ_SETTING_KEY },
      create: { key: PLACEMENT_QUIZ_SETTING_KEY, value: String(paidQuizId) },
      update: { value: String(paidQuizId) },
    });
    const res = as<PlacementDto>(
      await http().get('/api/v1/roadmap/placement').set(auth(t.a)).expect(200),
    );
    expect(res.quiz).toBeNull();
  });

  it('bài test miễn phí: điểm xuất phát lấy từ kết quả thật, bỏ qua số client gửi', async () => {
    await prisma.platformSetting.update({
      where: { key: PLACEMENT_QUIZ_SETTING_KEY },
      data: { value: String(freeQuizId) },
    });
    let res = as<PlacementDto>(
      await http().get('/api/v1/roadmap/placement').set(auth(t.a)).expect(200),
    );
    expect(res.quiz).toMatchObject({
      id: freeQuizId,
      course_id: courseId,
      total_questions: 10,
    });
    expect(res.latest_result).toBeNull();

    // kết quả của người khác không được dùng
    await prisma.userQuizResult.create({
      data: {
        userId: ids.b,
        quizId: freeQuizId,
        correctAnswers: 10,
        totalQuestions: 10,
      },
    });
    await prisma.userQuizResult.create({
      data: {
        userId: ids.a,
        quizId: freeQuizId,
        correctAnswers: 7,
        totalQuestions: 10,
      },
    });
    res = as<PlacementDto>(
      await http().get('/api/v1/roadmap/placement').set(auth(t.a)).expect(200),
    );
    expect(res.latest_result).toMatchObject({
      correct_answers: 7,
      estimated_score: 600,
    });

    const roadmap = as<RoadmapDto>(
      await put(t.a, {
        ...BASE,
        current_mode: 'placement',
        current_score: 900,
        target_score: 800,
      }).expect(200),
    );
    expect(roadmap.current_mode).toBe('placement');
    expect(roadmap.current_score).toBe(600);
  });

  it('xóa lộ trình chỉ xóa của mình', async () => {
    await http().delete('/api/v1/roadmap/me').set(auth(t.a)).expect(204);
    const a = as<MyRoadmapDto>(
      await http().get('/api/v1/roadmap/me').set(auth(t.a)).expect(200),
    );
    expect(a.roadmap).toBeNull();
    const b = as<MyRoadmapDto>(
      await http().get('/api/v1/roadmap/me').set(auth(t.b)).expect(200),
    );
    expect(b.roadmap).not.toBeNull();
  });
});
