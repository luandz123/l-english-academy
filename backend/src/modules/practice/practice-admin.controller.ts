import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminExamDto,
  AdminQuestionsQueryDto,
  AdminQuestionTagDto,
  ExamCardDto,
  ReportDto,
  ReportsQueryDto,
  RetagDto,
  RetagResultDto,
  UpdateExamMetaDto,
  UpdateQuestionTagsDto,
  UpdateReportDto,
  UpdateVerificationDto,
} from './dto/library.dto';
import { LibraryService } from './library.service';
import { DiagnosticService } from './diagnostic.service';
import { QuestionTaggingService } from './question-tagging.service';

/** Kiểm duyệt đề (Verified), thông tin thư viện, nhãn câu hỏi, báo lỗi — chỉ admin. */
@ApiTags('practice-admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@ApiForbiddenResponse({ description: 'Không phải admin' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@Controller('practice/admin')
export class PracticeAdminController {
  constructor(
    private readonly library: LibraryService,
    private readonly tagging: QuestionTaggingService,
    private readonly diagnostic: DiagnosticService,
  ) {}

  @Get('diagnostic')
  @ApiOperation({
    summary: 'Bộ câu bài kiểm tra trình độ: số câu theo Part, Part còn thiếu',
  })
  @ApiOkResponse({
    description:
      '{ available, total_questions, structure, missing, generated_at }',
  })
  diagnosticStatus() {
    return this.diagnostic.adminStatus();
  }

  @Post('diagnostic/regenerate')
  @ApiOperation({
    summary:
      'Rút lại bộ câu bài kiểm tra trình độ từ kho đã gắn nhãn (thiếu Part thì báo, không chặn)',
  })
  @ApiOkResponse({
    description:
      '{ available, total_questions, structure, missing, generated_at }',
  })
  async regenerateDiagnostic() {
    await this.diagnostic.generate();
    return this.diagnostic.adminStatus();
  }

  @Get('exams')
  @ApiOperation({
    summary:
      'Mọi đề kèm trạng thái xác minh, checklist, báo lỗi đang mở, số câu đã gắn nhãn',
  })
  @ApiOkResponse({ type: [AdminExamDto] })
  exams(@CurrentUser() user: AuthenticatedUser): Promise<AdminExamDto[]> {
    return this.library.adminExams(user);
  }

  @Patch('exams/:testId')
  @ApiOperation({ summary: 'Sửa năm, độ khó, chủ đề, loại đề, thời lượng' })
  @ApiOkResponse({ type: ExamCardDto })
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  updateMeta(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: UpdateExamMetaDto,
  ): Promise<ExamCardDto> {
    return this.library.updateMeta(user, testId, dto);
  }

  @Put('exams/:testId/verification')
  @ApiOperation({ summary: 'Lưu checklist kiểm duyệt; xác minh cần đủ 9 mục' })
  @ApiOkResponse({ type: ExamCardDto })
  @ApiBadRequestResponse({ description: 'CHECKLIST_INCOMPLETE' })
  verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: UpdateVerificationDto,
  ): Promise<ExamCardDto> {
    return this.library.updateVerification(user, testId, dto);
  }

  @Get('questions')
  @ApiOperation({
    summary: 'Nhãn câu hỏi của một đề (Part, dạng, loại văn bản, độ khó)',
  })
  @ApiOkResponse({ type: [AdminQuestionTagDto] })
  questions(
    @Query() q: AdminQuestionsQueryDto,
  ): Promise<AdminQuestionTagDto[]> {
    return this.library.adminQuestions(q.test_id, q.part);
  }

  @Patch('questions/:questionId/tags')
  @ApiOperation({
    summary: 'Sửa nhãn một câu (gắn nhãn tự động sau này không ghi đè)',
  })
  @ApiOkResponse({ type: AdminQuestionTagDto })
  @ApiBadRequestResponse({
    description: 'INVALID_CATEGORY, INVALID_PASSAGE_TYPE',
  })
  updateTags(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionTagsDto,
  ): Promise<AdminQuestionTagDto> {
    return this.library.updateQuestionTags(questionId, dto);
  }

  @Post('retag')
  @ApiOperation({
    summary:
      'Chạy lại gắn nhãn tự động cho một đề hoặc mọi đề (giữ nhãn admin đã sửa)',
  })
  @ApiOkResponse({ type: RetagResultDto })
  async retag(@Body() dto: RetagDto): Promise<RetagResultDto> {
    return { tagged: await this.tagging.retag(dto.test_id) };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Báo lỗi của học viên' })
  @ApiOkResponse({ type: [ReportDto] })
  reports(@Query() q: ReportsQueryDto): Promise<ReportDto[]> {
    return this.library.reports(q.status);
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Cập nhật trạng thái báo lỗi' })
  @ApiOkResponse({ type: ReportDto })
  @ApiNotFoundResponse({ description: 'REPORT_NOT_FOUND' })
  updateReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportDto,
  ): Promise<ReportDto> {
    return this.library.updateReport(id, dto);
  }
}
