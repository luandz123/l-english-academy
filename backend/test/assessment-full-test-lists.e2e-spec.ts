import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  FullTestDto,
  FullTestResultWithTestDto,
} from '../src/modules/assessment/dto';

/**
 * E2E cho T-017:
 * - GET /api/v1/assessment/courses/:courseId/full-tests (công khai, order category, display_order, id).
 * - GET /api/v1/assessment/full-test-results/me (JWT, chỉ của chính mình, kèm full_tests, order completed_at desc nulls last, id desc).
 * - Route /me không bị ParseIntPipe của :resultId nuốt.
 */
describe('AssessmentModule — full-test lists (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const SUFFIX = '@fulltest-lists.test';
  const tokens = { a: '', b: '', admin: '' };
  const userIds = { a: '', b: '', admin: '' };

  let courseAId = 0;
  let courseBId = 0;
  let testA1Id = 0;
  let testA2Id = 0;
  let testA3Id = 0;
  let testB1Id = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-ftl]' } },
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

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await cleanup();

    const uA = await userWithToken(`a${SUFFIX}`);
    const uB = await userWithToken(`b${SUFFIX}`);
    const uAdmin = await userWithToken(`admin${SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: uAdmin.id, role: 'admin' },
    });

    userIds.a = uA.id;
    userIds.b = uB.id;
    userIds.admin = uAdmin.id;
    tokens.a = uA.token;
    tokens.b = uB.token;
    tokens.admin = uAdmin.token;

    // Tạo 2 courses
    const cA = await prisma.course.create({
      data: {
        title: '[e2e-ftl] Course A',
        price: 0,
        courseType: 'fulltest',
      },
    });
    courseAId = cA.id;

    const cB = await prisma.course.create({
      data: {
        title: '[e2e-ftl] Course B',
        price: 0,
        courseType: 'fulltest',
      },
    });
    courseBId = cB.id;

    // Tạo full_tests cho course A với category và display_order để kiểm tra sắp xếp
    // category "2024" display 2
    // category "2024" display 1
    // category "2025" display 1
    const tA2 = await prisma.fullTest.create({
      data: {
        courseId: courseAId,
        title: '[e2e-ftl] Test A2',
        category: '2024',
        displayOrder: 2,
        totalQuestions: 200,
      },
    });
    testA2Id = tA2.id;

    const tA1 = await prisma.fullTest.create({
      data: {
        courseId: courseAId,
        title: '[e2e-ftl] Test A1',
        category: '2024',
        displayOrder: 1,
        totalQuestions: 200,
      },
    });
    testA1Id = tA1.id;

    const tA3 = await prisma.fullTest.create({
      data: {
        courseId: courseAId,
        title: '[e2e-ftl] Test A3',
        category: '2025',
        displayOrder: 1,
        totalQuestions: 200,
      },
    });
    testA3Id = tA3.id;

    // Tạo full_tests cho course B
    const tB1 = await prisma.fullTest.create({
      data: {
        courseId: courseBId,
        title: '[e2e-ftl] Test B1',
        category: 'general',
        displayOrder: 1,
        totalQuestions: 200,
      },
    });
    testB1Id = tB1.id;

    // Tạo kết quả cho user A (2 kết quả) và user B (1 kết quả)
    const now = Date.now();
    await prisma.userFullTestResult.create({
      data: {
        userId: userIds.a,
        testId: testA1Id,
        totalScore: 750,
        listeningScore: 400,
        readingScore: 350,
        completedAt: new Date(now - 10000),
      },
    });
    await prisma.userFullTestResult.create({
      data: {
        userId: userIds.a,
        testId: testA2Id,
        totalScore: 820,
        listeningScore: 420,
        readingScore: 400,
        completedAt: new Date(now),
      },
    });

    await prisma.userFullTestResult.create({
      data: {
        userId: userIds.b,
        testId: testB1Id,
        totalScore: 900,
        listeningScore: 450,
        readingScore: 450,
        completedAt: new Date(now),
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('GET /api/v1/assessment/courses/:courseId/full-tests', () => {
    it('công khai: không cần token vẫn trả 200', async () => {
      const res = await http()
        .get(`/api/v1/assessment/courses/${courseAId}/full-tests`)
        .expect(200);

      const items = res.body as FullTestDto[];
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBe(3);
    });

    it('sắp xếp theo category asc, display_order asc, id asc', async () => {
      const res = await http()
        .get(`/api/v1/assessment/courses/${courseAId}/full-tests`)
        .expect(200);

      const items = res.body as FullTestDto[];
      const ids = items.map((t) => t.id);
      // '2024' display 1 (A1), '2024' display 2 (A2), '2025' display 1 (A3)
      expect(ids).toEqual([testA1Id, testA2Id, testA3Id]);
    });

    it('khóa khác không bị lẫn (course isolation)', async () => {
      const res = await http()
        .get(`/api/v1/assessment/courses/${courseBId}/full-tests`)
        .expect(200);

      const items = res.body as FullTestDto[];
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(testB1Id);
      expect(items[0].title).toBe('[e2e-ftl] Test B1');
    });

    it('khóa không tồn tại / không có đề trả về mảng rỗng', async () => {
      const res = await http()
        .get('/api/v1/assessment/courses/999999/full-tests')
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/v1/assessment/full-test-results/me', () => {
    it('chưa đăng nhập trả 401', async () => {
      await http().get('/api/v1/assessment/full-test-results/me').expect(401);
    });

    it('trả kết quả của chính mình kèm thông tin full_tests', async () => {
      const res = await http()
        .get('/api/v1/assessment/full-test-results/me')
        .set(bearer(tokens.a))
        .expect(200);

      const items = res.body as FullTestResultWithTestDto[];
      expect(items.length).toBe(2);

      // Sắp xếp completed_at desc: kết quả gần nhất trước (tA2, score 820)
      expect(items[0].total_score).toBe(820);
      expect(items[0].test_id).toBe(testA2Id);
      expect(items[0].full_tests).not.toBeNull();
      expect(items[0].full_tests?.title).toBe('[e2e-ftl] Test A2');

      expect(items[1].total_score).toBe(750);
      expect(items[1].test_id).toBe(testA1Id);
      expect(items[1].full_tests?.title).toBe('[e2e-ftl] Test A1');
    });

    it('cách ly giữa các user (A không thấy kết quả của B và ngược lại)', async () => {
      const resB = await http()
        .get('/api/v1/assessment/full-test-results/me')
        .set(bearer(tokens.b))
        .expect(200);

      const itemsB = resB.body as FullTestResultWithTestDto[];
      expect(itemsB.length).toBe(1);
      expect(itemsB[0].test_id).toBe(testB1Id);
      expect(itemsB[0].total_score).toBe(900);
      expect(itemsB[0].full_tests?.title).toBe('[e2e-ftl] Test B1');
    });

    it('route /me không bị ParseIntPipe của :resultId nuốt', async () => {
      // Nếu /me bị map vào :resultId, NestJS sẽ trả 400 Bad Request ("Validation failed (numeric string is expected)")
      // Kiểm tra chắc chắn trả 200 chứ không phải 400
      const res = await http()
        .get('/api/v1/assessment/full-test-results/me')
        .set(bearer(tokens.admin))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
