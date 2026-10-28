import { Injectable } from '@nestjs/common';
import type { PaymentOrder } from '../../generated/prisma/client';
import { PaymentOrderDto } from './dto/payment-order.dto';
import { AdminPaymentOrderDto } from './dto/admin-payment-order.dto';

export type PaymentOrderWithProfileRow = PaymentOrder & {
  user?: {
    profile?: {
      id: string;
      userId: string;
      fullName: string | null;
      email: string | null;
    } | null;
  } | null;
};

@Injectable()
export class PaymentsMapper {
  toOrderDto(order: PaymentOrder): PaymentOrderDto {
    return {
      id: order.id,
      order_code: order.orderCode,
      amount: Number(order.amount),
      plan_type: order.planType,
      status: order.status,
      completed: order.status === 'completed',
      paid_at: order.paidAt ? order.paidAt.toISOString() : null,
      created_at: order.createdAt ? order.createdAt.toISOString() : null,
    };
  }

  toAdminOrderDto(order: PaymentOrderWithProfileRow): AdminPaymentOrderDto {
    const profile = order.user?.profile;
    return {
      id: order.id,
      user_id: order.userId,
      order_code: order.orderCode,
      plan_type: order.planType,
      amount: Number(order.amount),
      status: order.status,
      payment_gateway: order.paymentGateway,
      bank_transaction_id: order.bankTransactionId,
      transaction_content: order.transactionContent,
      paid_at: order.paidAt ? order.paidAt.toISOString() : null,
      metadata: order.metadata,
      created_at: order.createdAt ? order.createdAt.toISOString() : null,
      updated_at: order.updatedAt ? order.updatedAt.toISOString() : null,
      profile: profile
        ? {
            id: profile.id,
            user_id: profile.userId,
            full_name: profile.fullName,
            email: profile.email,
          }
        : null,
    };
  }
}
