import { ApiProperty } from '@nestjs/swagger';

export class PaymentProfileDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  user_id!: string;

  @ApiProperty({ nullable: true, type: String, example: 'Nguyễn Văn A' })
  full_name!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'student@example.com' })
  email!: string | null;
}

export class AdminPaymentOrderDto {
  @ApiProperty({
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  user_id!: string;

  @ApiProperty({ example: 'LEA12345' })
  order_code!: string;

  @ApiProperty({ nullable: true, type: String, example: 'vip_combo' })
  plan_type!: string | null;

  @ApiProperty({
    example: 499000,
    description: 'Số tiền đơn hàng dạng số (number)',
  })
  amount!: number;

  @ApiProperty({ nullable: true, type: String, example: 'pending' })
  status!: string | null;

  @ApiProperty({ nullable: true, type: String, example: 'vietqr_sepay' })
  payment_gateway!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'MANUAL_ADMIN_123456789',
  })
  bank_transaction_id!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'ADMIN_MANUAL_APPROVE LEA12345',
  })
  transaction_content!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  paid_at!: string | null;

  @ApiProperty({ nullable: true, type: Object })
  metadata!: unknown;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  created_at!: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  updated_at!: string | null;

  @ApiProperty({ nullable: true, type: () => PaymentProfileDto })
  profile!: PaymentProfileDto | null;
}
