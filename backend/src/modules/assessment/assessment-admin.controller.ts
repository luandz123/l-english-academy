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
  BulkDeleteQuestionsDto,
  PatchQuizDto,
  QuizDto,
  ReorderQuestionsDto,
  ReviewQuestionDto,
  SaveModuleQuizDto,
  SaveQuestionDto,
  SetQuestionImagesDto,
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
}
