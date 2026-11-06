import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';

/**
 * POST /speaking/transcribe (nhận giọng shadowing bằng Whisper khi trình duyệt không nhận được):
 * phải đăng nhập; file phải là audio, tối đa 5MB; chưa có STT_API_KEY → 503; có key → trả chữ.
 */
describe('Speaking transcribe (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token = '';
  const EMAIL = 'learner@transcribe.test';
  const savedKey = process.env.STT_API_KEY;

  const http = () => request(app.getHttpServer());
  const post = () =>
    http()
      .post('/api/v1/speaking/transcribe')
      .set('Authorization', `Bearer ${token}`);

  async function boot() {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  }

  beforeAll(async () => {
    delete process.env.STT_API_KEY;
    await boot();
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        emailVerifiedAt: new Date(),
        profile: { create: { fullName: 'Learner' } },
      },
    });
    token = (
      await app.get(TokenService).signAccessToken({ id: user.id, email: EMAIL })
    ).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await app?.close();
    if (savedKey === undefined) delete process.env.STT_API_KEY;
    else process.env.STT_API_KEY = savedKey;
  });

  it('không token → 401', async () => {
    await http()
      .post('/api/v1/speaking/transcribe')
      .attach('file', Buffer.from('abc'), {
        filename: 'speech.webm',
        contentType: 'audio/webm',
      })
      .expect(401);
  });

  it('thiếu file → 400; file không phải audio → 400', async () => {
    const missing = await post().expect(400);
    expect(missing.body).toMatchObject({ code: 'AUDIO_REQUIRED' });
    const wrong = await post()
      .attach('file', Buffer.from('%PDF'), {
        filename: 'a.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    expect(wrong.body).toMatchObject({ code: 'AUDIO_INVALID_TYPE' });
  });

  it('file quá 5MB → multer chặn (400/413)', async () => {
    const res = await post().attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
      filename: 'speech.webm',
      contentType: 'audio/webm',
    });
    expect([400, 413]).toContain(res.status);
  });

  it('chưa cấu hình STT_API_KEY → 503 STT_NOT_CONFIGURED', async () => {
    const res = await post()
      .attach('file', Buffer.from('abc'), {
        filename: 'speech.webm',
        contentType: 'audio/webm',
      })
      .expect(503);
    expect(res.body).toMatchObject({ code: 'STT_NOT_CONFIGURED' });
  });

  describe('có STT_API_KEY', () => {
    let fetchMock: jest.SpyInstance;

    beforeAll(async () => {
      await app.close();
      process.env.STT_API_KEY = 'test-stt-key';
      await boot();
    });

    beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
    });
    afterEach(() => fetchMock.mockRestore());

    it('trả chữ từ dịch vụ Whisper', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ text: ' Good morning. ' }), {
          status: 200,
        }),
      );
      const res = await post()
        .attach('file', Buffer.from('abc'), {
          filename: 'speech.webm',
          contentType: 'audio/webm;codecs=opus',
        })
        .expect(200);
      expect(res.body).toEqual({ text: 'Good morning.' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('dịch vụ lỗi → 502 STT_UNAVAILABLE', async () => {
      fetchMock.mockResolvedValue(new Response('down', { status: 500 }));
      const res = await post()
        .attach('file', Buffer.from('abc'), {
          filename: 'speech.webm',
          contentType: 'audio/webm',
        })
        .expect(502);
      expect(res.body).toMatchObject({ code: 'STT_UNAVAILABLE' });
    });
  });
});
