import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Loại đơn: mua một khóa học. Đơn `vip_combo` cũ vẫn được hoàn tất nhưng không tạo mới được. */
export const COURSE_PLAN = 'course';

/**
 * Client chỉ chọn khóa học; **không** gửi giá hay mã đơn (AGENTS.md luật 5, SEC-004).
 * Giá lấy từ `courses.price` ở server.
 */
export class CreatePaymentOrderDto {
  @ApiProperty({ example: 12, description: 'Khóa học muốn mua' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  course_id!: number;
}

/** Đơn thanh toán + cờ `completed` như `api/check-payment.ts`. */
export class PaymentOrderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LEA12345' })
  order_code!: string;

  @ApiProperty({
    example: 1990000,
    description: 'Do server lấy từ giá khóa học',
  })
  amount!: number;

  @ApiProperty({ nullable: true, type: String, example: 'course' })
  plan_type!: string | null;

  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Khóa học của đơn (null với đơn VIP cũ)',
  })
  course_id!: number | null;

  @ApiProperty({ nullable: true, type: String })
  course_title!: string | null;

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
