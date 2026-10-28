import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';
import { TokenService } from '../src/modules/auth/token.service';
import { AppRole } from '../src/generated/prisma/enums';
import type { AdminPaymentOrderDto } from '../src/modules/payments/dto/admin-payment-order.dto';

describe('PaymentsAdminController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const EMAIL_SUFFIX = '@payments-admin.test';

  let studentToken: string;
  let studentUserId: string;
  let adminToken: string;
  let adminUserId: string;
  const createdCourseIds: number[] = [];

  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function cleanup(): Promise<void> {
    await prisma.adminActivityLog.deleteMany({
      where: { entityType: 'payment_orders' },
    });
    await prisma.course.deleteMany({
      where: { title: { startsWith: '[e2e-pay-admin]' } },
    });
    await prisma.user.deleteMany({
      where: { email: { endsWith: EMAIL_SUFFIX } },
    });
  }

  async function createUser(email: string, fullName: string, role?: AppRole) {
    const user = await prisma.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            fullName,
            email,
          },
        },
        ...(role
          ? {
              roles: {
                create: {
                  role,
                },
              },
            }
          : {}),
      },
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

    // Tạo các khóa học mẫu để test tự động ghi danh khi duyệt đơn
    const c1 = await prisma.course.create({
      data: {
        title: '[e2e-pay-admin] Active Course 1',
        courseType: 'video_quiz',
        isActive: true,
      },
    });
    const c2 = await prisma.course.create({
      data: {
        title: '[e2e-pay-admin] Active Course 2',
        courseType: 'video_quiz',
        isActive: true,
      },
    });
    const c3 = await prisma.course.create({
      data: {
        title: '[e2e-pay-admin] Inactive Course',
        courseType: 'video_quiz',
        isActive: false,
      },
    });
    createdCourseIds.push(c1.id, c2.id, c3.id);

    const student = await createUser(`student${EMAIL_SUFFIX}`, 'Học Viên Test');
    studentUserId = student.id;
    studentToken = student.token;

    const admin = await createUser(
      `admin${EMAIL_SUFFIX}`,
      'Quản Trị Viên Test',
      AppRole.admin,
    );
    adminUserId = admin.id;
    adminToken = admin.token;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('Phân quyền 3 vai (401/403/200)', () => {
    const testOrderCode = 'ORDER_ROLE_TEST';

    beforeAll(async () => {
      await prisma.paymentOrder.create({
        data: {
          orderCode: testOrderCode,
          userId: studentUserId,
          amount: 500000,
          planType: 'vip_combo',
          status: 'pending',
        },
      });
    });

    it('GET /api/v1/payments/admin/orders: không token -> 401, token học viên -> 403, admin -> 200', async () => {
      await http().get('/api/v1/payments/admin/orders').expect(401);
      await http()
        .get('/api/v1/payments/admin/orders')
        .set(bearer(studentToken))
        .expect(403);
      const res = await http()
        .get('/api/v1/payments/admin/orders')
        .set(bearer(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST /api/v1/payments/admin/orders/:orderCode/approve: không token -> 401, học viên duyệt đơn của chính mình -> 403', async () => {
      await http()
        .post(`/api/v1/payments/admin/orders/${testOrderCode}/approve`)
        .expect(401);

      // Học viên không được duyệt đơn, kể cả đơn của chính mình
      await http()
        .post(`/api/v1/payments/admin/orders/${testOrderCode}/approve`)
        .set(bearer(studentToken))
        .expect(403);
    });
  });

  describe('Chức năng danh sách và duyệt đơn', () => {
    const orderCode1 = 'ADM_ORDER_001';
    const orderCode2 = 'ADM_ORDER_002';

    beforeAll(async () => {
      // Xóa đơn cũ nếu có
      await prisma.paymentOrder.deleteMany({
        where: { orderCode: { in: [orderCode1, orderCode2] } },
      });

      // Tạo 2 đơn
      await prisma.paymentOrder.create({
        data: {
          orderCode: orderCode1,
          userId: studentUserId,
          amount: 499000,
          planType: 'vip_combo',
          status: 'pending',
          createdAt: new Date('2026-10-28T09:00:00Z'),
        },
      });

      await prisma.paymentOrder.create({
        data: {
          orderCode: orderCode2,
          userId: studentUserId,
          amount: 899000,
          planType: 'vip_combo',
          status: 'pending',
          createdAt: new Date('2026-10-28T10:00:00Z'),
        },
      });
    });

    it('GET /api/v1/payments/admin/orders trả về danh sách có profile.full_name, amount là number, mới nhất trước', async () => {
      const res = await http()
        .get('/api/v1/payments/admin/orders')
        .set(bearer(adminToken))
        .expect(200);

      const orders = res.body as AdminPaymentOrderDto[];
      expect(orders.length).toBeGreaterThanOrEqual(2);

      const o2Index = orders.findIndex((o) => o.order_code === orderCode2);
      const o1Index = orders.findIndex((o) => o.order_code === orderCode1);
      expect(o2Index).toBeLessThan(o1Index); // o2 mới hơn o1 nên đứng trước

      const targetOrder = orders[o2Index];
      expect(targetOrder.amount).toBe(899000);
      expect(typeof targetOrder.amount).toBe('number');
      expect(targetOrder.profile).not.toBeNull();
      expect(targetOrder.profile?.user_id).toBe(studentUserId);
      expect(targetOrder.profile?.full_name).toBe('Học Viên Test');
      expect(targetOrder.profile?.email).toBe(`student${EMAIL_SUFFIX}`);
    });

    it('POST /api/v1/payments/admin/orders/:orderCode/approve trả về 404 khi mã đơn không tồn tại', async () => {
      const res = await http()
        .post('/api/v1/payments/admin/orders/NON_EXISTENT_ORDER/approve')
        .set(bearer(adminToken))
        .expect(404);

      expect((res.body as { code: string }).code).toBe('ORDER_NOT_FOUND');
    });

    it('POST /api/v1/payments/admin/orders/:orderCode/approve duyệt thành công: completed, profile is_pro, enrollments, log có admin_id', async () => {
      const res = await http()
        .post(`/api/v1/payments/admin/orders/${orderCode2}/approve`)
        .set(bearer(adminToken))
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        order_code: orderCode2,
      });

      // Kiểm tra DB: đơn đã completed và có thông tin duyệt thủ công
      const dbOrder = await prisma.paymentOrder.findUniqueOrThrow({
        where: { orderCode: orderCode2 },
      });
      expect(dbOrder.status).toBe('completed');
      expect(dbOrder.paidAt).not.toBeNull();
      expect(dbOrder.bankTransactionId).toMatch(/^MANUAL_ADMIN_\d+$/);
      expect(dbOrder.transactionContent).toBe(
        `ADMIN_MANUAL_APPROVE ${orderCode2}`,
      );

      // Kiểm tra DB: profile học viên đã được nâng cấp VIP PRO
      const dbProfile = await prisma.profile.findUniqueOrThrow({
        where: { userId: studentUserId },
      });
      expect(dbProfile.isPro).toBe(true);
      expect(dbProfile.proPlan).toBe('vip_combo');
      expect(dbProfile.proActivatedAt).not.toBeNull();

      // Kiểm tra DB: enrollments cho các khóa học active
      const enrollments = await prisma.enrollment.findMany({
        where: {
          userId: studentUserId,
          courseId: { in: createdCourseIds },
        },
      });
      // 2 khóa active được ghi danh, 1 khóa inactive không được ghi danh
      expect(enrollments.length).toBe(2);

      // Kiểm tra DB: adminActivityLog được ghi kèm adminId
      const logs = await prisma.adminActivityLog.findMany({
        where: {
          entityId: dbOrder.id,
          action: 'payment_manual_approve',
        },
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].adminId).toBe(adminUserId);
      const details = logs[0].details as Record<string, unknown>;
      expect(details?.order_code).toBe(orderCode2);
      expect(details?.amount).toBe(899000);
    });

    it('POST /api/v1/payments/admin/orders/:orderCode/approve duyệt lần 2: trả success đã hoàn tất trước đó, không ghi log lần 2', async () => {
      const dbOrder = await prisma.paymentOrder.findUniqueOrThrow({
        where: { orderCode: orderCode2 },
      });

      const res = await http()
        .post(`/api/v1/payments/admin/orders/${orderCode2}/approve`)
        .set(bearer(adminToken))
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        message: 'Đơn hàng đã được hoàn tất trước đó.',
        order_code: orderCode2,
      });

      // Kiểm tra log không tăng thêm
      const logs = await prisma.adminActivityLog.findMany({
        where: {
          entityId: dbOrder.id,
          action: 'payment_manual_approve',
        },
      });
      expect(logs).toHaveLength(1);
    });
  });
});
