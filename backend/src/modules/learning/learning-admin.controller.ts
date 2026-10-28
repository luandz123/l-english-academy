import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminEnrollmentDto,
  CreateAdminEnrollmentDto,
  LessonDto,
  PatchLessonDto,
  PracticeDto,
  ReorderLessonsDto,
  SaveLessonDto,
  SavePracticeDto,
} from './dto';
import { LearningAdminService } from './learning-admin.service';

@ApiTags('learning-admin')
@ApiBearerAuth()
@Controller('learning/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class LearningAdminController {
  constructor(private readonly learningAdminService: LearningAdminService) {}

  // --- 4.1 Bài học ---

  @Post('modules/:moduleId/lessons')
  @ApiOperation({
    summary: 'Admin tạo bài học mới trong chương (ADM-010)',
  })
  @ApiCreatedResponse({ type: LessonDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({ description: 'Chương học không tồn tại' })
  createLesson(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() dto: SaveLessonDto,
  ): Promise<LessonDto> {
    return this.learningAdminService.createLesson(moduleId, dto);
  }

  @Put('lessons/:id')
  @ApiOperation({
    summary: 'Admin cập nhật bài học (ADM-010)',
  })
  @ApiOkResponse({ type: LessonDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({ description: 'Bài học không tồn tại' })
  updateLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveLessonDto,
  ): Promise<LessonDto> {
    return this.learningAdminService.updateLesson(id, dto);
  }

  @Patch('lessons/:id')
  @ApiOperation({
    summary: 'Admin bật/tắt học thử hoặc ẩn/hiện bài học (ADM-010)',
  })
  @ApiOkResponse({ type: LessonDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({ description: 'Bài học không tồn tại' })
  patchLesson(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PatchLessonDto,
  ): Promise<LessonDto> {
    return this.learningAdminService.patchLesson(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa bài học (ADM-010)',
  })
  @ApiNoContentResponse({ description: 'Đã xóa bài học' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  deleteLesson(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.learningAdminService.deleteLesson(id);
  }

  @Put('modules/:moduleId/lesson-order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin sắp xếp lại thứ tự bài học trong chương (ADM-010)',
  })
  @ApiNoContentResponse({ description: 'Đã cập nhật thứ tự bài học' })
  @ApiBadRequestResponse({ description: 'Thứ tự bài học không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({ description: 'Chương học không tồn tại' })
  reorderLessons(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() dto: ReorderLessonsDto,
  ): Promise<void> {
    return this.learningAdminService.reorderLessons(moduleId, dto);
  }

  // --- 4.2 Popup luyện tập ---

  @Post('lessons/:lessonId/practices')
  @ApiOperation({
    summary: 'Admin tạo popup luyện tập cho bài học (LRN-006 admin)',
  })
  @ApiCreatedResponse({ type: PracticeDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({
    description: 'Bài học hoặc bài kiểm tra không tồn tại',
  })
  createPractice(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: SavePracticeDto,
  ): Promise<PracticeDto> {
    return this.learningAdminService.createPractice(lessonId, dto);
  }

  @Put('practices/:id')
  @ApiOperation({
    summary: 'Admin cập nhật popup luyện tập (LRN-006 admin)',
  })
  @ApiOkResponse({ type: PracticeDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({
    description: 'Popup luyện tập hoặc bài kiểm tra không tồn tại',
  })
  updatePractice(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SavePracticeDto,
  ): Promise<PracticeDto> {
    return this.learningAdminService.updatePractice(id, dto);
  }

  @Delete('practices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa popup luyện tập (LRN-006 admin)',
  })
  @ApiNoContentResponse({ description: 'Đã xóa popup luyện tập' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  deletePractice(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.learningAdminService.deletePractice(id);
  }

  // --- 4.3 Ghi danh ---

  @Get('users/:userId/enrollments')
  @ApiOperation({
    summary: 'Admin lấy danh sách ghi danh của học viên (ADM-005)',
  })
  @ApiOkResponse({ type: [AdminEnrollmentDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  getUserEnrollments(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AdminEnrollmentDto[]> {
    return this.learningAdminService.getUserEnrollments(userId);
  }

  @Post('users/:userId/enrollments')
  @ApiOperation({
    summary: 'Admin mở khóa khóa học cho học viên (ADM-005)',
  })
  @ApiCreatedResponse({ type: AdminEnrollmentDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  @ApiNotFoundResponse({ description: 'Khóa học hoặc học viên không tồn tại' })
  @ApiConflictResponse({ description: 'Học viên đã được ghi danh khóa này' })
  createUserEnrollment(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateAdminEnrollmentDto,
  ): Promise<AdminEnrollmentDto> {
    return this.learningAdminService.createUserEnrollment(userId, dto);
  }

  @Delete('enrollments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa quyền truy cập khóa học (ADM-005)',
  })
  @ApiNoContentResponse({ description: 'Đã xóa ghi danh' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  deleteEnrollment(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.learningAdminService.deleteEnrollment(id);
  }
}
