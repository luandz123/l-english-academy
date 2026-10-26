import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { type AuthenticatedUser, JwtAuthGuard } from './guards/jwt-auth.guard';

/** Hồ sơ của chính người dùng (thay truy vấn profiles theo auth.uid()). */
@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly auth: AuthService) {}

  // Thay useAuth.tsx:101 — select profiles theo user_id = auth.uid()
  @Get('me')
  @ApiOperation({ summary: 'Hồ sơ của người dùng hiện tại' })
  @ApiOkResponse({ type: ProfileDto })
  @ApiNotFoundResponse({ description: 'Chưa có hàng profile' })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<ProfileDto> {
    return this.auth.getMyProfile(user.id);
  }

  // Thay Profile.tsx:599, :670 và Register.tsx:64 — chỉ tên + ảnh đại diện
  @Patch('me')
  @ApiOperation({ summary: 'Sửa tên/ảnh đại diện của chính mình' })
  @ApiOkResponse({ type: ProfileDto })
  updateMine(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.auth.updateMyProfile(user.id, dto);
  }
}
