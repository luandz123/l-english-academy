import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import {
  LatestQuizResultResponseDto,
  QuestionDto,
  QuizDto,
  QuizResultDto,
  ReviewQuestionDto,
  SubmitQuizDto,
  SubmitQuizResponseDto,
  UserAnswerDto,
} from './dto';
import { AssessmentService } from './assessment.service';

@ApiTags('assessment')
@ApiBearerAuth()
@Controller('assessment')
export class AssessmentController {
  constructor(private readonly assessment: AssessmentService) {}

  @Get('quizzes/:quizId')
  @ApiOperation({ summary: 'Thông tin một quiz (công khai như RLS cũ)' })
  @ApiOkResponse({ type: QuizDto })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  getQuiz(@Param('quizId', ParseIntPipe) quizId: number): Promise<QuizDto> {
    return this.assessment.getQuiz(quizId);
  }

  @Get('quizzes/:quizId/questions')
  @ApiOperation({
    summary: 'Đề để làm bài',
    description:
      'Công khai như RLS cũ nhưng **không** có is_correct, explanation, transcript, ' +
      'translation, dictation_keywords. Quiz không tồn tại → [].',
  })
  @ApiOkResponse({ type: [QuestionDto] })
  getQuestions(
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<QuestionDto[]> {
    return this.assessment.getQuestions(quizId);
  }

  @Post('quizzes/:quizId/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Nộp bài, chấm ở server',
    description:
      'Client chỉ gửi id đáp án đã chọn + thời gian. Server tính số câu đúng, điểm thang 10, ' +
      'ghi user_quiz_results + user_answers trong một transaction.',
  })
  @ApiCreatedResponse({ type: SubmitQuizResponseDto })
  @ApiBadRequestResponse({ description: 'INVALID_ANSWER / VALIDATION_FAILED' })
  @ApiNotFoundResponse({ description: 'QUIZ_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  submit(
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubmitQuizResponseDto> {
    return this.assessment.submit(user.id, quizId, dto);
  }

  @Get('quizzes/:quizId/review')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Đề kèm đáp án đúng và lời giải',
    description: 'Chỉ khi đã nộp quiz này ít nhất một lần, hoặc là admin.',
  })
  @ApiOkResponse({ type: [ReviewQuestionDto] })
  @ApiForbiddenResponse({ description: 'QUIZ_NOT_ATTEMPTED' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getReview(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReviewQuestionDto[]> {
    return this.assessment.getReview(user, quizId);
  }

  @Get('quizzes/:quizId/results/latest')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kết quả mới nhất của tôi cho quiz' })
  @ApiOkResponse({ type: LatestQuizResultResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getLatestResult(
    @Param('quizId', ParseIntPipe) quizId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LatestQuizResultResponseDto> {
    return this.assessment.getLatestResult(user.id, quizId);
  }

  @Get('results/:resultId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Một kết quả (của mình, hoặc admin)' })
  @ApiOkResponse({ type: QuizResultDto })
  @ApiNotFoundResponse({
    description: 'RESULT_NOT_FOUND (kể cả kết quả của người khác)',
  })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getResult(
    @Param('resultId', ParseIntPipe) resultId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<QuizResultDto> {
    return this.assessment.getResult(user, resultId);
  }

  @Get('results/:resultId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Chi tiết từng câu của một kết quả',
    description: 'Kết quả của người khác (không phải admin) → [] như RLS cũ.',
  })
  @ApiOkResponse({ type: [UserAnswerDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getResultAnswers(
    @Param('resultId', ParseIntPipe) resultId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserAnswerDto[]> {
    return this.assessment.getResultAnswers(user, resultId);
  }
}
