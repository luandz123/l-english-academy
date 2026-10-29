import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const PLAN_TYPES = ['vip_combo'] as const;

/**
 * Client chỉ chọn gói; **không** gửi giá hay mã đơn (AGENTS.md luật 5, SEC-004).
 * Hiện chỉ có `vip_combo` như client cũ.
 */
export class CreatePaymentOrderDto {
  @ApiPropertyOptional({ enum: PLAN_TYPES, default: 'vip_combo' })
  @IsOptional()
  @IsIn(PLAN_TYPES)
  plan_type?: (typeof PLAN_TYPES)[number];
}

/** Đơn thanh toán + cờ `completed` như `api/check-payment.ts`. */
export class PaymentOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LEA12345' })
  order_code!: string;

  @ApiProperty({
    example: 1750000,
    description: 'Do server tính từ cài đặt giá',
  })
  amount!: number;

  @ApiProperty({ nullable: true, type: String, example: 'vip_combo' })
  plan_type!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'pending' })
  status!: string | null;

  @ApiProperty()
  completed!: boolean;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paid_at!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  created_at!: string | null;
}

/** Body trả cho SePay. Luôn HTTP 200 (trừ sai API key) để SePay không báo sự cố. */
export class WebhookResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  order_code?: string | null;
}
