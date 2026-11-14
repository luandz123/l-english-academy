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
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { SessionSummaryDto } from '../practice/dto/practice.dto';
import {
  AnswerItemDto,
  CategoryQueryDto,
  FormulaSheetDto,
  GrammarSessionDto,
  GrammarSettingsDto,
  ItemFeedbackDto,
  LevelInfoDto,
  MistakesDto,
  MistakesQueryDto,
  NoteDto,
  OverviewDto,
  QuestionTopicDtoOut,
  QuestionTopicsQueryDto,
  RetryMistakeDto,
  ReviewSummaryDto,
  SessionResultDto,
  StartExerciseDto,
  StartReviewDto,
  StartToeicDto,
  TopicDetailDto,
  TopicLevelDto,
  TopicLinkDto,
  TopicProgressDto,
} from './dto/grammar.dto';
import { GrammarMistakesService } from './grammar-mistakes.service';
import { GrammarSessionService } from './grammar-session.service';
import { GrammarService } from './grammar.service';

/**
 * Grammar Center (D16). Khách xem được danh sách chủ điểm, bài học, công thức; mọi thao tác làm bài,
 * tiến độ, sổ lỗi, lịch ôn cần đăng nhập và chỉ của chính mình (lượt/lỗi của người khác → 404).
 * Đáp án, chấm điểm, lịch ôn, XP tính ở server.
 */
@ApiTags('grammar')
@ApiBearerAuth()
@Controller('grammar')
export class GrammarController {
  constructor(
    private readonly grammar: GrammarService,
    private readonly sessions: GrammarSessionService,
    private readonly mistakes: GrammarMistakesService,
  ) {}

  // ---------- Xem (khách được) ----------

