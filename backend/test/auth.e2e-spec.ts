import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { MailService, type MailMessage } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

// DB: Postgres thật (test/setup/global-setup.ts). Email: thay MailService bằng bản ghi lại.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const outbox: MailMessage[] = [];
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        send: (m: MailMessage) => Promise.resolve(void outbox.push(m)),
      })
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    outbox.length = 0;
    await prisma.user.deleteMany({});
  });

  // --- helper ---
  const PASSWORD = 'matkhau123';

  function linkFromLastMail(): URL {
    const match = outbox.at(-1)?.text.match(/http\S+/);
    if (!match) throw new Error('Không có link trong email');
    return new URL(match[0]);
  }

  function refreshCookie(res: request.Response): string {
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const c = cookies.find(
      (x) => x.startsWith('lenglish_rt=') && !x.startsWith('lenglish_rt=;'),
    );
    if (!c) throw new Error('Không có cookie refresh');
    return c.split(';')[0];
  }

  async function registerAndVerify(email: string, fullName = 'Học Viên') {
    await http()
      .post('/api/v1/auth/register')
      .send({ email, password: PASSWORD, data: { full_name: fullName } })
      .expect(201);
    const link = linkFromLastMail();
    await http().get(`${link.pathname}${link.search}`).expect(302);
  }

  async function login(email: string, password = PASSWORD) {
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const body = res.body as { session: { access_token: string } };
    return {
      token: body.session.access_token,
      cookie: refreshCookie(res),
      res,
    };
  }

  // --- Đăng ký & xác nhận email ---

  it('đăng ký: tạo user + profile + role student, chưa có phiên, gửi email xác nhận', async () => {
    const res = await http()
      .post('/api/v1/auth/register')
      .send({
        email: '  HocVien@Example.com ',
        password: PASSWORD,
        data: { full_name: 'Nguyễn Văn A' },
      })
      .expect(201);

    expect(res.body).toMatchObject({
      session: null,
      user: {
        email: 'hocvien@example.com',
        email_confirmed_at: null,
        user_metadata: { full_name: 'Nguyễn Văn A' },
        app_metadata: { provider: 'email' },
      },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'hocvien@example.com' },
      include: { profile: true, roles: true },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.profile?.fullName).toBe('Nguyễn Văn A');
    expect(user.roles.map((r) => r.role)).toEqual(['student']);
    expect(outbox).toHaveLength(1);
    expect(linkFromLastMail().pathname).toBe('/api/v1/auth/verify');
  });

  it('full_name mặc định = phần trước @ của email (như handle_new_user)', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'abc@x.com', password: PASSWORD })
      .expect(201);
    const profile = await prisma.profile.findFirstOrThrow({
      where: { email: 'abc@x.com' },
    });
    expect(profile.fullName).toBe('abc');
  });

  it('đăng ký trùng email → 422 "User already registered"', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@x.com', password: PASSWORD })
      .expect(201);
    const res = await http()
      .post('/api/v1/auth/register')
      .send({ email: 'A@x.com', password: PASSWORD })
      .expect(422);
    expect(res.body).toMatchObject({
      code: 'user_already_exists',
      message: 'User already registered',
    });
  });

  it('mật khẩu < 6 ký tự hoặc field lạ → 400', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@x.com', password: '123' })
      .expect(400);
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@x.com', password: PASSWORD, data: { is_pro: true } })
      .expect(400);
  });

  it('chưa xác nhận email → đăng nhập 400 "Email not confirmed"', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@x.com', password: PASSWORD })
      .expect(201);
    const res = await http()
      .post('/api/v1/auth/login')
      .send({ email: 'a@x.com', password: PASSWORD })
      .expect(400);
    expect(res.body).toMatchObject({
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    });
  });

  it('bấm link xác nhận → mở phiên (cookie httpOnly) và chuyển về trang chủ; link dùng một lần', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({ email: 'a@x.com', password: PASSWORD })
      .expect(201);
    const link = linkFromLastMail();

    const res = await http().get(`${link.pathname}${link.search}`).expect(302);
    expect(res.headers.location).toBe('http://localhost:8082/');
    const raw = ([] as string[])
      .concat(res.headers['set-cookie'] ?? [])
      .join(';');
    expect(raw).toMatch(/lenglish_rt=.+HttpOnly/i);
    expect(raw).toMatch(/Path=\/api\/v1\/auth/);
    expect(raw).toMatch(/SameSite=Lax/i);

    const again = await http()
      .get(`${link.pathname}${link.search}`)
      .expect(302);
    expect(again.headers.location).toMatch(
      /\/auth\/callback#error_description=/,
    );
  });

  it('redirect_to ngoài origin frontend bị thay bằng mặc định (chống open redirect)', async () => {
    await http()
      .post('/api/v1/auth/register')
      .send({
        email: 'a@x.com',
        password: PASSWORD,
        redirect_to: 'https://evil.example/steal',
      })
      .expect(201);
    expect(linkFromLastMail().searchParams.get('redirect_to')).toBe(
      'http://localhost:8082/',
    );
  });

  // --- Đăng nhập ---

  it('sai mật khẩu và email không tồn tại trả cùng lỗi "Invalid login credentials"', async () => {
    await registerAndVerify('a@x.com');
    for (const body of [
      { email: 'a@x.com', password: 'saimatkhau' },
      { email: 'khongco@x.com', password: PASSWORD },
    ]) {
      const res = await http()
        .post('/api/v1/auth/login')
        .send(body)
        .expect(400);
      expect(res.body).toMatchObject({
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      });
    }
  });

  it('đăng nhập đúng → session kiểu Supabase + cookie refresh, không lộ refresh token trong JSON', async () => {
    await registerAndVerify('a@x.com', 'Học Viên A');
    const { res } = await login('a@x.com');
    expect(res.body).toMatchObject({
      user: {
        email: 'a@x.com',
        aud: 'authenticated',
        user_metadata: { full_name: 'Học Viên A' },
      },
      session: { token_type: 'bearer', expires_in: 900 },
    });
    expect(JSON.stringify(res.body)).not.toContain('refresh_token');
  });

  // --- Access token & /me ---

  it('/me: không token → 401 "Auth session missing!"; token sửa → 401; token đúng → user', async () => {
    await registerAndVerify('a@x.com');
    const { token } = await login('a@x.com');

    const none = await http().get('/api/v1/auth/me').expect(401);
    expect(none.body).toMatchObject({ message: 'Auth session missing!' });
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}x`)
      .expect(401);

    const ok = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ok.body).toMatchObject({ user: { email: 'a@x.com' } });
  });

  it('PATCH /me gộp user_metadata (như updateUser) và đổi được mật khẩu', async () => {
    await registerAndVerify('a@x.com', 'Tên Cũ');
    const { token } = await login('a@x.com');

    const res = await http()
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        data: { bio: 'Xin chào', cover_url: 'https://cdn/x.jpg' },
        password: 'matkhaumoi9',
      })
      .expect(200);
    expect(res.body).toMatchObject({
      user: {
        user_metadata: {
          full_name: 'Tên Cũ',
          bio: 'Xin chào',
          cover_url: 'https://cdn/x.jpg',
        },
      },
    });

    await http()
      .post('/api/v1/auth/login')
      .send({ email: 'a@x.com', password: PASSWORD })
      .expect(400);
    await login('a@x.com', 'matkhaumoi9');
  });

  // --- Refresh token xoay vòng ---

  it('refresh: đổi cookie cũ lấy cookie mới và access token mới', async () => {
    await registerAndVerify('a@x.com');
    const { cookie } = await login('a@x.com');

    const res = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookie)
      .expect(200);
    const next = refreshCookie(res);
    expect(next).not.toBe(cookie);
    expect(res.body).toMatchObject({
      session: { token_type: 'bearer' },
      user: { email: 'a@x.com' },
    });
  });

  it('refresh: hai tab dùng cùng token trong vài giây vẫn được (grace), không đăng xuất nhầm', async () => {
    await registerAndVerify('a@x.com');
    const { cookie } = await login('a@x.com');
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(200);
    await http().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(200);
  });

  it('refresh: token cũ bị dùng lại sau grace → 401 và thu hồi cả family', async () => {
    await registerAndVerify('a@x.com');
    const { cookie: first } = await login('a@x.com');
    const rotated = refreshCookie(
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', first)
        .expect(200),
    );

    // Giả lập token đầu đã được dùng từ 1 phút trước (kẻ trộm dùng lại)
    await prisma.refreshToken.updateMany({
      where: { usedAt: { not: null } },
      data: { usedAt: new Date(Date.now() - 60_000) },
    });

    const reused = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(401);
    expect(reused.body).toMatchObject({ code: 'refresh_token_already_used' });
    // Token hợp lệ của chủ thật cũng bị thu hồi → phải đăng nhập lại
    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotated)
      .expect(401);
  });

  it('refresh không có cookie → 401', async () => {
    const res = await http().post('/api/v1/auth/refresh').expect(401);
    expect(res.body).toMatchObject({ code: 'refresh_token_not_found' });
  });

  it('logout thu hồi mọi phiên của người dùng (signOut scope global)', async () => {
    await registerAndVerify('a@x.com');
    const tab1 = await login('a@x.com');
    const tab2 = await login('a@x.com');

    await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', tab1.cookie)
      .expect(204);
    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', tab1.cookie)
      .expect(401);
    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', tab2.cookie)
      .expect(401);
  });

  // --- Quên mật khẩu ---

  it('quên mật khẩu: email không tồn tại vẫn 200 và không gửi thư (chống dò email)', async () => {
    const res = await http()
      .post('/api/v1/auth/recover')
      .send({ email: 'khongco@x.com' })
      .expect(200);
    expect(res.body).toEqual({});
    expect(outbox).toHaveLength(0);
  });

  it('quên mật khẩu: link mở phiên và chuyển tới /reset-password, rồi đổi được mật khẩu', async () => {
    await registerAndVerify('a@x.com');
    outbox.length = 0;
    await http()
      .post('/api/v1/auth/recover')
      .send({
        email: 'a@x.com',
        redirect_to: 'http://localhost:8082/reset-password',
      })
      .expect(200);
    const link = linkFromLastMail();
    expect(link.searchParams.get('type')).toBe('recovery');

    const res = await http().get(`${link.pathname}${link.search}`).expect(302);
    expect(res.headers.location).toBe('http://localhost:8082/reset-password');
    const session = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie(res))
      .expect(200);
    const token = (session.body as { session: { access_token: string } })
      .session.access_token;

    await http()
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'datlai123' })
      .expect(200);
    await login('a@x.com', 'datlai123');
  });

  it('link khôi phục không dùng được như link xác nhận đăng ký (đúng loại token)', async () => {
    await registerAndVerify('a@x.com');
    await http()
      .post('/api/v1/auth/recover')
      .send({ email: 'a@x.com' })
      .expect(200);
    const link = linkFromLastMail();
    link.searchParams.set('type', 'signup');
    const res = await http().get(`${link.pathname}${link.search}`).expect(302);
    expect(res.headers.location).toMatch(/error_description=/);
  });

  // --- Phân quyền admin (thay has_role(auth.uid(), 'admin')) ---

  it('admin tạo học viên: không token 401, học viên 403, admin 201 và học viên nhận email xác nhận', async () => {
    await registerAndVerify('admin@x.com');
    await registerAndVerify('hv@x.com');
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@x.com' },
    });
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    const adminToken = (await login('admin@x.com')).token;
    const studentToken = (await login('hv@x.com')).token;
    const body = {
      email: 'moi@x.com',
      password: PASSWORD,
      data: { full_name: 'HV Mới' },
    };

    await http().post('/api/v1/auth/admin/users').send(body).expect(401);
    const forbidden = await http()
      .post('/api/v1/auth/admin/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(body)
      .expect(403);
    expect(forbidden.body).toMatchObject({ code: 'forbidden' });

    outbox.length = 0;
    const created = await http()
      .post('/api/v1/auth/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body)
      .expect(201);
    expect(created.body).toMatchObject({
      user: { email: 'moi@x.com', user_metadata: { full_name: 'HV Mới' } },
    });
    expect(JSON.stringify(created.body)).not.toContain('access_token');
    expect(outbox[0]?.to).toBe('moi@x.com');
  });

  it('thu hồi quyền admin có hiệu lực ngay với token cũ (vai trò đọc từ DB mỗi request)', async () => {
    await registerAndVerify('admin@x.com');
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@x.com' },
    });
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    const { token } = await login('admin@x.com');
    await prisma.userRole.deleteMany({
      where: { userId: admin.id, role: 'admin' },
    });

    await http()
      .post('/api/v1/auth/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'z@x.com', password: PASSWORD })
      .expect(403);
  });

  // --- Google ---

  it('chưa cấu hình Google → /auth/google trả 503 thay vì lỗi 500', async () => {
    const res = await http().get('/api/v1/auth/google').expect(503);
    expect(res.body).toMatchObject({ code: 'provider_disabled' });
  });
});
