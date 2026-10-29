import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AdminActivityLogDto,
  AdminBackupStatsDto,
  AdminNoteDto,
  CreateAdminActivityLogDto,
  CreateAdminNoteDto,
  SettingDto,
  UpdateSettingDto,
} from './dto';
import { ProfileDto } from '../auth/dto/profile.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Admin xem tất cả cài đặt nền tảng',
  })
  @ApiOkResponse({ type: [SettingDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  listAllSettings(): Promise<SettingDto[]> {
    return this.adminService.listAllSettings();
  }

  @Put('settings/:key')
  @ApiOperation({
    summary: 'Admin tạo mới hoặc cập nhật một cài đặt nền tảng',
  })
  @ApiOkResponse({ type: SettingDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  saveSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ): Promise<SettingDto> {
    return this.adminService.saveSetting(key, dto.value);
  }

  @Get('users/:userId/notes')
  @ApiOperation({
    summary: 'Admin xem danh sách ghi chú của một học viên (ADM-004)',
  })
  @ApiOkResponse({ type: [AdminNoteDto] })
  @ApiBadRequestResponse({ description: 'userId không phải UUID' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  listStudentNotes(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AdminNoteDto[]> {
    return this.adminService.listStudentNotes(userId);
  }

  @Post('users/:userId/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin thêm ghi chú cho học viên (ADM-004)',
    description: 'admin_id lấy từ token người gọi; client chỉ gửi content.',
  })
  @ApiCreatedResponse({ type: AdminNoteDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'USER_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không phải admin' })
  addStudentNote(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateAdminNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdminNoteDto> {
    return this.adminService.addStudentNote(user.id, userId, dto);
  }

  @Get('backup/stats')
  @ApiOperation({
    summary: 'Admin xem số lượng bản ghi các bảng để sao lưu (ADM-019)',
  })
  @ApiOkResponse({ type: AdminBackupStatsDto })
  getBackupStats(): Promise<Record<string, number>> {
    return this.adminService.getBackupStats();
  }

  @Get('backup/export-full')
  @ApiOperation({
    summary: 'Admin xuất bản snapshot toàn bộ dữ liệu hệ thống (ADM-019)',
  })
  getBackupFullSnapshot(): Promise<{
    snapshot: Record<string, unknown[]>;
    counts: Record<string, number>;
  }> {
    return this.adminService.getBackupFullSnapshot();
  }

  @Get('backup/export-students')
  @ApiOperation({
    summary: 'Admin xuất danh sách học viên dạng CSV (ADM-019)',
  })
  getBackupStudents(): Promise<
    {
      user_id: string;
      full_name: string | null;
      email: string | null;
      avatar_url: string | null;
      updated_at: string | null;
    }[]
  > {
    return this.adminService.getBackupStudents();
  }

  @Get('backup/export-test-results')
  @ApiOperation({
    summary: 'Admin xuất kết quả thi Full Test dạng CSV (ADM-019)',
  })
  getBackupTestResults(): Promise<
    {
      id: number;
      user_id: string;
      test_id: number;
      correct_answers: number | null;
      listening_score: number | null;
      reading_score: number | null;
      total_score: number | null;
      time_spent_seconds: number | null;
      test_mode: string | null;
      created_at: string | null;
    }[]
  > {
    return this.adminService.getBackupTestResults();
  }

  @Get('backup/export-question-bank')
  @ApiOperation({
    summary: 'Admin xuất ngân hàng câu hỏi đề thi (ADM-019)',
  })
  getBackupQuestionBank(): Promise<{
    full_tests: { id: number; title: string; category: string }[];
    questions: unknown[];
    answers: unknown[];
  }> {
    return this.adminService.getBackupQuestionBank();
  }

  @Get('users/admins')
  @ApiOperation({
    summary: 'Admin xem danh sách các tài khoản có quyền admin (ADM-019)',
  })
  @ApiOkResponse({ type: [ProfileDto] })
  getAdminUsers(): Promise<ProfileDto[]> {
    return this.adminService.getAdminUsers();
  }

  @Post('activity-log')
  @ApiOperation({
    summary: 'Ghi nhật ký hoạt động của admin (ADM-021)',
  })
  @ApiCreatedResponse({ type: AdminActivityLogDto })
  createActivityLog(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAdminActivityLogDto,
  ): Promise<AdminActivityLogDto> {
    return this.adminService.createActivityLog(user.id, dto);
  }

  @Get('activity-log')
  @ApiOperation({
    summary: 'Xem danh sách nhật ký hoạt động admin (ADM-021)',
  })
  @ApiOkResponse({ type: [AdminActivityLogDto] })
  getActivityLogs(): Promise<AdminActivityLogDto[]> {
    return this.adminService.getActivityLogs();
  }
}
