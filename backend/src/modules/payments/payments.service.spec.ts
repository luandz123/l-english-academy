import { HttpException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { AuthService } from '../auth/auth.service';
import { PaymentsMapper } from './payments.mapper';
import type { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

const ORDER = {
  id: 'o1',
  orderCode: 'LEA12345',
  userId: 'u1',
  amount: '1750000',
  planType: 'vip_combo',
  status: 'pending',
  paidAt: null,
  createdAt: new Date('2026-10-28T10:00:00Z'),
};

function setup(env: Partial<Record<keyof Env, unknown>>) {
  const repo = {
    findOrderByCode: jest.fn().mockResolvedValue(ORDER),
    completeOrder: jest.fn().mockResolvedValue({ completed: true }),
    logActivity: jest.fn().mockResolvedValue(undefined),
    findCourse: jest.fn().mockResolvedValue({
      id: 7,
      title: 'TOEIC 650+',
      price: 1_990_000,
      isFree: false,
      isActive: true,
    }),
    hasActiveEnrollment: jest.fn().mockResolvedValue(false),
    findRecentPendingOrder: jest.fn().mockResolvedValue(null),
    tryCreateOrder: jest
      .fn()
      .mockImplementation((data: { amount: number }) =>
        Promise.resolve({ ...ORDER, ...data, amount: String(data.amount) }),
      ),
    findAllOrdersWithProfiles: jest.fn().mockResolvedValue([
      {
        ...ORDER,
        paymentGateway: 'vietqr_sepay',
        bankTransactionId: null,
        transactionContent: null,
        metadata: {},
        updatedAt: new Date('2026-10-28T10:00:00Z'),
        user: {
          profile: {
            id: 'p1',
            userId: 'u1',
            fullName: 'Học viên 1',
            email: 'hv1@example.com',
          },
        },
      },
    ]),
  };
  const auth = { hasRole: jest.fn().mockResolvedValue(false) };
  const config = { get: (key: keyof Env) => env[key] };
  const service = new PaymentsService(
    repo as unknown as PaymentsRepository,
    new PaymentsMapper(),
    auth as unknown as AuthService,
    config as unknown as ConfigService<Env, true>,
  );
  return { service, repo };
}

async function status(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (err) {
    const http = err as HttpException;
    return {
      status: http.getStatus(),
      code: (http.getResponse() as { code: string }).code,
    };
  }
  throw new Error('Lẽ ra phải ném lỗi');
}

const USER = { id: 'u1', email: 'u1@x.com' };
const BODY = {
  transferType: 'in',
  content: 'LEA12345',
  transferAmount: 1_750_000,
};

describe('PaymentsService', () => {
  describe('createOrder (mua khóa học)', () => {
    it('giá lấy từ courses.price, lưu khóa học trong metadata', async () => {
      const { service, repo } = setup({});
      const order = await service.createOrder('u1', 7);
      expect(repo.tryCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1_990_000,
          planType: 'course',
          metadata: { course_id: 7, course_title: 'TOEIC 650+' },
        }),
      );
      expect(order).toMatchObject({
        amount: 1_990_000,
        course_id: 7,
        course_title: 'TOEIC 650+',
      });
    });

    it('khóa miễn phí hoặc giá 0 → 400 COURSE_NOT_FOR_SALE', async () => {
      const { service, repo } = setup({});
      repo.findCourse.mockResolvedValueOnce({
        id: 7,
        title: 'x',
        price: 0,
        isFree: false,
        isActive: true,
      });
      expect(await status(service.createOrder('u1', 7))).toEqual({
        status: 400,
        code: 'COURSE_NOT_FOR_SALE',
      });
      repo.findCourse.mockResolvedValueOnce({
        id: 7,
        title: 'x',
        price: 500,
        isFree: true,
        isActive: true,
      });
      expect(await status(service.createOrder('u1', 7))).toEqual({
        status: 400,
        code: 'COURSE_NOT_FOR_SALE',
      });
      expect(repo.tryCreateOrder).not.toHaveBeenCalled();
    });

    it('khóa không tồn tại hoặc đang ẩn → 404', async () => {
      const { service, repo } = setup({});
      repo.findCourse.mockResolvedValueOnce(null);
      expect(await status(service.createOrder('u1', 99))).toEqual({
        status: 404,
        code: 'COURSE_NOT_FOUND',
      });
      repo.findCourse.mockResolvedValueOnce({
        id: 7,
        title: 'x',
        price: 500,
        isFree: false,
        isActive: false,
      });
      expect(await status(service.createOrder('u1', 7))).toEqual({
        status: 404,
        code: 'COURSE_NOT_FOUND',
      });
    });

    it('đã sở hữu khóa → 409 ALREADY_ENROLLED', async () => {
      const { service, repo } = setup({});
      repo.hasActiveEnrollment.mockResolvedValueOnce(true);
      expect(await status(service.createOrder('u1', 7))).toEqual({
        status: 409,
        code: 'ALREADY_ENROLLED',
      });
    });

    it('dùng lại đơn pending cùng khóa', async () => {
      const { service, repo } = setup({});
      repo.findRecentPendingOrder.mockResolvedValueOnce({
        ...ORDER,
        planType: 'course',
        metadata: { course_id: 7 },
      });
      const order = await service.createOrder('u1', 7);
      expect(order.order_code).toBe('LEA12345');
      expect(repo.findRecentPendingOrder).toHaveBeenCalledWith(
        'u1',
        expect.any(Date),
        7,
      );
      expect(repo.tryCreateOrder).not.toHaveBeenCalled();
    });
  });

  it('server chưa cấu hình SEPAY_WEBHOOK_API_KEY → từ chối mọi webhook (fail closed)', async () => {
    const { service, repo } = setup({});
    expect(await status(service.handleSepayWebhook('Apikey ', BODY))).toEqual({
      status: 401,
      code: 'WEBHOOK_UNAUTHORIZED',
    });
    expect(repo.completeOrder).not.toHaveBeenCalled();
  });

  it('key đúng (Apikey hoặc Bearer) → xử lý; key khác độ dài → 401', async () => {
    const key = 'k'.repeat(24);
    const { service, repo } = setup({ SEPAY_WEBHOOK_API_KEY: key });
    await expect(
      service.handleSepayWebhook(`Apikey ${key}`, BODY),
    ).resolves.toMatchObject({
      success: true,
    });
    await expect(
      service.handleSepayWebhook(`Bearer ${key}`, BODY),
    ).resolves.toMatchObject({
      success: true,
    });
    expect(repo.completeOrder).toHaveBeenCalledTimes(2);
    expect(
      (await status(service.handleSepayWebhook(`Apikey ${key}x`, BODY))).status,
    ).toBe(401);
  });

  it('PAYMENT_SIMULATION_ENABLED tắt → 403 PAYMENT_SIMULATION_DISABLED, không ghi', async () => {
    const { service, repo } = setup({ PAYMENT_SIMULATION_ENABLED: false });
    expect(await status(service.simulate(USER, 'LEA12345'))).toEqual({
      status: 403,
      code: 'PAYMENT_SIMULATION_DISABLED',
    });
    expect(repo.completeOrder).not.toHaveBeenCalled();
  });

  it('đơn đã completed → không gọi completeOrder lần nữa', async () => {
    const key = 'k'.repeat(24);
    const { service, repo } = setup({ SEPAY_WEBHOOK_API_KEY: key });
    repo.findOrderByCode.mockResolvedValue({ ...ORDER, status: 'completed' });
    await expect(
      service.handleSepayWebhook(`Apikey ${key}`, BODY),
    ).resolves.toMatchObject({
      success: true,
    });
    expect(repo.completeOrder).not.toHaveBeenCalled();
  });

  describe('admin operations', () => {
    const ADMIN = { id: 'admin-uuid', email: 'admin@example.com' };

    it('listAdminOrders trả về danh sách đơn kèm profile và amount dạng number', async () => {
      const { service } = setup({});
      const orders = await service.listAdminOrders();

      expect(orders).toHaveLength(1);
      expect(orders[0]).toMatchObject({
        id: 'o1',
        order_code: 'LEA12345',
        amount: 1750000,
        status: 'pending',
        profile: {
          id: 'p1',
          user_id: 'u1',
          full_name: 'Học viên 1',
          email: 'hv1@example.com',
        },
      });
    });

    it('approveOrder ném 404 ORDER_NOT_FOUND khi đơn không tồn tại', async () => {
      const { service, repo } = setup({});
      repo.findOrderByCode.mockResolvedValue(null);

      expect(await status(service.approveOrder(ADMIN, 'UNKNOWN'))).toEqual({
        status: 404,
        code: 'ORDER_NOT_FOUND',
      });
      expect(repo.completeOrder).not.toHaveBeenCalled();
    });

    it('approveOrder duyệt đơn thành công: gọi completeOrder với action payment_manual_approve và adminId', async () => {
      const { service, repo } = setup({});
      const result = await service.approveOrder(ADMIN, 'LEA12345');

      expect(result).toMatchObject({
        success: true,
        order_code: 'LEA12345',
      });
      expect(repo.completeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          transferAmount: 1750000,
          action: 'payment_manual_approve',
          adminId: 'admin-uuid',
        }),
      );
    });

    it('approveOrder khi đơn đã completed: trả về success true và không gọi completeOrder lần 2', async () => {
      const { service, repo } = setup({});
      repo.findOrderByCode.mockResolvedValue({ ...ORDER, status: 'completed' });

      const result = await service.approveOrder(ADMIN, 'LEA12345');

      expect(result).toMatchObject({
        success: true,
        message: 'Đơn hàng đã được hoàn tất trước đó.',
        order_code: 'LEA12345',
      });
      expect(repo.completeOrder).not.toHaveBeenCalled();
    });
  });
});
