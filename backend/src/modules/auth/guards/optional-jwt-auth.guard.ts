import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * Route công khai nhưng trả nhiều hơn khi đã đăng nhập (vd. cây bài học: URL video
 * chỉ trả cho người có quyền). Không có header `Authorization` → khách, `req.user`
 * để trống. Có header mà token sai/hết hạn → 401 như JwtAuthGuard, để `apiClient`
 * refresh rồi gọi lại thay vì nhận nhầm dữ liệu của khách.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.headers.authorization) return true;
    return this.jwtGuard.canActivate(context);
  }
}
