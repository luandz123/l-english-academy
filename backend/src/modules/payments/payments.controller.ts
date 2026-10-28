import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  CreatePaymentOrderDto,
  PaymentOrderDto,
  WebhookResultDto,
} from './dto/payment-order.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo (hoặc dùng lại) đơn thanh toán VIP',
    description:
      'Dùng lại đơn pending của mình trong 30 phút. Giá do server đọc từ cài đặt; ' +
      'client không gửi số tiền hay mã đơn.',
  })
  @ApiCreatedResponse({ type: PaymentOrderDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  createOrder(
    @Body() dto: CreatePaymentOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentOrderDto> {
    return this.payments.createOrder(user.id, dto.plan_type);
  }

  @Get('orders/:orderCode')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trạng thái đơn (của mình, hoặc admin)' })
  @ApiOkResponse({ type: PaymentOrderDto })
  @ApiNotFoundResponse({
    description: 'ORDER_NOT_FOUND (kể cả đơn của người khác)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getOrder(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentOrderDto> {
    return this.payments.getOrder(user, orderCode);
  }

  @Post('orders/:orderCode/simulate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Giả lập thanh toán thành công (chỉ staging/dev)',
    description: 'Chỉ khi PAYMENT_SIMULATION_ENABLED=true và đơn là của mình.',
  })
  @ApiOkResponse({ type: PaymentOrderDto })
  @ApiForbiddenResponse({ description: 'PAYMENT_SIMULATION_DISABLED' })
  @ApiNotFoundResponse({ description: 'ORDER_NOT_FOUND' })
  simulate(
    @Param('orderCode') orderCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentOrderDto> {
    return this.payments.simulate(user, orderCode);
  }

  @Post('webhooks/sepay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook biến động số dư SePay',
    description:
      'Bắt buộc header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>` (hoặc `x-api-key`). ' +
      'Luôn 200 khi key đúng để SePay không báo sự cố; kết quả trong `success`.',
  })
  @ApiHeader({ name: 'Authorization', required: true })
  @ApiOkResponse({ type: WebhookResultDto })
  @ApiUnauthorizedResponse({ description: 'WEBHOOK_UNAUTHORIZED' })
  sepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Headers('x-api-key') apiKey: string | undefined,
    // Payload SePay có nhiều trường; không dùng DTO để `forbidNonWhitelisted` không chặn
    @Body() body: Record<string, unknown>,
  ): Promise<WebhookResultDto> {
    return this.payments.handleSepayWebhook(
      authorization ?? apiKey,
      body ?? {},
    );
  }
}
