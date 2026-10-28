import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type { AdminNoteDto } from '../src/modules/admin/dto';

/**
 * E2E cho T-014 (ADM-004 ghi chú học viên):
 * - RLS "Admins manage student notes" (ALL): 2 route × 3 vai (không token 401, học viên 403, admin 2xx).
 * - admin_id lấy từ token người gọi; body có admin_id → 400.
 * - Sắp xếp created_at desc, id desc; giữ nguyên văn content (không trim).
 * - Học viên không tồn tại → 404 USER_NOT_FOUND.
 */
describe('AdminModule — student notes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@admin-notes.test';

  const tokens = { student: '', admin: '' };
  const userIds = { student: '', admin: '' };

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
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
    userIds.student = student.id;
    userIds.admin = admin.id;
    tokens.student = student.token;
    tokens.admin = admin.token;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('RBAC — 2 route × không token (401) và học viên (403)', () => {
    it.each([
      ['GET', () => `/api/v1/admin/users/${userIds.student}/notes`, undefined],
      [
        'POST',
        () => `/api/v1/admin/users/${userIds.student}/notes`,
        { content: 'Ghi chú' },
      ],
    ])(
      '%s %s: không token → 401, học viên → 403',
      async (method, getUrl, body) => {
        const url = getUrl();
        const m = method.toLowerCase() as 'get' | 'post';

        const unauthReq = http()[m](url);
        if (body) unauthReq.send(body);
        await unauthReq.expect(401);

        const studentReq = http()[m](url).set(bearer(tokens.student));
        if (body) studentReq.send(body);
        await studentReq.expect(403);
      },
    );
  });

  describe('Nghiệp vụ ghi chú học viên (ADM-004)', () => {
    it('POST: body có admin_id → 400; học viên không tồn tại → 404 USER_NOT_FOUND', async () => {
      await http()
        .post(`/api/v1/admin/users/${userIds.student}/notes`)
        .set(bearer(tokens.admin))
        .send({ content: 'Ghi chú', admin_id: userIds.student })
        .expect(400);

      const res404 = await http()
        .post('/api/v1/admin/users/00000000-0000-4000-8000-000000000999/notes')
        .set(bearer(tokens.admin))
        .send({ content: 'Ghi chú' })
        .expect(404);
      expect(res404.body).toMatchObject({ code: 'USER_NOT_FOUND' });
    });

    it('POST lưu nguyên văn content, gán admin_id từ token; GET trả theo thứ tự mới nhất trước', async () => {
      const res1 = await http()
        .post(`/api/v1/admin/users/${userIds.student}/notes`)
        .set(bearer(tokens.admin))
        .send({ content: '  Ghi chú 1 (giữ khoảng trắng)  ' })
        .expect(201);

      const note1 = res1.body as AdminNoteDto;
      expect(note1).toMatchObject({
        admin_id: userIds.admin,
        student_id: userIds.student,
        content: '  Ghi chú 1 (giữ khoảng trắng)  ',
      });

      const res2 = await http()
        .post(`/api/v1/admin/users/${userIds.student}/notes`)
        .set(bearer(tokens.admin))
        .send({ content: 'Ghi chú 2 (mới hơn)' })
        .expect(201);
      const note2 = res2.body as AdminNoteDto;

      const listRes = await http()
        .get(`/api/v1/admin/users/${userIds.student}/notes`)
        .set(bearer(tokens.admin))
        .expect(200);

      const notes = listRes.body as AdminNoteDto[];
      expect(notes.map((n) => n.id)).toEqual([note2.id, note1.id]);
    });
  });
});
