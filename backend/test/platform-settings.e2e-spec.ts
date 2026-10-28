import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  PublicSettingResponseDto,
  SettingDto,
} from '../src/modules/admin/dto';

/**
 * E2E cho T-018: Cài đặt nền tảng (platform_settings)
 * - Khách đọc được homepage_showcase_config qua /api/v1/settings/:key
 * - Khách đọc key không công khai (vd. secret_x đã seed) → { setting: null }
 * - Admin đọc tất cả qua /api/v1/admin/settings
 * - Học viên gọi route admin → 403; không token → 401
 * - PUT tạo mới rồi PUT lại cập nhật (1 dòng)
 * - key sai định dạng → 400 VALIDATION_FAILED
 * - Sau PUT homepage_showcase_config với giá mới, POST /payments/orders của user mới dùng giá đó
 */
describe('PlatformSettings (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@platform-settings.test';

  const tokens = { student: '', admin: '' };
  const userIds = { student: '', admin: '' };

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
    await prisma.paymentOrder.deleteMany({
      where: { user: { email: { endsWith: EMAIL_SUFFIX } } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
    await prisma.platformSetting.deleteMany({
      where: {
        key: {
          in: ['secret_x', 'test_setting_1'],
        },
      },
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

    // Seed 1 public key và 1 secret key
    await prisma.platformSetting.upsert({
      where: { key: 'homepage_showcase_config' },
      create: {
        key: 'homepage_showcase_config',
        value: JSON.stringify({ vip_combo: { price: 1750000 } }),
      },
      update: {
        value: JSON.stringify({ vip_combo: { price: 1750000 } }),
      },
    });
    await prisma.platformSetting.upsert({
      where: { key: 'secret_x' },
      create: {
        key: 'secret_x',
        value: 'very_sensitive_data',
      },
      update: {
        value: 'very_sensitive_data',
      },
    });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('Route công khai GET /api/v1/settings/:key', () => {
    it('khách đọc được homepage_showcase_config mà không cần token', async () => {
      const res = await http()
        .get('/api/v1/settings/homepage_showcase_config')
        .expect(200);

      const body = res.body as PublicSettingResponseDto;
      expect(body).toHaveProperty('setting');
      expect(body.setting).toMatchObject({
        key: 'homepage_showcase_config',
      });
      expect(body.setting?.value).toContain('1750000');
    });

    it('khách đọc key không công khai (secret_x đã seed) → { setting: null }', async () => {
      const res = await http().get('/api/v1/settings/secret_x').expect(200);
      expect(res.body).toEqual({ setting: null });
    });

    it('khách đọc key không tồn tại → { setting: null }', async () => {
      const res = await http()
        .get('/api/v1/settings/non_existent_key')
        .expect(200);
      expect(res.body).toEqual({ setting: null });
    });
  });

  describe('RBAC — route admin (GET /admin/settings, PUT /admin/settings/:key)', () => {
    it('GET /admin/settings: không token → 401', async () => {
      await http().get('/api/v1/admin/settings').expect(401);
    });

    it('GET /admin/settings: học viên → 403', async () => {
      await http()
        .get('/api/v1/admin/settings')
        .set(bearer(tokens.student))
        .expect(403);
    });

    it('PUT /admin/settings/:key: không token → 401', async () => {
      await http()
        .put('/api/v1/admin/settings/test_setting_1')
        .send({ value: 'v1' })
        .expect(401);
    });

    it('PUT /admin/settings/:key: học viên → 403', async () => {
      await http()
        .put('/api/v1/admin/settings/test_setting_1')
        .set(bearer(tokens.student))
        .send({ value: 'v1' })
        .expect(403);
    });

    it('admin đọc tất cả key (bao gồm cả secret_x)', async () => {
      const res = await http()
        .get('/api/v1/admin/settings')
        .set(bearer(tokens.admin))
        .expect(200);

      const settings = res.body as SettingDto[];
      expect(Array.isArray(settings)).toBe(true);
      const keys = settings.map((s) => s.key);
      expect(keys).toContain('homepage_showcase_config');
      expect(keys).toContain('secret_x');
      const secret = settings.find((s) => s.key === 'secret_x');
      expect(secret?.value).toBe('very_sensitive_data');
    });
  });

  describe('Admin PUT /admin/settings/:key', () => {
    it('key sai định dạng (chữ hoa, khoảng trắng, ký tự đặc biệt) → 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .put('/api/v1/admin/settings/INVALID-KEY!')
        .set(bearer(tokens.admin))
        .send({ value: 'val' })
        .expect(400);

      expect(res.body).toMatchObject({ code: 'VALIDATION_FAILED' });
    });

    it('tạo mới rồi cập nhật (upsert 1 dòng duy nhất)', async () => {
      // 1. Tạo mới
      const createRes = await http()
        .put('/api/v1/admin/settings/test_setting_1')
        .set(bearer(tokens.admin))
        .send({ value: 'initial_value' })
        .expect(200);

      expect(createRes.body).toMatchObject({
        key: 'test_setting_1',
        value: 'initial_value',
      });

      const count1 = await prisma.platformSetting.count({
        where: { key: 'test_setting_1' },
      });
      expect(count1).toBe(1);

      // 2. Cập nhật lại
      const updateRes = await http()
        .put('/api/v1/admin/settings/test_setting_1')
        .set(bearer(tokens.admin))
        .send({ value: 'updated_value' })
        .expect(200);

      expect(updateRes.body).toMatchObject({
        key: 'test_setting_1',
        value: 'updated_value',
      });

      const count2 = await prisma.platformSetting.count({
        where: { key: 'test_setting_1' },
      });
      expect(count2).toBe(1);
    });

    it('sau PUT homepage_showcase_config giá mới, POST /payments/orders dùng giá đó', async () => {
      const NEW_PRICE = 899000;
      await http()
        .put('/api/v1/admin/settings/homepage_showcase_config')
        .set(bearer(tokens.admin))
        .send({
          value: JSON.stringify({
            vip_combo: { price: NEW_PRICE },
          }),
        })
        .expect(200);

      // User mới tạo đơn
      const buyer = await userWithToken(`buyer${EMAIL_SUFFIX}`);
      const orderRes = await http()
        .post('/api/v1/payments/orders')
        .set(bearer(buyer.token))
        .send({})
        .expect(201);

      const orderBody = orderRes.body as { amount: number };
      expect(orderBody.amount).toBe(NEW_PRICE);
    });
  });
});
