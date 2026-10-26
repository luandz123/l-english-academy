import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../guards/jwt-auth.guard';

/** Lấy người dùng đã xác thực (chỉ dùng trên route có JwtAuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
