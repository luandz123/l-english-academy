import { Injectable } from '@nestjs/common';
import type { PaymentOrder } from '../../generated/prisma/client';
import { PaymentOrderDto } from './dto/payment-order.dto';

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
}
