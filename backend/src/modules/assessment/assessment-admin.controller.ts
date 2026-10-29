import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AssessmentAdminService } from './assessment-admin.service';
import {
  AdminFullTestDetailDto,
  AdminFullTestListItemDto,
  AdminSearchVocabWordDto,
  AppendFullTestQuestionsDto,
  BulkDeleteFullTestsDto,
  BulkDeleteQuestionsDto,
  BulkDeleteVocabWordsDto,
  CreateFullTestDto,
  CreateFullTestQuestionDto,
  CreateLessonVocabQuizDto,
  CreateVocabWordsBatchDto,
  FullTestQuestionDto,
  ImportFullTestQuestionsDto,
  ImportQuizQuestionsDto,
  ImportQuizQuestionsResponseDto,
  PackageImportFullTestsDto,
  PatchQuizDto,
  QuizDto,
  ReorderQuestionsDto,
  ReviewQuestionDto,
  SaveModuleQuizDto,
  SaveQuestionDto,
  SaveVocabWordDto,
  SetQuestionImagesDto,
  UpdateFullTestDto,
  UpdateFullTestQuestionDto,
  UpdateQuestionGroupDto,
  VocabQuizDto,
  VocabWordDto,
} from './dto';

@ApiTags('assessment-admin')
@ApiBearerAuth()
@Controller('assessment/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
export class AssessmentAdminController {
  constructor(
    private readonly assessmentAdminService: AssessmentAdminService,
  ) {}

  @Get('quizzes/:quizId/questions')
  @ApiOperation({
    summary: 'Admin lấy danh sách câu hỏi của quiz (ADM-011)',
  })
  @ApiOkResponse({ type: [ReviewQuestionDto] })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  listQuizQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<ReviewQuestionDto[]> {
    return this.assessmentAdminService.listQuizQuestions(quizId);
  }

  @Post('quizzes/:quizId/questions')
  @ApiOperation({
    summary: 'Admin tạo câu hỏi mới cho quiz (ADM-011)',
  })
  @ApiCreatedResponse({ type: ReviewQuestionDto })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  createQuizQuestion(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: SaveQuestionDto,
  ): Promise<ReviewQuestionDto> {
    return this.assessmentAdminService.createQuizQuestion(quizId, dto);
  }

  @Post('quizzes/:quizId/import-questions')
  @ApiOperation({
    summary: 'Admin import câu hỏi + đáp án + từ vựng cho quiz (T-034)',
    description:
      'Chạy trong 1 transaction, server đếm total_questions và tính display_order.',
  })
  @ApiCreatedResponse({ type: ImportQuizQuestionsResponseDto })
  @ApiNotFoundResponse({
    description:
      'Quiz không tồn tại (QUIZ_NOT_FOUND) hoặc bài học không tồn tại (LESSON_NOT_FOUND)',
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  importQuizQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: ImportQuizQuestionsDto,
  ): Promise<ImportQuizQuestionsResponseDto> {
    return this.assessmentAdminService.importQuizQuestions(quizId, dto);
  }

  @Post('quizzes/:quizId/questions/bulk-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa nhiều câu hỏi cùng lúc trong quiz (ADM-011)',
  })
  @ApiNoContentResponse({ description: 'Xóa thành công' })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiBadRequestResponse({
    description:
      'Danh sách ID không hợp lệ hoặc có câu hỏi không thuộc quiz (QUESTION_IDS_INVALID)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async bulkDeleteQuizQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: BulkDeleteQuestionsDto,
  ): Promise<void> {
    await this.assessmentAdminService.bulkDeleteQuizQuestions(quizId, dto);
  }

  @Put('quizzes/:quizId/question-order')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin cập nhật thứ tự câu hỏi trong quiz (ADM-011)',
  })
  @ApiNoContentResponse({ description: 'Cập nhật thứ tự thành công' })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiBadRequestResponse({
    description:
      'Danh sách ID không hợp lệ hoặc có câu hỏi không thuộc quiz (QUESTION_IDS_INVALID)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async reorderQuizQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: ReorderQuestionsDto,
  ): Promise<void> {
    await this.assessmentAdminService.reorderQuizQuestions(quizId, dto);
  }

  @Put('quizzes/:quizId/question-images')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin gán ảnh hàng loạt cho các câu hỏi trong quiz (ADM-011)',
  })
  @ApiNoContentResponse({ description: 'Gán ảnh thành công' })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiBadRequestResponse({
    description:
      'Danh sách ID không hợp lệ hoặc có câu hỏi không thuộc quiz (QUESTION_IDS_INVALID)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async setQuizQuestionImages(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: SetQuestionImagesDto,
  ): Promise<void> {
    await this.assessmentAdminService.setQuizQuestionImages(quizId, dto);
  }

  @Patch('quizzes/:quizId')
  @ApiOperation({
    summary: 'Admin cập nhật audio của quiz (ADM-011)',
  })
  @ApiOkResponse({ type: QuizDto })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  patchQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: PatchQuizDto,
  ): Promise<QuizDto> {
    return this.assessmentAdminService.patchQuiz(quizId, dto);
  }

  @Put('questions/:id')
  @ApiOperation({
    summary: 'Admin cập nhật câu hỏi và đáp án (ADM-011)',
  })
  @ApiOkResponse({ type: ReviewQuestionDto })
  @ApiNotFoundResponse({
    description: 'Câu hỏi không tồn tại (QUESTION_NOT_FOUND)',
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  updateQuizQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveQuestionDto,
  ): Promise<ReviewQuestionDto> {
    return this.assessmentAdminService.updateQuizQuestion(id, dto);
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa 1 câu hỏi (ADM-011)',
  })
  @ApiNoContentResponse({ description: 'Xóa thành công hoặc không tồn tại' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async deleteQuizQuestion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.assessmentAdminService.deleteQuizQuestion(id);
  }

  @Post('modules/:moduleId/quizzes')
  @ApiOperation({
    summary: 'Admin tạo quiz độc lập trong chương (ADM-010)',
  })
  @ApiCreatedResponse({ type: QuizDto })
  @ApiNotFoundResponse({
    description: 'Chương không tồn tại (MODULE_NOT_FOUND)',
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  createModuleQuiz(
    @Param('moduleId', ParseIntPipe) moduleId: number,
    @Body() dto: SaveModuleQuizDto,
  ): Promise<QuizDto> {
    return this.assessmentAdminService.createModuleQuiz(moduleId, dto);
  }

  @Put('quizzes/:id')
  @ApiOperation({
    summary: 'Admin sửa quiz độc lập trong chương (ADM-010)',
  })
  @ApiOkResponse({ type: QuizDto })
  @ApiNotFoundResponse({ description: 'Quiz không tồn tại (QUIZ_NOT_FOUND)' })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  updateModuleQuiz(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveModuleQuizDto,
  ): Promise<QuizDto> {
    return this.assessmentAdminService.updateModuleQuiz(id, dto);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa quiz (ADM-010)',
    description: 'Xóa quiz, foreign key cascade/set null theo DB',
  })
  @ApiNoContentResponse({ description: 'Xóa thành công hoặc không tồn tại' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async deleteModuleQuiz(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.assessmentAdminService.deleteModuleQuiz(id);
  }

  @Post('lessons/:lessonId/quiz')
  @ApiOperation({
    summary: 'Admin tạo quiz gắn với bài học (ADM-010)',
  })
  @ApiCreatedResponse({ type: QuizDto })
  @ApiNotFoundResponse({
    description: 'Bài học không tồn tại (LESSON_NOT_FOUND)',
  })
  @ApiBadRequestResponse({
    description: 'Bài học chưa thuộc chương nào (LESSON_HAS_NO_MODULE)',
  })
  @ApiConflictResponse({
    description: 'Bài học đã có quiz (LESSON_ALREADY_HAS_QUIZ)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  createLessonQuiz(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<QuizDto> {
    return this.assessmentAdminService.createLessonQuiz(lessonId);
  }

  // --- Full Test Admin Endpoints (T-024) ---

  @Get('full-tests/:testId/questions')
  @ApiOperation({
    summary:
      'Lấy toàn bộ câu hỏi và đáp án của đề thi Full Test kèm part_number',
  })
  @ApiOkResponse({ type: [FullTestQuestionDto] })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  getFullTestQuestions(
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<FullTestQuestionDto[]> {
    return this.assessmentAdminService.getFullTestQuestions(testId);
  }

  @Post('full-tests/:testId/questions')
  @ApiOperation({
    summary: 'Admin thêm câu hỏi mới vào đề thi Full Test',
  })
  @ApiCreatedResponse({ type: FullTestQuestionDto })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  createFullTestQuestion(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: CreateFullTestQuestionDto,
  ): Promise<FullTestQuestionDto> {
    return this.assessmentAdminService.createFullTestQuestion(testId, dto);
  }

  @Put('full-tests/:testId/question-group')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin cập nhật thông tin nhóm cho nhiều câu hỏi trong đề thi',
  })
  @ApiNoContentResponse({ description: 'Cập nhật nhóm thành công' })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiBadRequestResponse({
    description: 'ID câu hỏi không hợp lệ (QUESTION_IDS_INVALID)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  updateQuestionGroup(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: UpdateQuestionGroupDto,
  ): Promise<void> {
    return this.assessmentAdminService.updateQuestionGroup(testId, dto);
  }

  @Get('full-tests')
  @ApiOperation({
    summary:
      'Admin xem danh sách đề thi Full Test (kèm thống kê câu hỏi các part)',
  })
  @ApiOkResponse({ type: [AdminFullTestListItemDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  listFullTests(
    @Query('courseId') courseId?: string,
  ): Promise<AdminFullTestListItemDto[]> {
    const cId = courseId ? Number(courseId) : undefined;
    return this.assessmentAdminService.listAdminFullTests(cId);
  }

  @Post('full-tests')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Admin tạo mới đề thi Full Test và tự động tạo 7 Part TOEIC',
  })
  @ApiCreatedResponse({ type: AdminFullTestDetailDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  createFullTest(
    @Body() dto: CreateFullTestDto,
  ): Promise<AdminFullTestDetailDto> {
    return this.assessmentAdminService.createFullTest(dto);
  }

  @Get('full-tests/:testId')
  @ApiOperation({
    summary: 'Lấy chi tiết đề thi Full Test cho admin',
  })
  @ApiOkResponse({ type: AdminFullTestDetailDto })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  getFullTestDetail(
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<AdminFullTestDetailDto> {
    return this.assessmentAdminService.getFullTestDetail(testId);
  }

  @Put('full-tests/:testId')
  @ApiOperation({
    summary: 'Admin cập nhật thông tin đề thi Full Test',
  })
  @ApiOkResponse({ type: AdminFullTestDetailDto })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  updateFullTest(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: UpdateFullTestDto,
  ): Promise<AdminFullTestDetailDto> {
    return this.assessmentAdminService.updateFullTest(testId, dto);
  }

  @Post('fulltest-questions/:id/duplicate')
  @ApiOperation({
    summary: 'Admin nhân bản câu hỏi trong đề thi Full Test',
  })
  @ApiCreatedResponse({ type: FullTestQuestionDto })
  @ApiNotFoundResponse({
    description: 'Câu hỏi không tồn tại (QUESTION_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  duplicateFullTestQuestion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FullTestQuestionDto> {
    return this.assessmentAdminService.duplicateFullTestQuestion(id);
  }

  @Put('fulltest-questions/:id')
  @ApiOperation({
    summary: 'Admin cập nhật câu hỏi đề thi Full Test và đồng bộ đáp án',
  })
  @ApiOkResponse({ type: FullTestQuestionDto })
  @ApiNotFoundResponse({
    description: 'Câu hỏi không tồn tại (QUESTION_NOT_FOUND)',
  })
  @ApiBadRequestResponse({
    description: 'Đáp án không thuộc câu hỏi (ANSWER_NOT_IN_QUESTION)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  updateFullTestQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFullTestQuestionDto,
  ): Promise<FullTestQuestionDto> {
    return this.assessmentAdminService.updateFullTestQuestion(id, dto);
  }

  @Delete('fulltest-questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Admin xóa câu hỏi đề thi Full Test và cập nhật lại total_questions',
  })
  @ApiNoContentResponse({ description: 'Xóa câu hỏi thành công' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async deleteFullTestQuestion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.assessmentAdminService.deleteFullTestQuestion(id);
  }

  @Get('vocab/lessons/:lessonId/quiz')
  @ApiOperation({ summary: 'Admin lấy vocab quiz theo bài học' })
  @ApiOkResponse({ type: VocabQuizDto })
  getLessonVocabQuiz(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<VocabQuizDto | null> {
    return this.assessmentAdminService.getLessonVocabQuiz(lessonId);
  }

  @Post('vocab/lessons/:lessonId/quiz')
  @ApiOperation({ summary: 'Admin tạo vocab quiz cho bài học nếu chưa có' })
  @ApiOkResponse({ type: VocabQuizDto })
  getOrCreateLessonVocabQuiz(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: CreateLessonVocabQuizDto,
  ): Promise<VocabQuizDto> {
    return this.assessmentAdminService.getOrCreateLessonVocabQuiz(
      lessonId,
      dto,
    );
  }

  @Get('vocab/quizzes/:quizId/words')
  @ApiOperation({ summary: 'Admin lấy danh sách từ vựng của quiz' })
  @ApiOkResponse({ type: [VocabWordDto] })
  getLessonVocabWords(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Query('questionId') questionId?: string,
  ): Promise<VocabWordDto[]> {
    const qId = questionId ? parseInt(questionId, 10) : undefined;
    return this.assessmentAdminService.getLessonVocabWords(
      quizId,
      isNaN(qId as number) ? undefined : qId,
    );
  }

  @Post('vocab/quizzes/:quizId/words')
  @ApiOperation({ summary: 'Admin thêm hàng loạt từ vựng vào quiz' })
  createVocabWordsBatch(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: CreateVocabWordsBatchDto,
  ): Promise<{ count: number }> {
    return this.assessmentAdminService.createVocabWordsBatch(quizId, dto);
  }

  @Put('vocab/words/:id')
  @ApiOperation({ summary: 'Admin cập nhật một từ vựng' })
  @ApiOkResponse({ type: VocabWordDto })
  updateVocabWord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveVocabWordDto,
  ): Promise<VocabWordDto> {
    return this.assessmentAdminService.updateVocabWord(id, dto);
  }

  @Delete('vocab/words/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin xóa một từ vựng' })
  async deleteVocabWord(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.assessmentAdminService.deleteVocabWord(id);
  }

  @Post('vocab/words/bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin xóa nhiều từ vựng' })
  bulkDeleteVocabWords(@Body() dto: BulkDeleteVocabWordsDto) {
    return this.assessmentAdminService.bulkDeleteVocabWords(dto);
  }

  @Get('vocab/search')
  @ApiOperation({
    summary: 'Admin tìm kiếm từ vựng từ ngân hàng hệ thống (tối đa 60 từ)',
  })
  @ApiOkResponse({ type: [AdminSearchVocabWordDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  searchVocab(@Query('q') query?: string): Promise<AdminSearchVocabWordDto[]> {
    return this.assessmentAdminService.searchVocabWords(query);
  }

  @Get('vocab/lessons')
  @ApiOperation({ summary: 'Admin lấy danh sách bài học để copy từ vựng' })
  getAllLessonsForVocab() {
    return this.assessmentAdminService.getAllLessonsForVocab();
  }

  @Get('vocab/lessons/:lessonId/questions')
  @ApiOperation({
    summary: 'Admin lấy danh sách câu hỏi của bài học để gán từ vựng',
  })
  getLessonQuestionsForVocab(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ) {
    return this.assessmentAdminService.getLessonQuestionsForVocab(lessonId);
  }

  @Delete('full-tests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Admin xóa đề thi Full Test và các quiz/section liên quan',
  })
  @ApiNoContentResponse({ description: 'Xóa đề thi thành công' })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async deleteFullTest(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.assessmentAdminService.deleteFullTest(id);
  }

  @Post('full-tests/bulk-delete')
  @ApiOperation({
    summary: 'Admin xóa hàng loạt đề thi Full Test và các quiz liên quan',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { count: { type: 'number' } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async bulkDeleteFullTests(
    @Body() dto: BulkDeleteFullTestsDto,
  ): Promise<{ count: number }> {
    return this.assessmentAdminService.bulkDeleteFullTests(dto);
  }

  @Post('full-tests/:testId/import-questions')
  @ApiOperation({
    summary: 'Admin import hàng loạt câu hỏi cho một đề thi Full Test',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        test_id: { type: 'number' },
        imported_questions: { type: 'number' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async importFullTestQuestions(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: ImportFullTestQuestionsDto,
  ): Promise<{ test_id: number; imported_questions: number }> {
    return this.assessmentAdminService.importFullTestQuestions(testId, dto);
  }

  @Post('full-tests/:testId/append-questions')
  @ApiOperation({
    summary: 'Admin import câu hỏi vào đề thi đã chọn từ JSON',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        test_id: { type: 'number' },
        imported_questions: { type: 'number' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Đề thi không tồn tại (FULLTEST_NOT_FOUND)',
  })
  @ApiBadRequestResponse({
    description:
      'Không tìm thấy section nào của đề thi (FULLTEST_SECTIONS_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async appendFullTestQuestions(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: AppendFullTestQuestionsDto,
  ): Promise<{ test_id: number; imported_questions: number }> {
    return this.assessmentAdminService.appendFullTestQuestions(testId, dto);
  }

  @Post('full-tests/package-import')
  @ApiOperation({
    summary: 'Admin import trọn bộ đề thi Full Test vào khóa học',
  })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        course_id: { type: 'number' },
        exams_imported: { type: 'number' },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Khóa học không tồn tại (COURSE_NOT_FOUND)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiForbiddenResponse({ description: 'Không có quyền admin' })
  async packageImportFullTests(
    @Body() dto: PackageImportFullTestsDto,
  ): Promise<{ course_id: number; exams_imported: number }> {
    return this.assessmentAdminService.packageImportFullTests(dto);
  }
}
