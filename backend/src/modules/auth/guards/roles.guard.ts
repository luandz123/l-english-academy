import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '../../../generated/prisma/enums';
import { AuthErrors } from '../auth-errors';
import { AuthService } from '../auth.service';
import type { AuthenticatedRequest } from './jwt-auth.guard';

const ROLES_KEY = 'roles';

/** Yêu cầu vai trò. Dùng sau JwtAuthGuard: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('admin')`. */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Thay hàm `has_role(auth.uid(), 'admin')` trong các policy RLS.
 * Đọc vai trò từ DB mỗi request (không nhét vào JWT) để thu hồi quyền có hiệu lực ngay.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user) throw AuthErrors.sessionMissing();

    for (const role of required) {
      if (await this.auth.hasRole(req.user.id, role)) return true;
    }
    throw AuthErrors.forbidden();
  }
}
