import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { PaymentOrder } from '../../generated/prisma/client';
import type { Env } from '../../config/env.schema';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { PaymentOrderDto, WebhookResultDto } from './dto/payment-order.dto';
import {
  extractOrderCode,
  isPaidInFull,
  newOrderCode,
  REUSE_PENDING_MS,
  vipPriceFromSetting,
} from './payment-rules';
import { PaymentsMapper } from './payments.mapper';
import { PaymentsRepository } from './payments.repository';

const PRICE_SETTING_KEY = 'homepage_showcase_config';
const MAX_CODE_ATTEMPTS = 5;

/** Trường dạng chữ/số của payload SePay; kiểu khác → chuỗi rỗng. */
function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly repo: PaymentsRepository,
    private readonly mapper: PaymentsMapper,
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Thay `UpgradeProModal.tsx:93-140`. Dùng lại đơn pending của mình trong 30 phút (PAY-003),
   * nếu không thì tạo đơn mới với giá **server** đọc từ cài đặt (SEC-004).
   */
  async createOrder(
    userId: string,
    planType: string = 'vip_combo',
  ): Promise<PaymentOrderDto> {
    const since = new Date(Date.now() - REUSE_PENDING_MS);
    const existing = await this.repo.findRecentPendingOrder(userId, since);
    if (existing) return this.mapper.toOrderDto(existing);

    const amount = vipPriceFromSetting(
      await this.repo.findSetting(PRICE_SETTING_KEY),
    );
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      const created = await this.repo.tryCreateOrder({
        userId,
        orderCode: newOrderCode(),
        amount,
        planType,
      });
      if (created) return this.mapper.toOrderDto(created);
    }
    throw new ServiceUnavailableException({
      code: 'ORDER_CODE_EXHAUSTED',
      message: 'Không tạo được mã đơn, vui lòng thử lại',
    });
  }

  /**
   * Thay `check_payment_order_status`, `api/check-payment.ts`. Cũ: ai biết mã đơn cũng đọc
   * được; mới: chủ đơn hoặc admin, người khác nhận 404.
   */
  async getOrder(
    user: AuthenticatedUser,
    orderCode: string,
  ): Promise<PaymentOrderDto> {
    return this.mapper.toOrderDto(await this.findVisibleOrder(user, orderCode));
  }

  /**
   * Thay `api/payment-webhook.ts`. Bắt buộc API key (#23d). Mã đơn chỉ để tra cứu: không có
   * đơn trùng mã → ghi nhật ký cho admin, **không** tự khớp đơn pending khác (#23b).
   */
  async handleSepayWebhook(
    authorization: string | undefined,
    body: Record<string, unknown>,
  ): Promise<WebhookResultDto> {
    this.assertWebhookKey(authorization);

    const transferType = (text(body.transferType) || 'in').toLowerCase();
    if (transferType !== 'in') {
      return { success: true, message: 'Ignored outgoing transfer' };
    }

    const content = text(body.content) || text(body.description);
    const transferAmount = Number(body.transferAmount) || 0;
    const bankTxId = text(body.id) || text(body.referenceCode) || null;
    const orderCode =
      extractOrderCode(content) ??
      (typeof body.code === 'string' && body.code ? body.code : null);

    const order = orderCode ? await this.repo.findOrderByCode(orderCode) : null;
    if (!order) {
      await this.repo.logActivity('payment_unmatched', null, {
        order_code: orderCode,
        amount: transferAmount,
        bank_tx_id: bankTxId,
        transaction_content: content,
      });
      this.logger.warn(
        `Webhook SePay không khớp đơn (mã: ${orderCode ?? 'rỗng'})`,
      );
      return {
        success: false,
        message: 'Không tìm thấy đơn hàng khớp nội dung chuyển khoản',
        order_code: orderCode,
      };
    }

    return this.applyPayment(order, {
      transferAmount,
      bankTxId,
      transactionContent: content || null,
      action: 'payment_completed_auto_upgrade',
    });
  }

  /**
   * Thay nút giả lập (`UpgradeProModal.tsx:286-325`, gọi thẳng RPC từ trình duyệt). Chỉ chạy khi
   * `PAYMENT_SIMULATION_ENABLED=true` (staging/dev) và chỉ cho đơn của chính mình (#23c).
   */
  async simulate(
    user: AuthenticatedUser,
    orderCode: string,
  ): Promise<PaymentOrderDto> {
    if (!this.config.get('PAYMENT_SIMULATION_ENABLED', { infer: true })) {
      throw new ForbiddenException({
        code: 'PAYMENT_SIMULATION_DISABLED',
        message: 'Giả lập thanh toán không được bật trên môi trường này',
      });
    }
    const order = await this.findVisibleOrder(user, orderCode);
    await this.applyPayment(order, {
      transferAmount: Number(order.amount),
      bankTxId: `SEPAY_SIM_${Date.now()}`,
      transactionContent: `TEST_SIMULATE ${order.orderCode}`,
      action: 'payment_simulated',
    });
    return this.mapper.toOrderDto(
      (await this.repo.findOrderByCode(order.orderCode)) ?? order,
    );
  }

  private async applyPayment(
    order: PaymentOrder,
    input: {
      transferAmount: number;
      bankTxId: string | null;
      transactionContent: string | null;
      action: string;
    },
  ): Promise<WebhookResultDto> {
    if (order.status === 'completed') {
      return {
        success: true,
        message: 'Đơn hàng đã được hoàn tất trước đó.',
        order_code: order.orderCode,
      };
    }
    if (!isPaidInFull(input.transferAmount, Number(order.amount))) {
      await this.repo.logActivity('payment_underpaid', order.id, {
        order_code: order.orderCode,
        amount: input.transferAmount,
        order_amount: Number(order.amount),
        bank_tx_id: input.bankTxId,
        transaction_content: input.transactionContent,
      });
      return {
        success: false,
        message: `Số tiền chuyển (${input.transferAmount}đ) không đủ so với giá trị đơn (${Number(order.amount)}đ)`,
        order_code: order.orderCode,
      };
    }

    const { completed } = await this.repo.completeOrder({ order, ...input });
    return {
      success: true,
      message: completed
        ? `Kích hoạt thành công đơn hàng ${order.orderCode}`
        : 'Đơn hàng đã được hoàn tất trước đó.',
      order_code: order.orderCode,
    };
  }

  private async findVisibleOrder(
    user: AuthenticatedUser,
    orderCode: string,
  ): Promise<PaymentOrder> {
    const order = await this.repo.findOrderByCode(orderCode);
    const visible =
      order &&
      (order.userId === user.id || (await this.auth.hasRole(user.id, 'admin')));
    if (!order || !visible) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Không tìm thấy đơn hàng',
      });
    }
    return order;
  }

  /** So sánh hằng thời gian; thiếu cấu hình key → từ chối tất cả (fail closed). */
  private assertWebhookKey(authorization: string | undefined): void {
    const expected = this.config.get('SEPAY_WEBHOOK_API_KEY', { infer: true });
    const given = (authorization ?? '')
      .replace(/^(Apikey|Bearer)\s+/i, '')
      .trim();
    const ok =
      Boolean(expected) &&
      given.length === expected!.length &&
      timingSafeEqual(Buffer.from(given), Buffer.from(expected!));
    if (!ok) {
      throw new UnauthorizedException({
        code: 'WEBHOOK_UNAUTHORIZED',
        message: 'Unauthorized webhook request',
      });
    }
  }
}
