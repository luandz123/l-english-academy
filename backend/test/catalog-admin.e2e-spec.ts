import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { AdminModuleDto, ModuleDto } from '../src/modules/catalog/dto';
import type { CurriculumModuleDto } from '../src/modules/learning/dto';

/**
 * E2E cho T-012 (ADM-010 admin quản lý chương modules):
 * - RLS "Admins manage modules": 7 route × 3 vai (không token 401, học viên 403, admin 2xx).
 * - GET admin trả cả module/bài ẩn kèm lessons, quizzes đúng thứ tự.
 * - Tạo module tính display_order = max + 1; gửi display_order trong body → 400.
 * - module-order đảo 3 module trong transaction; id lạ → 400 không đổi gì.
 * - free-module đặt đúng 1 module free cho khóa.
 * - Xóa module → FK cascade xóa bài + quiz thuộc chương.
 * - PATCH ẩn module → curriculum học viên (T-005) không còn module đó.
 */
describe('CatalogModule — admin modules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@catalog-admin.test';

  const tokens = { student: '', admin: '' };
  let courseId = 0;
  let mod1Id = 0;
  let mod2Id = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-catalog-admin]' } },
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

    const course = await prisma.course.create({
      data: {
        title: '[e2e-catalog-admin] Khóa TOEIC',
        courseType: 'video_quiz',
        isFree: true,
      },
    });
    courseId = course.id;

    // Tạo 2 module: mod1 (display_order 0, published), mod2 (display_order 1, ẩn)
    const m2 = await prisma.module.create({
      data: {
        courseId,
        title: 'Chương 2 (ẩn)',
        displayOrder: 1,
        isFree: true,
        isPublished: false,
      },
    });
    mod2Id = m2.id;

    const m1 = await prisma.module.create({
      data: {
        courseId,
        title: 'Chương 1',
        displayOrder: 0,
        isFree: false,
        isPublished: true,
      },
    });
    mod1Id = m1.id;

    // Tạo bài học + quiz trong Chương 1 theo thứ tự ngược để kiểm sắp xếp
    await prisma.lesson.create({
      data: {
        moduleId: mod1Id,
        title: 'Bài 2 (ẩn)',
        videoUrl: 'https://cdn.example.com/v2.mp4',
        displayOrder: 1,
        isPublished: false,
      },
    });
    await prisma.lesson.create({
      data: {
        moduleId: mod1Id,
        title: 'Bài 1',
        videoUrl: 'https://cdn.example.com/v1.mp4',
        displayOrder: 0,
        isPublished: true,
      },
    });

    await prisma.quiz.create({
      data: {
        moduleId: mod1Id,
        title: 'Quiz 2',
        displayOrder: 1,
      },
    });
    await prisma.quiz.create({
      data: {
        moduleId: mod1Id,
        title: 'Quiz 1',
        displayOrder: 0,
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC — 7 route × không token (401) và học viên (403)', () => {
    it.each([
      [
        'GET',
        () => `/api/v1/catalog/admin/courses/${courseId}/modules`,
        undefined,
      ],
      [
        'POST',
        () => `/api/v1/catalog/admin/courses/${courseId}/modules`,
        { title: 'M', is_free: false },
      ],
      [
        'PUT',
        () => `/api/v1/catalog/admin/modules/${mod1Id}`,
        { title: 'M', is_free: false },
      ],
      [
        'PATCH',
        () => `/api/v1/catalog/admin/modules/${mod1Id}`,
        { is_free: true },
      ],
      ['DELETE', () => `/api/v1/catalog/admin/modules/${mod1Id}`, undefined],
      [
        'PUT',
        () => `/api/v1/catalog/admin/courses/${courseId}/module-order`,
        { module_ids: [mod1Id, mod2Id] },
      ],
      [
        'PUT',
        () => `/api/v1/catalog/admin/courses/${courseId}/free-module`,
        { module_id: mod1Id },
      ],
    ])(
      '%s %s: không token → 401, học viên → 403',
      async (method, getUrl, body) => {
        const url = getUrl();
        const m = method.toLowerCase() as
          'get' | 'post' | 'put' | 'patch' | 'delete';

        const unauthReq = http()[m](url);
        if (body) unauthReq.send(body);
        await unauthReq.expect(401);

        const studentReq = http()[m](url).set(bearer(tokens.student));
        if (body) studentReq.send(body);
        await studentReq.expect(403);
      },
    );
  });

  describe('Nghiệp vụ quản lý chương (ADM-010)', () => {
    let mod3Id = 0;

    it('GET /courses/:courseId/modules trả cả module/bài ẩn kèm lessons, quizzes đúng thứ tự; khóa không tồn tại → []', async () => {
      const res = await http()
        .get(`/api/v1/catalog/admin/courses/${courseId}/modules`)
        .set(bearer(tokens.admin))
        .expect(200);

      const modules = res.body as AdminModuleDto[];
      expect(modules.map((m) => m.id)).toEqual([mod1Id, mod2Id]);
      expect(modules[1].is_published).toBe(false);

      expect(modules[0].lessons.map((l) => l.title)).toEqual([
        'Bài 1',
        'Bài 2 (ẩn)',
      ]);
      expect(modules[0].lessons[1].video_url).toBe(
        'https://cdn.example.com/v2.mp4',
      );
      expect(modules[0].quizzes.map((q) => q.title)).toEqual([
        'Quiz 1',
        'Quiz 2',
      ]);

      const emptyRes = await http()
        .get('/api/v1/catalog/admin/courses/999999/modules')
        .set(bearer(tokens.admin))
        .expect(200);
      expect(emptyRes.body).toEqual([]);
    });

    it('POST /courses/:courseId/modules tự tính display_order = max + 1; gửi display_order trong body → 400', async () => {
      await http()
        .post(`/api/v1/catalog/admin/courses/${courseId}/modules`)
        .set(bearer(tokens.admin))
        .send({ title: 'Chương 3', is_free: false, display_order: 99 })
        .expect(400);

      const res = await http()
        .post(`/api/v1/catalog/admin/courses/${courseId}/modules`)
        .set(bearer(tokens.admin))
        .send({
          title: 'Chương 3',
          description: 'Mô tả chương 3',
          is_free: false,
        })
        .expect(201);

      const created = res.body as ModuleDto;
      mod3Id = created.id;
      expect(created).toMatchObject({
        course_id: courseId,
        title: 'Chương 3',
        description: 'Mô tả chương 3',
        display_order: 2,
        is_free: false,
        is_published: true,
      });
    });

    it('PUT /modules/:id cập nhật title, description, is_free', async () => {
      const res = await http()
        .put(`/api/v1/catalog/admin/modules/${mod3Id}`)
        .set(bearer(tokens.admin))
        .send({
          title: 'Chương 3 (đã sửa)',
          description: 'Mô tả mới',
          is_free: true,
        })
        .expect(200);

      expect(res.body).toMatchObject({
        id: mod3Id,
        title: 'Chương 3 (đã sửa)',
        description: 'Mô tả mới',
        is_free: true,
      });
    });

    it('PUT /courses/:courseId/module-order đảo 3 module đúng; id lạ → 400 không đổi gì', async () => {
      await http()
        .put(`/api/v1/catalog/admin/courses/${courseId}/module-order`)
        .set(bearer(tokens.admin))
        .send({ module_ids: [mod3Id, mod1Id, mod2Id] })
        .expect(204);

      const afterValid = await prisma.module.findMany({
        where: { courseId },
        orderBy: { displayOrder: 'asc' },
      });
      expect(afterValid.map((m) => [m.id, m.displayOrder])).toEqual([
        [mod3Id, 0],
        [mod1Id, 1],
        [mod2Id, 2],
      ]);

      // Gửi id lạ -> 400, thứ tự cũ giữ nguyên
      await http()
        .put(`/api/v1/catalog/admin/courses/${courseId}/module-order`)
        .set(bearer(tokens.admin))
        .send({ module_ids: [mod1Id, 999999] })
        .expect(400);

      const afterInvalid = await prisma.module.findMany({
        where: { courseId },
        orderBy: { displayOrder: 'asc' },
      });
      expect(afterInvalid.map((m) => [m.id, m.displayOrder])).toEqual([
        [mod3Id, 0],
        [mod1Id, 1],
        [mod2Id, 2],
      ]);
    });

    it('PUT /courses/:courseId/free-module đặt đúng 1 module free cho toàn khóa', async () => {
      await http()
        .put(`/api/v1/catalog/admin/courses/${courseId}/free-module`)
        .set(bearer(tokens.admin))
        .send({ module_id: mod1Id })
        .expect(204);

      const modules = await prisma.module.findMany({
        where: { courseId },
        orderBy: { id: 'asc' },
      });
      for (const m of modules) {
        expect(m.isFree).toBe(m.id === mod1Id);
      }
    });

    it('PATCH /modules/:id ẩn module → curriculum học viên (T-005) không còn module đó', async () => {
      await http()
        .patch(`/api/v1/catalog/admin/modules/${mod1Id}`)
        .set(bearer(tokens.admin))
        .send({ is_published: false })
        .expect(200);

      const currRes = await http()
        .get(`/api/v1/learning/courses/${courseId}/curriculum`)
        .set(bearer(tokens.student))
        .expect(200);
      const currModules = currRes.body as CurriculumModuleDto[];
      expect(currModules.some((m) => m.id === mod1Id)).toBe(false);
    });

    it('DELETE /modules/:id xóa module kèm FK cascade xóa bài và quiz thuộc module', async () => {
      const lesson = await prisma.lesson.create({
        data: { moduleId: mod3Id, title: 'Bài thuộc mod3' },
      });
      const quiz = await prisma.quiz.create({
        data: { moduleId: mod3Id, title: 'Quiz thuộc mod3' },
      });

      await http()
        .delete(`/api/v1/catalog/admin/modules/${mod3Id}`)
        .set(bearer(tokens.admin))
        .expect(204);

      await expect(
        prisma.module.findUnique({ where: { id: mod3Id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.lesson.findUnique({ where: { id: lesson.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.quiz.findUnique({ where: { id: quiz.id } }),
      ).resolves.toBeNull();

      // Xóa lần 2 (không tồn tại) vẫn 204
      await http()
        .delete(`/api/v1/catalog/admin/modules/${mod3Id}`)
        .set(bearer(tokens.admin))
        .expect(204);
    });
  });
});
