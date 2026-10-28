import { Injectable } from '@nestjs/common';
import { Prisma, type PaymentOrder } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSetting(key: string): Promise<string | null> {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    return row?.value ?? null;
  }

  findRecentPendingOrder(
    userId: string,
    since: Date,
  ): Promise<PaymentOrder | null> {
    return this.prisma.paymentOrder.findFirst({
      where: { userId, status: 'pending', createdAt: { gte: since } },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  /** Trả `null` khi trùng `order_code` (P2002) để service sinh mã khác. */
  async tryCreateOrder(data: {
    userId: string;
    orderCode: string;
    amount: number;
    planType: string;
  }): Promise<PaymentOrder | null> {
    try {
      return await this.prisma.paymentOrder.create({
        data: { ...data, status: 'pending' },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return null;
      }
      throw err;
    }
  }

  /** Không phân biệt hoa thường như `UPPER(order_code) = UPPER(...)` của SQL cũ. */
  findOrderByCode(orderCode: string): Promise<PaymentOrder | null> {
    return this.prisma.paymentOrder.findFirst({
      where: { orderCode: { equals: orderCode.trim(), mode: 'insensitive' } },
    });
  }

  /**
   * Thay `complete_payment_order` (SQL cũ bước 4-7) trong **một** transaction: đổi đơn sang
   * `completed` (chỉ khi chưa completed → gọi lại webhook không kích hoạt lần 2), bật PRO trong
   * `profiles`, ghi danh mọi khóa đang mở, ghi nhật ký admin.
   * Ghi thẳng bảng của Auth (`profiles`) và Learning (`enrollments`) vì phải cùng transaction;
   * hai module đó chưa có service nhận transaction client.
   */
  completeOrder(input: {
    order: PaymentOrder;
    transferAmount: number;
    bankTxId: string | null;
    transactionContent: string | null;
    action: string;
  }): Promise<{ completed: boolean; enrolledCourses: number }> {
    const { order } = input;
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.paymentOrder.updateMany({
        where: { id: order.id, status: { not: 'completed' } },
        data: {
          status: 'completed',
          paidAt: now,
          updatedAt: now,
          ...(input.bankTxId ? { bankTransactionId: input.bankTxId } : {}),
          ...(input.transactionContent
            ? { transactionContent: input.transactionContent }
            : {}),
        },
      });
      if (updated.count === 0) return { completed: false, enrolledCourses: 0 };

      await tx.profile.updateMany({
        where: { userId: order.userId },
        data: {
          isPro: true,
          proPlan: order.planType ?? 'vip_combo',
          proActivatedAt: now,
        },
      });

      const courses = await tx.course.findMany({
        where: { OR: [{ isActive: true }, { isActive: null }] },
        select: { id: true },
      });
      const enrolled = await tx.enrollment.createMany({
        data: courses.map((c) => ({
          userId: order.userId,
          courseId: c.id,
          enrolledAt: now,
        })),
        skipDuplicates: true,
      });

      await tx.adminActivityLog.create({
        data: {
          action: input.action,
          entityType: 'payment_orders',
          entityId: order.id,
          details: {
            order_code: order.orderCode,
            user_id: order.userId,
            amount: input.transferAmount,
            bank_tx_id: input.bankTxId,
            transaction_content: input.transactionContent,
            enrolled_courses: enrolled.count,
          },
        },
      });
      return { completed: true, enrolledCourses: enrolled.count };
    });
  }

  /** Giao dịch không kích hoạt được (không khớp đơn, thiếu tiền) → để admin duyệt tay (#23b). */
  async logActivity(
    action: string,
    entityId: string | null,
    details: Prisma.InputJsonObject,
  ): Promise<void> {
    await this.prisma.adminActivityLog.create({
      data: { action, entityType: 'payment_orders', entityId, details },
    });
  }
}