  @Get('overview')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Trang tổng Grammar Center: chủ điểm theo nhóm, cấp gợi ý, tiến độ, gợi ý (khách: chỉ danh sách)',
  })
  @ApiOkResponse({ type: OverviewDto })
  overview(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<OverviewDto> {
    return this.grammar.overview(user);
  }

  @Get('formulas')
  @ApiOperation({ summary: 'Bảng công thức tổng hợp (mọi chủ điểm đang hiện)' })
  @ApiOkResponse({ type: [FormulaSheetDto] })
  formulas(): Promise<FormulaSheetDto[]> {
    return this.grammar.formulaSheet();
  }

  @Get('links')
  @ApiOperation({
    summary:
      'Liên kết chủ điểm cho Lộ trình và thẻ điểm yếu (chủ điểm đang hiện)',
  })
  @ApiOkResponse({ type: [TopicLinkDto] })
  links(): Promise<TopicLinkDto[]> {
    return this.grammar.links();
  }

  @Get('question-topics')
  @ApiOperation({
    summary:
      'Chủ điểm của các câu TOEIC (dòng "Chủ điểm: … · Xem bài học" ở phần giải thích)',
  })
  @ApiOkResponse({ type: [QuestionTopicDtoOut] })
  questionTopics(
    @Query() q: QuestionTopicsQueryDto,
  ): Promise<QuestionTopicDtoOut[]> {
    return this.grammar.questionTopics(q.ids);
  }

  @Get('topics/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Trang chủ điểm: bài học, công thức, số câu; đăng nhập thì có tiến độ, trạng thái',
  })
  @ApiOkResponse({ type: TopicDetailDto })
  @ApiNotFoundResponse({ description: 'Chủ điểm không có hoặc đang ẩn' })
  topic(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Param('slug') slug: string,
  ): Promise<TopicDetailDto> {
    return this.grammar.topic(user, slug);
  }

  // ---------- Cần đăng nhập ----------

  @Get('category-topic')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      '"Học lại ngữ pháp" từ thẻ điểm yếu: chủ điểm có tỉ lệ đúng thấp nhất của nhóm dạng câu',
  })
  @ApiOkResponse({ description: '{ topic: { slug, name } | null }' })
  async categoryTopic(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: CategoryQueryDto,
  ) {
    return { topic: await this.grammar.topicForCategory(user, q.category) };
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      'Chọn mức ở hộp "Bạn đang ở mức nào?", đóng hộp, đã xem thông báo đổi cấp',
  })
  @ApiOkResponse({ type: LevelInfoDto })
  settings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GrammarSettingsDto,
  ): Promise<LevelInfoDto> {
    return this.grammar.updateSettings(user, dto);
  }

  @Post('topics/:slug/progress')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Mở tab, "Đã đọc xong", "Tôi nhớ rồi" trên công thức',
  })
  @ApiOkResponse({ description: '{ ok: true }' })
  @ApiNotFoundResponse({ description: 'Chủ điểm / công thức không có' })
  progress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: TopicProgressDto,
  ) {
    return this.grammar.markProgress(user, slug, dto);
  }

  @Put('topics/:slug/level')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: 'Nhớ cấp tự chọn cho chủ điểm này' })
  @ApiOkResponse({ description: '{ ok: true }' })
  topicLevel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: TopicLevelDto,
  ) {
    return this.grammar.setTopicLevel(user, slug, dto.level);
  }

  @Post('topics/:slug/exercise-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      'Bắt đầu lượt bài tập chủ điểm (G03). Lượt dở cũ của chủ điểm bị bỏ.',
  })
  @ApiOkResponse({ type: GrammarSessionDto })
  @ApiUnprocessableEntityResponse({
    description: 'INSUFFICIENT_QUESTIONS (details.available)',
  })
  startExercise(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: StartExerciseDto,
  ): Promise<GrammarSessionDto> {
    return this.sessions.startExercise(user, slug, dto);
  }

  @Post('topics/:slug/toeic-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      'Bắt đầu lượt luyện câu Part 5/6 của chủ điểm (G04) — làm ở phòng luyện đề sẵn có',
  })
  @ApiOkResponse({ type: SessionSummaryDto })
  @ApiUnprocessableEntityResponse({
    description: 'INSUFFICIENT_QUESTIONS (details.available)',
  })
  startToeic(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
    @Body() dto: StartToeicDto,
  ): Promise<SessionSummaryDto> {
    return this.grammar.startToeic(user, slug, dto);
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Lượt bài tập / phiên ôn / làm lại lỗi (câu không kèm đáp án)',
  })
  @ApiOkResponse({ type: GrammarSessionDto })
  @ApiNotFoundResponse({ description: 'Không có hoặc của người khác' })
  session(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GrammarSessionDto> {
    return this.sessions.detail(user, id);
  }

  @Post('sessions/:id/answers')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Trả lời một câu, nhận phản hồi ngay (chấm ở server, ghi Sổ lỗi)',
  })
  @ApiOkResponse({ type: ItemFeedbackDto })
  @ApiConflictResponse({
    description: 'ANSWER_LOCKED, SESSION_CLOSED, ITEM_UNAVAILABLE',
  })
  answer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AnswerItemDto,
  ) {
    return this.sessions.answer(user, id, dto);
  }

  @Post('sessions/:id/finish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      'Nộp lượt: kết quả, gợi ý lên/xuống cấp, lịch ôn, XP (gọi lại trả kết quả cũ)',
  })
  @ApiOkResponse({ type: SessionResultDto })
  finish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<SessionResultDto> {
    return this.sessions.finish(user, id);
  }

  @Post('sessions/:id/abandon')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: 'Bỏ lượt (bắt đầu lại)' })
  @ApiNoContentResponse()
  async abandon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.sessions.abandon(user, id);
  }

  @Post('sessions/:id/retry-wrong')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: '"Làm lại câu sai" của lượt bài tập đã nộp' })
  @ApiOkResponse({ type: GrammarSessionDto })
  retryWrong(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GrammarSessionDto> {
    return this.sessions.retryWrong(user, id);
  }

  // ---------- Ôn ngữ pháp (G08) ----------

  @Get('review')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Chủ điểm đến hạn ôn hôm nay (giờ Việt Nam), thời gian ước tính',
  })
  @ApiOkResponse({ type: ReviewSummaryDto })
  review(@CurrentUser() user: AuthenticatedUser): Promise<ReviewSummaryDto> {
    return this.sessions.reviewSummary(user);
  }

  @Post('review')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Bắt đầu phiên ôn (tối đa 3 chủ điểm × 5 câu) hoặc "Ôn thêm"',
  })
  @ApiOkResponse({ type: GrammarSessionDto })
  @ApiUnprocessableEntityResponse({ description: 'NOTHING_TO_REVIEW' })
  startReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartReviewDto,
  ): Promise<GrammarSessionDto> {
    return this.sessions.startReview(user, dto);
  }

  // ---------- Sổ lỗi ngữ pháp (G07) ----------

  @Get('mistakes')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary:
      'Sổ lỗi ngữ pháp theo chủ điểm (bài tập chủ điểm + câu TOEIC từ Sổ câu sai)',
  })
  @ApiOkResponse({ type: MistakesDto })
  mistakesList(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: MistakesQueryDto,
  ): Promise<MistakesDto> {
    return this.mistakes.list(user.id, q);
  }

  @Post('mistakes/retry')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: '"Làm lại" một lỗi trong cửa sổ nổi' })
  @ApiOkResponse({ type: GrammarSessionDto })
  @ApiNotFoundResponse({ description: 'Lỗi không có / của người khác' })
  retryMistake(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RetryMistakeDto,
  ): Promise<GrammarSessionDto> {
    return this.sessions.retryMistake(user, dto);
  }

  @Post('mistakes/exercises/:exerciseId/save')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: '"Lưu lỗi này" — câu đúng nhưng do đoán (chỉ câu mình đã làm)',
  })
  @ApiOkResponse({ description: '{ saved: true }' })
  saveMistake(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.mistakes.saveManual(user.id, exerciseId);
  }

  @Put('mistakes/exercises/:exerciseId/note')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: 'Ghi chú cá nhân trên lỗi bài tập chủ điểm' })
  @ApiOkResponse({ description: '{ ok: true }' })
  exerciseNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
    @Body() dto: NoteDto,
  ) {
    return this.mistakes.setExerciseNote(user.id, exerciseId, dto.note);
  }

  @Put('mistakes/questions/:questionId/note')
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({
    summary: 'Ghi chú cá nhân trên câu TOEIC trong Sổ lỗi ngữ pháp',
  })
  @ApiOkResponse({ description: '{ ok: true }' })
  questionNote(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: NoteDto,
  ) {
    return this.mistakes.setQuestionNote(user.id, questionId, dto.note);
  }

  @Delete('mistakes/exercises/:exerciseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: 'Xóa lỗi bài tập chủ điểm (có "Hoàn tác")' })
  @ApiNoContentResponse()
  async removeMistake(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    await this.mistakes.removeExercise(user.id, exerciseId);
  }

  @Post('mistakes/exercises/:exerciseId/restore')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  @ApiOperation({ summary: 'Hoàn tác xóa lỗi' })
  @ApiOkResponse({ description: '{ ok: true }' })
  restoreMistake(
    @CurrentUser() user: AuthenticatedUser,
    @Param('exerciseId', ParseIntPipe) exerciseId: number,
  ) {
    return this.mistakes.restoreExercise(user.id, exerciseId);
  }
}
