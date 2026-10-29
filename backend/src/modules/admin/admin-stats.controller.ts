import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AppRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AdminCountsDto,
  AdminCourseEnrollmentsDto,
  AdminQuestionDto,
  AdminQuizScoresDto,
  AdminStudentsDto,
  AdminUserAnswerDto,
  RecentEnrollmentDto,
  RecentQuizResultDto,
} from './dto';

@ApiTags('admin-stats')
@ApiBearerAuth()
@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@ApiForbiddenResponse({ description: 'Không có quyền admin' })
export class AdminStatsController {
  constructor(private readonly adminService: AdminService) {}

  @Get('counts')
  @ApiOperation({
    summary: 'Admin xem tổng số lượng học viên, khóa học, lượt thi',
  })
  @ApiOkResponse({ type: AdminCountsDto })
  getCounts(): Promise<AdminCountsDto> {
    return this.adminService.getCounts();
  }

  @Get('recent-enrollments')
  @ApiOperation({
    summary: 'Admin xem 5 lượt đăng ký khóa học gần nhất',
  })
  @ApiOkResponse({ type: [RecentEnrollmentDto] })
  getRecentEnrollments(): Promise<RecentEnrollmentDto[]> {
    return this.adminService.getRecentEnrollments();
  }

  @Get('recent-results')
  @ApiOperation({
    summary: 'Admin xem 5 kết quả thi gần nhất',
  })
  @ApiOkResponse({ type: [RecentQuizResultDto] })
  getRecentResults(): Promise<RecentQuizResultDto[]> {
    return this.adminService.getRecentQuizResults();
  }

  @Get('quiz-scores')
  @ApiOperation({
    summary: 'Admin xem danh sách bài thi và điểm số để tính điểm trung bình',
  })
  @ApiOkResponse({ type: AdminQuizScoresDto })
  getQuizScores(): Promise<AdminQuizScoresDto> {
    return this.adminService.getQuizScores();
  }

  @Get('course-enrollments')
  @ApiOperation({
    summary: 'Admin xem phân bố học viên theo khóa học',
  })
  @ApiOkResponse({ type: AdminCourseEnrollmentsDto })
  getCourseEnrollments(): Promise<AdminCourseEnrollmentsDto> {
    return this.adminService.getCourseEnrollments();
  }

  @Get('answers')
  @ApiOperation({
    summary: 'Admin xem câu trả lời của người dùng để phân tích câu hỏi khó',
  })
  @ApiOkResponse({ type: [AdminUserAnswerDto] })
  getUserAnswers(): Promise<AdminUserAnswerDto[]> {
    return this.adminService.getUserAnswers();
  }

  @Get('questions')
  @ApiOperation({
    summary: 'Admin lấy nội dung câu hỏi theo danh sách ID (tối đa 50)',
  })
  @ApiOkResponse({ type: [AdminQuestionDto] })
  @ApiBadRequestResponse({ description: 'Danh sách ID không hợp lệ hoặc > 50' })
  getQuestions(@Query('ids') ids?: string): Promise<AdminQuestionDto[]> {
    return this.adminService.getQuestionsByIds(ids);
  }

  @Get('students')
  @ApiOperation({
    summary: 'Admin xem danh sách học viên kèm tóm tắt ghi danh',
  })
  @ApiOkResponse({ type: AdminStudentsDto })
  getStudents(): Promise<AdminStudentsDto> {
    return this.adminService.getStudents();
  }
}
