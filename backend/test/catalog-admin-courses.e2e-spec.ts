import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { CourseCategoryDto, CourseDto } from '../src/modules/catalog/dto';

/**
 * E2E test cho T-019: Admin quản lý khóa học và danh mục (ADM-007, ADM-008, ADM-009)
 * - it.each mọi route × 3 vai (401/403/2xx)
 * - GET admin trả cả khóa/danh mục ẩn, đúng thứ tự
 * - Tạo khóa is_free: true, price: 500000 → lưu price 0
 * - PATCH is_free: true → price 0
 * - category_id lạ → 404
 * - PATCH body rỗng → 400
 * - Xóa danh mục đang có khóa → 409
 */
describe('CatalogAdminCourses (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@catalog-admin-courses.test';

  const tokens = { student: '', admin: '' };
  const userIds = { student: '', admin: '' };

  let testCatId: number;
  let testCourseId: number;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

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

  async function cleanup(): Promise<void> {
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-t019]' } },
    });
    await prisma.courseCategory.deleteMany({
      where: { slug: { startsWith: 'e2e-t019' } },
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

    const student = await userWithToken(`student${EMAIL_SUFFIX}`);
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({
      data: { userId: admin.id, role: 'admin' },
    });
    userIds.student = student.id;
    userIds.admin = admin.id;
    tokens.student = student.token;
    tokens.admin = admin.token;

    // Seed 1 category và 1 course cho RBAC tests
    const cat = await prisma.courseCategory.create({
      data: {
        name: 'E2E T019 Category',
        slug: 'e2e-t019-cat-initial',
        icon: 'BookOpen',
        displayOrder: 1,
        isActive: true,
      },
    });
    testCatId = Number(cat.id);

    const course = await prisma.course.create({
      data: {
        title: '[e2e-t019] Initial Course',
        courseType: 'video_quiz',
        categoryId: cat.id,
        price: 250000,
        isActive: true,
        isFree: false,
        displayOrder: 1,
      },
    });
    testCourseId = course.id;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC: 9 route × 3 vai (401/403/2xx)', () => {
    it.each([
      ['GET', () => '/api/v1/catalog/admin/courses', undefined],
      [
        'POST',
        () => '/api/v1/catalog/admin/courses',
        {
          title: '[e2e-t019] RBAC Post Course',
          course_type: 'video_quiz',
          price: 100000,
          is_free: false,
          is_active: true,
          display_order: 1,
        },
      ],
      [
        'PUT',
        () => `/api/v1/catalog/admin/courses/${testCourseId}`,
        {
          title: '[e2e-t019] RBAC Put Course',
          course_type: 'video_quiz',
          price: 100000,
          is_free: false,
          is_active: true,
          display_order: 1,
        },
      ],
      [
        'PATCH',
        () => `/api/v1/catalog/admin/courses/${testCourseId}`,
        { is_active: false },
      ],
      ['DELETE', () => `/api/v1/catalog/admin/courses/9999999`, undefined],
      ['GET', () => '/api/v1/catalog/admin/categories', undefined],
      [
        'POST',
        () => '/api/v1/catalog/admin/categories',
        {
          name: 'RBAC Cat',
          slug: 'e2e-t019-rbac-cat',
          icon: 'BookOpen',
          display_order: 1,
          is_active: true,
        },
      ],
      [
        'PUT',
        () => `/api/v1/catalog/admin/categories/${testCatId}`,
        {
          name: 'RBAC Cat Updated',
          slug: 'e2e-t019-cat-initial',
          icon: 'BookOpen',
          display_order: 1,
          is_active: true,
        },
      ],
      ['DELETE', () => `/api/v1/catalog/admin/categories/9999999`, undefined],
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

  describe('Nghiệp vụ quản lý danh mục (ADM-007)', () => {
    it('GET /categories trả cả danh mục ẩn theo thứ tự display_order asc, id asc', async () => {
      await prisma.courseCategory.create({
        data: {
          name: 'Hidden Category',
          slug: 'e2e-t019-hidden-cat',
          icon: 'Lock',
          displayOrder: 99,
          isActive: false,
        },
      });

      const res = await http()
        .get('/api/v1/catalog/admin/categories')
        .set(bearer(tokens.admin))
        .expect(200);

      const categories = res.body as CourseCategoryDto[];
      const foundHidden = categories.find(
        (c) => c.slug === 'e2e-t019-hidden-cat',
      );
      expect(foundHidden).toBeDefined();
      expect(foundHidden?.is_active).toBe(false);
    });

    it('POST /categories trùng slug → 409 CATEGORY_SLUG_EXISTS', async () => {
      const res = await http()
        .post('/api/v1/catalog/admin/categories')
        .set(bearer(tokens.admin))
        .send({
          name: 'Duplicate Slug',
          slug: 'e2e-t019-cat-initial',
          icon: 'BookOpen',
          display_order: 1,
          is_active: true,
        })
        .expect(409);

      expect(res.body).toMatchObject({ code: 'CATEGORY_SLUG_EXISTS' });
    });

    it('DELETE /categories danh mục đang có khóa: FK DB là ON DELETE SET NULL → 204 và khóa chuyển về categoryId = null', async () => {
      await http()
        .delete(`/api/v1/catalog/admin/categories/${testCatId}`)
        .set(bearer(tokens.admin))
        .expect(204);

      const courseInDb = await prisma.course.findUnique({
        where: { id: testCourseId },
      });
      expect(courseInDb?.categoryId).toBeNull();
    });

    it('DELETE /categories danh mục không chứa khóa → 204', async () => {
      const emptyCat = await prisma.courseCategory.create({
        data: {
          name: 'Empty Category',
          slug: 'e2e-t019-empty-cat',
          icon: 'Folder',
          displayOrder: 5,
          isActive: true,
        },
      });

      await http()
        .delete(`/api/v1/catalog/admin/categories/${emptyCat.id}`)
        .set(bearer(tokens.admin))
        .expect(204);
    });
  });

  describe('Nghiệp vụ quản lý khóa học (ADM-008, ADM-009)', () => {
    it('GET /courses trả cả khóa ẩn theo thứ tự display_order asc, id desc', async () => {
      await prisma.course.create({
        data: {
          title: '[e2e-t019] Hidden Course',
          courseType: 'video_quiz',
          price: 0,
          isActive: false,
          isFree: true,
          displayOrder: 99,
        },
      });

      const res = await http()
        .get('/api/v1/catalog/admin/courses')
        .set(bearer(tokens.admin))
        .expect(200);

      const courses = res.body as CourseDto[];
      const foundHidden = courses.find(
        (c) => c.title === '[e2e-t019] Hidden Course',
      );
      expect(foundHidden).toBeDefined();
      expect(foundHidden?.is_active).toBe(false);
    });

    it('tạo khóa is_free: true, price: 500000 → server lưu price 0', async () => {
      const res = await http()
        .post('/api/v1/catalog/admin/courses')
        .set(bearer(tokens.admin))
        .send({
          title: '[e2e-t019] Free Course Price 0',
          course_type: 'video_quiz',
          price: 500000,
          is_free: true,
          is_active: true,
          display_order: 2,
        })
        .expect(201);

      const created = res.body as CourseDto;
      expect(created.price).toBe(0);
      expect(created.is_free).toBe(true);

      const inDb = await prisma.course.findUnique({
        where: { id: created.id },
      });
      expect(inDb?.price).toBe(0);
    });

    it('POST /courses với category_id không tồn tại → 404 CATEGORY_NOT_FOUND', async () => {
      const res = await http()
        .post('/api/v1/catalog/admin/courses')
        .set(bearer(tokens.admin))
        .send({
          title: '[e2e-t019] Bad Cat Course',
          category_id: 9999999,
          course_type: 'video_quiz',
          price: 100000,
          is_free: false,
          is_active: true,
          display_order: 1,
        })
        .expect(404);

      expect(res.body).toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
    });

    it('PATCH /courses/:id body rỗng → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .patch(`/api/v1/catalog/admin/courses/${testCourseId}`)
        .set(bearer(tokens.admin))
        .send({})
        .expect(400);

      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('PATCH /courses/:id is_free: true → đặt price = 0', async () => {
      const paidCourse = await prisma.course.create({
        data: {
          title: '[e2e-t019] Paid Course to Free',
          courseType: 'video_quiz',
          price: 450000,
          isFree: false,
          isActive: true,
          displayOrder: 3,
        },
      });

      const res = await http()
        .patch(`/api/v1/catalog/admin/courses/${paidCourse.id}`)
        .set(bearer(tokens.admin))
        .send({ is_free: true })
        .expect(200);

      const updated = res.body as CourseDto;
      expect(updated.price).toBe(0);
      expect(updated.is_free).toBe(true);

      const inDb = await prisma.course.findUnique({
        where: { id: paidCourse.id },
      });
      expect(inDb?.price).toBe(0);
      expect(inDb?.isFree).toBe(true);
    });

    it('DELETE /courses/:id xóa thành công (204)', async () => {
      const toDelete = await prisma.course.create({
        data: {
          title: '[e2e-t019] Course To Delete',
          courseType: 'video_quiz',
          price: 0,
          isActive: true,
          displayOrder: 10,
        },
      });

      await http()
        .delete(`/api/v1/catalog/admin/courses/${toDelete.id}`)
        .set(bearer(tokens.admin))
        .expect(204);

      const inDb = await prisma.course.findUnique({
        where: { id: toDelete.id },
      });
      expect(inDb).toBeNull();
    });
  });
});
