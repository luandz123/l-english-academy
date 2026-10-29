import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import type {
  PaymentOrderDto,
  WebhookResultDto,
} from '../src/modules/payments/dto/payment-order.dto';

/**
 * Lỗ hổng cũ → kiểm tra mới (OPEN_QUESTIONS #23, SEC-003/004/005, ADD-003):
 * - Client tự gửi `amount` khi tạo đơn → giá do server đọc từ platform_settings.
 * - RLS `UPDATE USING (true)` / RPC cấp cho anon → chỉ webhook có API key mới hoàn tất đơn.
 * - Chuyển ≥ 5.000đ là đủ → phải chuyển đủ số tiền của đơn (#23a).
 * - Không có mã đơn → tự khớp đơn pending mới nhất → ghi nhật ký, không kích hoạt (#23b).
 * - Nút giả lập cho mọi học viên → chỉ đơn của mình và chỉ khi bật cờ môi trường (#23c).
 * - "Users can view own payment orders" → đọc đơn: chủ đơn hoặc admin.
 */
describe('PaymentsModule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@payments.test';
  const KEY = 'test-sepay-webhook-key-123456';
  const PRICE = 990_000;
  const tokens = { a: '', b: '', admin: '' };
  const users = { a: '', b: '' };
  const courseIds: number[] = [];

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const webhook = (body: object, key: string | null = KEY) => {
    const req = http().post('/api/v1/payments/webhooks/sepay');
    return (
      key === null ? req : req.set('Authorization', `Apikey ${key}`)
    ).send(body);
  };
  const createOrder = (token: string, body: object = {}) =>
    http().post('/api/v1/payments/orders').set(bearer(token)).send(body);

  async function cleanup(): Promise<void> {
    await prisma.adminActivityLog.deleteMany({
      where: { entityType: 'payment_orders' },
    });
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-pay]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
    await prisma.platformSetting.deleteMany({
      where: { key: 'homepage_showcase_config' },
    });
  }

  async function userWithToken(
    email: string,
  ): Promise<{ id: string; token: string }> {
    const user = await prisma.user.create({
      data: { email, emailVerifiedAt: new Date(), profile: { create: {} } },
    });
    const { accessToken } = await app
      .get(TokenService)
      .signAccessToken({ id: user.id, email });
    return { id: user.id, token: accessToken };
  }

  async function profileOf(userId: string) {
    return prisma.profile.findUniqueOrThrow({ where: { userId } });
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

    await prisma.platformSetting.create({
      data: {
        key: 'homepage_showcase_config',
        value: JSON.stringify({ vip_combo: { price: PRICE } }),
      },
    });
    for (const [title, isActive] of [
      ['[e2e-pay] Khóa 1', true],
      ['[e2e-pay] Khóa 2', true],
      ['[e2e-pay] Khóa ẩn', false],
    ] as const) {
      const c = await prisma.course.create({
        data: { title, courseType: 'video_quiz', isActive },
      });
      courseIds.push(c.id);
    }

    const a = await userWithToken(`a${EMAIL_SUFFIX}`);
    const b = await userWithToken(`b${EMAIL_SUFFIX}`);
    const admin = await userWithToken(`admin${EMAIL_SUFFIX}`);
    await prisma.userRole.create({ data: { userId: admin.id, role: 'admin' } });
    Object.assign(tokens, { a: a.token, b: b.token, admin: admin.token });
    Object.assign(users, { a: a.id, b: b.id });
  });

  afterAll(async () => {
    await cleanup();
    await app?.close();
  });

  describe('tạo đơn', () => {
    it('không token → 401', async () => {
      await http().post('/api/v1/payments/orders').send({}).expect(401);
    });

    it('giá lấy từ cài đặt server; client gửi amount/order_code → 400', async () => {
      const res = await createOrder(tokens.a).expect(201);
      const order = res.body as PaymentOrderDto;
      expect(order).toMatchObject({
        amount: PRICE,
        status: 'pending',
        completed: false,
      });
      expect(order.order_code).toMatch(/^LEA\d{5}$/);
      await createOrder(tokens.a, { amount: 1000 }).expect(400);
      await createOrder(tokens.a, { order_code: 'LEA00001' }).expect(400);
    });

    it('gọi lại trong 30 phút → dùng lại đơn pending cũ', async () => {
      const first = (await createOrder(tokens.b).expect(201))
        .body as PaymentOrderDto;
      const again = (await createOrder(tokens.b).expect(201))
        .body as PaymentOrderDto;
      expect(again.order_code).toBe(first.order_code);
      expect(
        await prisma.paymentOrder.count({ where: { userId: users.b } }),
      ).toBe(1);
    });
  });

  describe('xem đơn', () => {
    it('chủ đơn và admin xem được; người khác 404', async () => {
      const code = (
        (await createOrder(tokens.a).expect(201)).body as PaymentOrderDto
      ).order_code;
      await http()
        .get(`/api/v1/payments/orders/${code}`)
        .set(bearer(tokens.a))
        .expect(200);
      await http()
        .get(`/api/v1/payments/orders/${code.toLowerCase()}`)
        .set(bearer(tokens.admin))
        .expect(200);
      const other = await http()
        .get(`/api/v1/payments/orders/${code}`)
        .set(bearer(tokens.b))
        .expect(404);
      expect((other.body as { code: string }).code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('webhook SePay', () => {
    it('thiếu hoặc sai API key → 401, không đổi gì', async () => {
      const code = (
        (await createOrder(tokens.a).expect(201)).body as PaymentOrderDto
      ).order_code;
      const body = {
        transferType: 'in',
        content: code,
        transferAmount: PRICE,
        id: 1,
      };
      await webhook(body, null).expect(401);
      await webhook(body, 'wrong-key-wrong-key-wrong').expect(401);
      const order = await prisma.paymentOrder.findUniqueOrThrow({
        where: { orderCode: code },
      });
      expect(order.status).toBe('pending');
    });

    it('thiếu tiền (kể cả ≥ 5.000đ) → không kích hoạt, ghi payment_underpaid', async () => {
      const code = (
        (await createOrder(tokens.a).expect(201)).body as PaymentOrderDto
      ).order_code;
      const res = await webhook({
        transferType: 'in',
        content: `CK ${code}`,
        transferAmount: 5000,
        id: 2,
      }).expect(200);
      expect((res.body as WebhookResultDto).success).toBe(false);
      expect((await profileOf(users.a)).isPro).toBe(false);
      expect(
        await prisma.adminActivityLog.count({
          where: { action: 'payment_underpaid', entityType: 'payment_orders' },
        }),
      ).toBe(1);
    });

    it('không có mã đơn → không tự khớp đơn pending nào, ghi payment_unmatched', async () => {
      const res = await webhook({
        transferType: 'in',
        content: 'chuyen tien',
        transferAmount: PRICE,
        id: 3,
      }).expect(200);
      expect((res.body as WebhookResultDto).success).toBe(false);
      expect(
        await prisma.paymentOrder.count({ where: { status: 'completed' } }),
      ).toBe(0);
      expect(
        await prisma.adminActivityLog.count({
          where: { action: 'payment_unmatched' },
        }),
      ).toBe(1);
    });

    it('chuyển khoản ra (transferType out) → bỏ qua', async () => {
      const res = await webhook({
        transferType: 'out',
        content: 'LEA12345',
        transferAmount: PRICE,
      }).expect(200);
      expect((res.body as WebhookResultDto).message).toBe(
        'Ignored outgoing transfer',
      );
    });

    it('đủ tiền → đơn completed, bật PRO, ghi danh mọi khóa đang mở; gọi lại không ghi lần 2', async () => {
      const code = (
        (await createOrder(tokens.a).expect(201)).body as PaymentOrderDto
      ).order_code;
      const body = {
        transferType: 'in',
        content: `MBVCB.1 ${code.toLowerCase()} nang cap`,
        transferAmount: PRICE,
        id: 4,
        gateway: 'MBBank',
        accountNumber: '0123',
      };
      const res = await webhook(body).expect(200);
      expect(res.body as WebhookResultDto).toMatchObject({
        success: true,
        order_code: code,
      });

      const order = await prisma.paymentOrder.findUniqueOrThrow({
        where: { orderCode: code },
      });
      expect(order.status).toBe('completed');
      expect(order.bankTransactionId).toBe('4');
      const profile = await profileOf(users.a);
      expect(profile.isPro).toBe(true);
      expect(profile.proPlan).toBe('vip_combo');
      const enrolled = await prisma.enrollment.findMany({
        where: { userId: users.a },
      });
      expect(enrolled.map((e) => e.courseId).sort()).toEqual(
        courseIds.slice(0, 2).sort(),
      );
      expect(enrolled.every((e) => e.expiresAt === null)).toBe(true);

      const again = await webhook(body).expect(200);
      expect((again.body as WebhookResultDto).success).toBe(true);
      expect(
        await prisma.adminActivityLog.count({
          where: {
            action: 'payment_completed_auto_upgrade',
            entityId: order.id,
          },
        }),
      ).toBe(1);

      const status = await http()
        .get(`/api/v1/payments/orders/${code}`)
        .set(bearer(tokens.a))
        .expect(200);
      expect((status.body as PaymentOrderDto).completed).toBe(true);
    });
  });

  describe('giả lập (bật PAYMENT_SIMULATION_ENABLED trong e2e)', () => {
    it('người khác không giả lập được đơn của mình → 404', async () => {
      await prisma.paymentOrder.deleteMany({ where: { userId: users.b } });
      const code = (
        (await createOrder(tokens.b).expect(201)).body as PaymentOrderDto
      ).order_code;
      await http()
        .post(`/api/v1/payments/orders/${code}/simulate`)
        .set(bearer(tokens.a))
        .expect(404);
      expect((await profileOf(users.b)).isPro).toBe(false);
    });

    it('chủ đơn giả lập → completed + PRO', async () => {
      const code = (
        (await createOrder(tokens.b).expect(201)).body as PaymentOrderDto
      ).order_code;
      const res = await http()
        .post(`/api/v1/payments/orders/${code}/simulate`)
        .set(bearer(tokens.b))
        .expect(200);
      expect((res.body as PaymentOrderDto).completed).toBe(true);
      expect((await profileOf(users.b)).isPro).toBe(true);
    });
  });
});
