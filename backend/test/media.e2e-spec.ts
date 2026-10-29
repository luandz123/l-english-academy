import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AppRole } from '../src/generated/prisma/enums';
import { TokenService } from '../src/modules/auth/token.service';
import type { MediaResponseDto } from '../src/modules/media/dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

describe('MediaModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let adminToken = '';
  let studentToken = '';
  let studentId = '';
  let adminId = '';

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

    const createUserWithRole = async (
      email: string,
      role: AppRole,
      fullName: string,
    ) => {
      await prisma.userRole.deleteMany({ where: { user: { email } } });
      await prisma.profile.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });

      const user = await prisma.user.create({
        data: {
          email,
          emailVerifiedAt: new Date(),
          roles: { create: { role } },
          profile: { create: { fullName } },
        },
      });
      const { accessToken } = await tokenService.signAccessToken({
        id: user.id,
        email,
      });
      return { id: user.id, token: accessToken };
    };

    const admin = await createUserWithRole(
      'admin-media@test.com',
      AppRole.admin,
      'Admin Media',
    );
    adminId = admin.id;
    adminToken = admin.token;

    const student = await createUserWithRole(
      'student-media@test.com',
      AppRole.student,
      'Student Media',
    );
    studentId = student.id;
    studentToken = student.token;
  });

  afterAll(async () => {
    if (prisma) {
      if (adminId || studentId) {
        const ids = [adminId, studentId].filter(Boolean);
        await prisma.userRole.deleteMany({ where: { userId: { in: ids } } });
        await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
        await prisma.user.deleteMany({ where: { id: { in: ids } } });
      }
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/media/upload (Admin upload)', () => {
    it('401 khi chưa đăng nhập', async () => {
      await http()
        .post('/api/v1/media/upload')
        .attach('file', Buffer.from('sample pdf'), 'doc.pdf')
        .field('folder', 'lesson_pdfs')
        .expect(401);
    });

    it('403 khi là học viên (không có quyền admin)', async () => {
      await http()
        .post('/api/v1/media/upload')
        .set(bearer(studentToken))
        .attach('file', Buffer.from('sample pdf'), 'doc.pdf')
        .field('folder', 'lesson_pdfs')
        .expect(403);
    });

    it('400 khi thiếu file', async () => {
      const res = await http()
        .post('/api/v1/media/upload')
        .set(bearer(adminToken))
        .field('folder', 'lesson_pdfs')
        .expect(400);

      expect(res.body).toMatchObject({ code: 'FILE_REQUIRED' });
    });

    it('400 khi thư mục không nằm trong whitelist', async () => {
      const res = await http()
        .post('/api/v1/media/upload')
        .set(bearer(adminToken))
        .attach('file', Buffer.from('content'), 'file.txt')
        .field('folder', 'system_root')
        .expect(400);

      expect(res.body).toMatchObject({ code: 'INVALID_FOLDER' });
    });

    it('201 tải file thành công cho admin', async () => {
      const res = await http()
        .post('/api/v1/media/upload')
        .set(bearer(adminToken))
        .attach('file', Buffer.from('PDF content here'), 'lesson 1.pdf')
        .field('folder', 'lesson_pdfs')
        .expect(201);

      const body = res.body as MediaResponseDto;
      expect(body.path).toMatch(/^lesson_pdfs\/\d+_lesson1\.pdf$/);
      expect(body.public_url).toContain('/materials/lesson_pdfs/');
    });

    it('201 tải file với custom filename được sanitize', async () => {
      const res = await http()
        .post('/api/v1/media/upload')
        .set(bearer(adminToken))
        .attach('file', Buffer.from('audio bytes'), 'test.mp3')
        .field('folder', 'quiz_audio')
        .field('filename', 'custom_part1#@!.mp3')
        .expect(201);

      const body = res.body as MediaResponseDto;
      expect(body.path).toBe('quiz_audio/custom_part1.mp3');
      expect(body.public_url).toContain(
        '/materials/quiz_audio/custom_part1.mp3',
      );
    });
  });

  describe('POST /api/v1/media/avatar (Avatar / Cover)', () => {
    it('401 khi chưa đăng nhập', async () => {
      await http()
        .post('/api/v1/media/avatar')
        .attach('file', Buffer.from('png image'), 'avatar.png')
        .expect(401);
    });

    it('400 khi thiếu file', async () => {
      const res = await http()
        .post('/api/v1/media/avatar')
        .set(bearer(studentToken))
        .expect(400);

      expect(res.body).toMatchObject({ code: 'FILE_REQUIRED' });
    });

    it('400 khi MIME type không phải ảnh', async () => {
      const res = await http()
        .post('/api/v1/media/avatar')
        .set(bearer(studentToken))
        .attach('file', Buffer.from('some text'), 'script.txt')
        .expect(400);

      expect(res.body).toMatchObject({ code: 'INVALID_FILE_TYPE' });
    });

    it('201 học viên tải avatar thành công', async () => {
      const res = await http()
        .post('/api/v1/media/avatar')
        .set(bearer(studentToken))
        .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'avatar.png')
        .expect(201);

      const body = res.body as MediaResponseDto;
      expect(body.path).toContain(`profiles/avatars/${studentId}-`);
      expect(body.public_url).toContain(
        `/materials/profiles/avatars/${studentId}-`,
      );
    });

    it('201 học viên tải cover thành công với folder=covers', async () => {
      const res = await http()
        .post('/api/v1/media/avatar')
        .set(bearer(studentToken))
        .attach('file', Buffer.from([0xff, 0xd8, 0xff]), 'cover.jpg')
        .field('folder', 'covers')
        .expect(201);

      const body = res.body as MediaResponseDto;
      expect(body.path).toContain(`profiles/covers/${studentId}-`);
      expect(body.public_url).toContain(
        `/materials/profiles/covers/${studentId}-`,
      );
    });
  });
});
