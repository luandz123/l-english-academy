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
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  FullTestAnswerDetailDto,
  FullTestDto,
  FullTestQuestionDto,
  FullTestResultDto,
  LatestFullTestResultResponseDto,
  SubmitFullTestDto,
} from './dto';
import { FullTestService } from './full-test.service';

@ApiTags('assessment-full-test')
@ApiBearerAuth()
@Controller('assessment')
export class FullTestController {
  constructor(private readonly fullTests: FullTestService) {}

  @Get('full-tests/:testId')
  @ApiOperation({ summary: 'Thông tin một đề Full Test (công khai)' })
  @ApiOkResponse({ type: FullTestDto })
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  getFullTest(
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<FullTestDto> {
    return this.fullTests.getFullTest(testId);
  }

  @Get('full-tests/:testId/questions')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Câu hỏi của đề (kèm đáp án cho chế độ luyện tập)',
    description:
      'Chỉ khi được vào khóa của đề: admin, khóa miễn phí, hoặc ghi danh còn hạn. Đề không có → [].',
  })
  @ApiOkResponse({ type: [FullTestQuestionDto] })
  @ApiForbiddenResponse({ description: 'FULLTEST_LOCKED' })
  @ApiUnauthorizedResponse({ description: 'Có gửi token nhưng sai/hết hạn' })
  getQuestions(
    @Param('testId', ParseIntPipe) testId: number,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<FullTestQuestionDto[]> {
    return this.fullTests.getQuestions(testId, user);
  }

  @Post('full-tests/:testId/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Nộp bài Full Test, chấm và quy đổi ETS ở server',
    description:
      'Client gửi đáp án đã chọn và thông tin phiên; không gửi điểm, số câu đúng hay is_correct.',
  })
  @ApiCreatedResponse({ type: FullTestResultDto })
  @ApiBadRequestResponse({ description: 'INVALID_ANSWER / VALIDATION_FAILED' })
  @ApiForbiddenResponse({ description: 'FULLTEST_LOCKED' })
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  submit(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: SubmitFullTestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FullTestResultDto> {
    return this.fullTests.submit(user, testId, dto);
  }

  @Get('full-tests/:testId/results/latest')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Kết quả mới nhất của tôi cho đề' })
  @ApiOkResponse({ type: LatestFullTestResultResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getLatestResult(
    @Param('testId', ParseIntPipe) testId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LatestFullTestResultResponseDto> {
    return this.fullTests.getLatestResult(user.id, testId);
  }

  @Get('full-test-results/:resultId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Một kết quả Full Test (của mình, hoặc admin)' })
  @ApiOkResponse({ type: FullTestResultDto })
  @ApiNotFoundResponse({ description: 'RESULT_NOT_FOUND' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getResult(
    @Param('resultId', ParseIntPipe) resultId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FullTestResultDto> {
    return this.fullTests.getResult(user, resultId);
  }

  @Get('full-test-results/:resultId/answers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Chi tiết từng câu của một kết quả Full Test' })
  @ApiOkResponse({ type: [FullTestAnswerDetailDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getAnswerDetails(
    @Param('resultId', ParseIntPipe) resultId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FullTestAnswerDetailDto[]> {
    return this.fullTests.getAnswerDetails(user, resultId);
  }
}
