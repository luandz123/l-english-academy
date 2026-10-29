import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { AuthService } from './auth.service';
import { AdminCreateUserDto } from './dto/auth-request.dto';
import { AuthUserResultDto } from './dto/auth-response.dto';
import { AdminUserProfileResponseDto } from './dto/profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles, RolesGuard } from './guards/roles.guard';

@ApiTags('auth-admin')
@ApiBearerAuth()
@Controller('auth/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class AuthAdminController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Thay AdminStudents.tsx:38 (signUp bằng client Supabase tạm để admin không bị đăng xuất).
   * Giữ hành vi signUp: học viên vẫn nhận email xác nhận nếu đang bật.
   */
  @Post('users')
  @ApiOperation({ summary: 'Admin tạo tài khoản học viên' })
  @ApiCreatedResponse({ type: AuthUserResultDto })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  async createUser(
    @Body() dto: AdminCreateUserDto,
  ): Promise<AuthUserResultDto> {
    return {
      user: await this.auth.adminCreateUser({
        email: dto.email,
        password: dto.password,
        data: dto.data,
      }),
    };
  }

  @Get('users/:userId/profile')
  @ApiOperation({
    summary: 'Admin lấy thông tin hồ sơ của học viên (ADM-003)',
  })
  @ApiOkResponse({ type: AdminUserProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  async getStudentProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AdminUserProfileResponseDto> {
    const profile = await this.auth.getStudentProfile(userId);
    return { profile };
  }
}
