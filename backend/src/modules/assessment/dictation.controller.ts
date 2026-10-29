import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { DictationService } from './dictation.service';
import {
  DictationLessonDto,
  DictationProgressResponseDto,
  DictationQuizDetailDto,
  DictationUserAnswerDto,
  QuizResultDto,
  SyncDictationDto,
  VocabWordDto,
} from './dto';

@ApiTags('assessment-dictation')
@Controller('assessment/dictation')
export class DictationController {
  constructor(private readonly dictation: DictationService) {}

  @Get('quizzes/:quizId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Đề nghe chép chính tả (Dictation)',
    description:
      'Gửi transcript, dictation_keywords, translation, answers (có is_correct) để client so khớp chữ gõ. ' +
      'Chỉ khi có quyền làm quiz (canTakeQuiz, #22a). Quiz không tồn tại → 404 QUIZ_NOT_FOUND.',
  })
  @ApiOkResponse({ type: DictationQuizDetailDto })
  @ApiForbiddenResponse({ description: 'QUIZ_LOCKED' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  getDictationQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<DictationQuizDetailDto> {
    return this.dictation.getDictationQuiz(quizId, user);
  }

  @Get('quizzes/:quizId/lesson')
  @ApiOperation({ summary: 'Bài học liên kết với quiz (công khai)' })
  @ApiOkResponse({ type: DictationLessonDto, nullable: true })
  getLessonByQuizId(
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<{ id: number } | null> {
    return this.dictation.getLessonByQuizId(quizId);
  }

  @Get('quizzes/:quizId/vocab')
  @ApiOperation({
    summary: 'Từ vựng gắn với các câu hỏi trong quiz (công khai)',
  })
  @ApiOkResponse({ type: [VocabWordDto] })
  getVocabForQuiz(
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<VocabWordDto[]> {
    return this.dictation.getVocabForQuiz(quizId);
  }

  @Get('quizzes/:quizId/result')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy hoặc tạo kết quả user_quiz_results mới nhất cho dictation',
  })
  @ApiOkResponse({ type: QuizResultDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  getOrCreateResult(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuizResultDto> {
    return this.dictation.getOrCreateResult(quizId, user);
  }

  @Get('quizzes/:quizId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Các câu hỏi đã hoàn thành của người dùng cho quiz này',
  })
  @ApiOkResponse({ type: [DictationUserAnswerDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getUserAnswers(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictationUserAnswerDto[]> {
    return this.dictation.getUserAnswers(quizId, user);
  }

  @Put('quizzes/:quizId/questions/:questionId/done')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đánh dấu hoàn thành một câu hỏi, server tính lại điểm',
  })
  @ApiOkResponse({ type: DictationProgressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  markQuestionDone(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    return this.dictation.markQuestionDone(quizId, questionId, user);
  }

  @Delete('quizzes/:quizId/questions/:questionId/done')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Hủy đánh dấu hoàn thành một câu hỏi, server tính lại điểm',
  })
  @ApiOkResponse({ type: DictationProgressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  unmarkQuestionDone(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    return this.dictation.unmarkQuestionDone(quizId, questionId, user);
  }

  @Post('quizzes/:quizId/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Đồng bộ danh sách câu đã hoàn thành trong session khi nộp bài',
  })
  @ApiOkResponse({ type: DictationProgressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  syncSession(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: SyncDictationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    return this.dictation.syncSession(quizId, dto.question_ids, user);
  }

  @Post('quizzes/:quizId/reset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset toàn bộ tiến trình luyện tập dictation của quiz này',
  })
  @ApiOkResponse({ type: DictationProgressResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  resetAll(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DictationProgressResponseDto> {
    return this.dictation.resetAll(quizId, user);
  }
}
