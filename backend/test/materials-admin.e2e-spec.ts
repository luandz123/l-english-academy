import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import type { AdminMaterialDto } from '../src/modules/media/dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

describe('MaterialsAdmin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken = '';
  let studentToken = '';
  let courseId = 0;

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    const tokenService = app.get(TokenService);

    const createUserWithRole = async (email: string, role: AppRole) => {
      await prisma.userRole.deleteMany({ where: { user: { email } } });
      await prisma.profile.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });

      const user = await prisma.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          roles: { create: { role } },
          profile: { create: { fullName: email } },
        },
      });
      const { accessToken } = await tokenService.signAccessToken({
        id: user.id,
        email,
      });
      return { id: user.id, token: accessToken };
    };

    const admin = await createUserWithRole(
      'admin-materials@example.com',
      AppRole.admin,
    );
    const student = await createUserWithRole(
      'student-materials@example.com',
      AppRole.student,
    );
    adminToken = admin.token;
    studentToken = student.token;

    // Create a test course
    const course = await prisma.course.create({
      data: {
        title: 'Course For Materials Test',
        courseType: 'video_quiz',
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    await prisma.material.deleteMany({
      where: { title: { contains: 'Test Mat' } },
    });
    if (courseId) {
      await prisma.course.delete({ where: { id: courseId } }).catch(() => {});
    }
    await prisma.userRole.deleteMany({
      where: {
        user: {
          email: {
            in: [
              'admin-materials@example.com',
              'student-materials@example.com',
            ],
          },
        },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        user: {
          email: {
            in: [
              'admin-materials@example.com',
              'student-materials@example.com',
            ],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['admin-materials@example.com', 'student-materials@example.com'],
        },
      },
    });
    await app.close();
  });

  describe('RBAC protection (401 / 403)', () => {
    it('GET /api/v1/admin/materials: 401 khi không đăng nhập, 403 khi là student', async () => {
      await http().get('/api/v1/admin/materials').expect(401);
      await http()
        .get('/api/v1/admin/materials')
        .set(bearer(studentToken))
        .expect(403);
    });

    it('POST /api/v1/admin/materials: 401 khi không đăng nhập, 403 khi là student', async () => {
      await http().post('/api/v1/admin/materials').expect(401);
      await http()
        .post('/api/v1/admin/materials')
        .set(bearer(studentToken))
        .send({ title: 'Test', file_url: 'https://test.com/f.pdf' })
        .expect(403);
    });

    it('DELETE /api/v1/admin/materials/:id: 401 khi không đăng nhập, 403 khi là student', async () => {
      await http().delete('/api/v1/admin/materials/1').expect(401);
      await http()
        .delete('/api/v1/admin/materials/1')
        .set(bearer(studentToken))
        .expect(403);
    });

    it('POST /api/v1/admin/materials/rename-folder: 401 khi không đăng nhập, 403 khi là student', async () => {
      await http().post('/api/v1/admin/materials/rename-folder').expect(401);
      await http()
        .post('/api/v1/admin/materials/rename-folder')
        .set(bearer(studentToken))
        .send({ old_path: '/a', new_path: '/b' })
        .expect(403);
    });

    it('POST /api/v1/admin/materials/delete-folder: 401 khi không đăng nhập, 403 khi là student', async () => {
      await http().post('/api/v1/admin/materials/delete-folder').expect(401);
      await http()
        .post('/api/v1/admin/materials/delete-folder')
        .set(bearer(studentToken))
        .send({ folder_path: '/a' })
        .expect(403);
    });
  });

  describe('Admin CRUD functionality', () => {
    let createdMaterialId = 0;

    it('POST /api/v1/admin/materials: ném 400 COURSE_NOT_FOUND khi course_id không tồn tại', async () => {
      const res = await http()
        .post('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .send({
          title: 'Test Mat Invalid',
          file_url: 'https://test.com/file.pdf',
          course_id: 999999,
        })
        .expect(400);

      expect(res.body).toMatchObject({
        code: 'COURSE_NOT_FOUND',
      });
    });

    it('POST /api/v1/admin/materials: tạo tài liệu thành công khi dữ liệu hợp lệ', async () => {
      const res = await http()
        .post('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .send({
          title: 'Test Mat 1',
          file_url: 'https://test.com/file1.pdf',
          file_type: 'pdf',
          folder_path: '/test-folder/sub',
          course_id: courseId,
          display_order: 1,
        })
        .expect(201);

      const mat = res.body as AdminMaterialDto;
      expect(mat.id).toBeDefined();
      expect(mat.title).toBe('Test Mat 1');
      expect(mat.courses?.title).toBe('Course For Materials Test');
      createdMaterialId = mat.id;
    });

    it('GET /api/v1/admin/materials: lấy danh sách có kèm courses relation', async () => {
      const res = await http()
        .get('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .expect(200);

      const list = res.body as AdminMaterialDto[];
      expect(Array.isArray(list)).toBe(true);
      const found = list.find((m) => m.id === createdMaterialId);
      expect(found).toBeDefined();
      expect(found?.courses?.title).toBe('Course For Materials Test');
    });

    it('GET /api/v1/admin/materials?course_id=...: lọc theo khóa học', async () => {
      const res = await http()
        .get(`/api/v1/admin/materials?course_id=${courseId}`)
        .set(bearer(adminToken))
        .expect(200);

      const list = res.body as AdminMaterialDto[];
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list.every((m) => m.course_id === courseId)).toBe(true);
    });

    it('POST /api/v1/admin/materials/rename-folder: đổi tên thư mục trong transaction', async () => {
      const res = await http()
        .post('/api/v1/admin/materials/rename-folder')
        .set(bearer(adminToken))
        .send({
          old_path: '/test-folder',
          new_path: '/renamed-folder',
        })
        .expect(200);

      expect((res.body as { count: number }).count).toBeGreaterThanOrEqual(1);

      const listRes = await http()
        .get('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .expect(200);
      const updated = (listRes.body as AdminMaterialDto[]).find(
        (m) => m.id === createdMaterialId,
      );
      expect(updated?.folder_path).toBe('/renamed-folder/sub');
    });

    it('POST /api/v1/admin/materials/delete-folder: xóa thư mục trong transaction', async () => {
      const res = await http()
        .post('/api/v1/admin/materials/delete-folder')
        .set(bearer(adminToken))
        .send({
          folder_path: '/renamed-folder',
        })
        .expect(200);

      expect((res.body as { count: number }).count).toBeGreaterThanOrEqual(1);

      const listRes = await http()
        .get('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .expect(200);
      const notFound = (listRes.body as AdminMaterialDto[]).find(
        (m) => m.id === createdMaterialId,
      );
      expect(notFound).toBeUndefined();
    });

    it('DELETE /api/v1/admin/materials/:id: 404 khi không tồn tại, 204 khi xóa thành công', async () => {
      await http()
        .delete('/api/v1/admin/materials/999999')
        .set(bearer(adminToken))
        .expect(404);

      // Tạo một cái mới để test xóa lẻ
      const createRes = await http()
        .post('/api/v1/admin/materials')
        .set(bearer(adminToken))
        .send({
          title: 'Test Mat Single Delete',
          file_url: 'https://test.com/single.pdf',
        })
        .expect(201);

      const singleId = (createRes.body as AdminMaterialDto).id;
      await http()
        .delete(`/api/v1/admin/materials/${singleId}`)
        .set(bearer(adminToken))
        .expect(204);
    });
  });
});
