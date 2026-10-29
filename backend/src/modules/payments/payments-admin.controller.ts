import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AdminPaymentOrderDto } from './dto/admin-payment-order.dto';
import { WebhookResultDto } from './dto/payment-order.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@Controller('payments/admin')
export class PaymentsAdminController {
  constructor(private readonly service: PaymentsService) {}

  @Get('orders')
  @ApiOperation({
    summary:
      'Danh sách đơn thanh toán cho admin kèm thông tin profile học viên',
  })
  @ApiOkResponse({ type: [AdminPaymentOrderDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  listOrders(): Promise<AdminPaymentOrderDto[]> {
    return this.service.listAdminOrders();
  }

  @Post('orders/:orderCode/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Admin duyệt đơn thanh toán thủ công và nâng cấp VIP PRO cho học viên',
  })
  @ApiOkResponse({ type: WebhookResultDto })
  @ApiNotFoundResponse({ description: 'Đơn hàng không tồn tại' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  approveOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderCode') orderCode: string,
  ): Promise<WebhookResultDto> {
    return this.service.approveOrder(user, orderCode);
  }
}
