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
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
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
import {
  CreateReportDto,
  ExamCardDto,
  ExamLibraryDto,
  ExamLibraryQueryDto,
  FavoriteExamDto,
  FavoritesQueryDto,
  FavoriteStateDto,
  ReportDto,
} from './dto/library.dto';
import {
  ActiveSessionDto,
  BookmarkBatchDto,
  BookmarkedIdsDto,
  BookmarkStateDto,
  CreateSessionDto,
  DailyChallengeDto,
  ListMistakesQueryDto,
  ListSessionsQueryDto,
  MistakeAttemptDto,
  MistakeListDto,
  MistakeSummaryDto,
  PracticeCatalogDto,
  SaveAnswerDto,
  SaveAnswerResultDto,
  SessionDetailDto,
  SessionResultDto,
  SessionSummaryDto,
} from './dto/practice.dto';
import { LibraryService } from './library.service';
import { MistakesService } from './mistakes.service';
import { PracticeService } from './practice.service';

/**
 * Luyện đề (tính năng mới, không có RLS cũ). Quy tắc phân quyền (có test e2e):
 * - Mọi endpoint cần đăng nhập; lượt luyện / sổ câu sai / yêu thích chỉ của chính mình (404 nếu của người khác).
 * - Kho câu chỉ gồm câu thuộc đề học viên có quyền làm (admin, khóa free, ghi danh còn hạn).
 * - Đáp án đúng/giải thích chỉ trả khi câu đã chốt (phản hồi ngay) hoặc lượt đã nộp. Server chấm điểm.
 */
@ApiTags('practice')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('practice')
export class PracticeController {
  constructor(
    private readonly practice: PracticeService,
    private readonly mistakes: MistakesService,
    private readonly library: LibraryService,
  ) {}

  // ---------- Luyện theo dạng câu / Mini Test ----------

  @Get('catalog')
  @ApiOperation({
    summary: 'Part, dạng câu hỏi và số câu luyện được (theo quyền của tôi)',
  })
  @ApiOkResponse({ type: PracticeCatalogDto })
  catalog(@CurrentUser() user: AuthenticatedUser): Promise<PracticeCatalogDto> {
    return this.practice.catalog(user);
  }

  @Post('sessions')
  @ApiOperation({
    summary:
      'Tạo lượt luyện (theo dạng câu, Mini Test, câu sai, luyện lại). Server chọn câu.',
  })
  @ApiOkResponse({ type: SessionSummaryDto })
  @ApiBadRequestResponse({
    description: 'VALIDATION_FAILED, INVALID_PRACTICE_CONFIG',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'INSUFFICIENT_QUESTIONS (details.available), NO_MISTAKES, NOTHING_TO_RETRY',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSessionDto,
  ): Promise<SessionSummaryDto> {
    return this.practice.create(user, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Lịch sử lượt luyện đã nộp của tôi' })
  @ApiOkResponse({ type: [SessionSummaryDto] })
  history(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: ListSessionsQueryDto,
  ): Promise<SessionSummaryDto[]> {
    return this.practice.history(user.id, q.limit ?? 20);
  }

  @Get('sessions/active')
  @ApiOperation({ summary: 'Lượt đang làm dở gần nhất (để tiếp tục hoặc bỏ)' })
  @ApiOkResponse({ type: ActiveSessionDto })
  active(@CurrentUser() user: AuthenticatedUser): Promise<ActiveSessionDto> {
    return this.practice.active(user.id);
  }

  @Get('sessions/:id')
  @ApiOperation({
    summary: 'Đề của lượt luyện (không kèm đáp án đúng trừ câu đã chốt)',
  })
  @ApiOkResponse({ type: SessionDetailDto })
  @ApiNotFoundResponse({ description: 'SESSION_NOT_FOUND' })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionDetailDto> {
    return this.practice.detail(user, id);
  }

  @Put('sessions/:id/answers')
  @ApiOperation({
    summary:
      'Lưu lựa chọn một câu. Chế độ phản hồi ngay: chốt câu và trả đáp án + giải thích.',
  })
  @ApiOkResponse({ type: SaveAnswerResultDto })
  @ApiBadRequestResponse({ description: 'INVALID_ANSWER' })
  @ApiConflictResponse({ description: 'SESSION_CLOSED, ANSWER_LOCKED' })
  saveAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAnswerDto,
  ): Promise<SaveAnswerResultDto> {
    return this.practice.saveAnswer(user, id, dto);
  }

  @Post('sessions/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Nộp bài: server chấm, ghi sổ câu sai, trả kết quả. Gọi lại → trả kết quả cũ.',
  })
  @ApiOkResponse({ type: SessionResultDto })
  @ApiConflictResponse({ description: 'SESSION_CLOSED' })
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResultDto> {
    return this.practice.submit(user, id);
  }

  @Post('sessions/:id/abandon')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Bỏ lượt đang làm' })
  @ApiNoContentResponse()
  abandon(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.practice.abandon(user, id);
  }

  @Get('sessions/:id/result')
  @ApiOperation({
    summary:
      'Kết quả lượt đã nộp: điểm, đáp án, giải thích, phân tích theo Part/dạng',
  })
  @ApiOkResponse({ type: SessionResultDto })
  @ApiConflictResponse({ description: 'SESSION_NOT_SUBMITTED' })
  result(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SessionResultDto> {
    return this.practice.result(user, id);
  }

  // ---------- Daily Challenge ----------

  @Get('daily')
  @ApiOperation({
    summary: 'Daily Challenge hôm nay (giờ Việt Nam) và chuỗi ngày',
  })
  @ApiOkResponse({ type: DailyChallengeDto })
  daily(@CurrentUser() user: AuthenticatedUser): Promise<DailyChallengeDto> {
    return this.practice.getDaily(user);
  }

  @Post('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bắt đầu (hoặc lấy lại) Daily Challenge hôm nay: 5 Listening + 5 Reading',
  })
  @ApiOkResponse({ type: SessionSummaryDto })
  @ApiUnprocessableEntityResponse({ description: 'INSUFFICIENT_QUESTIONS' })
  startDaily(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionSummaryDto> {
    return this.practice.startDaily(user);
  }

  // ---------- Sổ câu sai ----------

  @Get('mistakes/summary')
  @ApiOperation({ summary: 'Số câu sai / đã sửa / chưa ôn / bookmark' })
  @ApiOkResponse({ type: MistakeSummaryDto })
  mistakeSummary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MistakeSummaryDto> {
    return this.mistakes.summary(user.id);
  }

  @Get('mistakes')
  @ApiOperation({
    summary:
      'Danh sách câu trong sổ (lọc Part, dạng, thời gian, số lần sai, trạng thái)',
  })
  @ApiOkResponse({ type: MistakeListDto })
  listMistakes(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: ListMistakesQueryDto,
  ): Promise<MistakeListDto> {
    return this.mistakes.list(user.id, q);
  }

  @Get('mistakes/bookmarks')
  @ApiOperation({ summary: 'Id các câu tôi đã bookmark' })
  @ApiOkResponse({ type: BookmarkedIdsDto })
  bookmarkedIds(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookmarkedIdsDto> {
    return this.mistakes.bookmarkedIds(user.id);
  }

  @Put('mistakes/bookmarks/:questionId')
  @ApiOperation({ summary: 'Bookmark một câu (kể cả câu trả lời đúng)' })
  @ApiOkResponse({ type: BookmarkStateDto })
  @ApiForbiddenResponse({ description: 'QUESTION_LOCKED' })
  @ApiNotFoundResponse({ description: 'QUESTION_NOT_FOUND' })
  async bookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<BookmarkStateDto> {
    await this.mistakes.setBookmark(user, [questionId], true);
    return { question_id: questionId, bookmarked: true };
  }

  @Delete('mistakes/bookmarks/:questionId')
  @ApiOperation({ summary: 'Bỏ bookmark (câu từng sai vẫn giữ trong sổ)' })
  @ApiOkResponse({ type: BookmarkStateDto })
  async unbookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<BookmarkStateDto> {
    await this.mistakes.setBookmark(user, [questionId], false);
    return { question_id: questionId, bookmarked: false };
  }

  @Post('mistakes/bookmarks')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Bookmark nhiều câu (nút "Lưu câu sai" ở màn hình kết quả)',
  })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'QUESTION_LOCKED' })
  bookmarkMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BookmarkBatchDto,
  ): Promise<void> {
    return this.mistakes.setBookmark(user, dto.question_ids, true);
  }

  @Get('mistakes/:id/history')
  @ApiOperation({ summary: 'Lịch sử từng lần trả lời một câu trong sổ' })
  @ApiOkResponse({ type: [MistakeAttemptDto] })
  @ApiNotFoundResponse({ description: 'MISTAKE_NOT_FOUND' })
  mistakeHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MistakeAttemptDto[]> {
    return this.mistakes.history(user.id, id);
  }

  // ---------- Thư viện đề, yêu thích, báo lỗi ----------

  @Get('library/exams')
  @ApiOperation({
    summary:
      'Thư viện đề có bộ lọc, sắp xếp, tìm kiếm; kèm số đề theo từng bộ lọc',
  })
  @ApiOkResponse({ type: ExamLibraryDto })
  libraryList(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: ExamLibraryQueryDto,
  ): Promise<ExamLibraryDto> {
    return this.library.list(user, q);
  }

  @Get('library/exams/:testId')
  @ApiOperation({
    summary:
      'Thẻ một đề (năm, độ khó, xác minh, trạng thái của tôi, yêu thích)',
  })
  @ApiOkResponse({ type: ExamCardDto })
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  libraryCard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<ExamCardDto> {
    return this.library.card(user, testId);
  }

  @Get('favorites')
  @ApiOperation({
    summary:
      'Đề yêu thích của tôi (đề đã bị xóa vẫn hiện với available = false)',
  })
  @ApiOkResponse({ type: [FavoriteExamDto] })
  favorites(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: FavoritesQueryDto,
  ): Promise<FavoriteExamDto[]> {
    return this.library.favorites(user, q.skill);
  }

  @Put('favorites/:testId')
  @ApiOperation({ summary: 'Thêm đề vào yêu thích (mỗi đề một lần)' })
  @ApiOkResponse({ type: FavoriteStateDto })
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<FavoriteStateDto> {
    return this.library.setFavorite(user, testId, true);
  }

  @Delete('favorites/:testId')
  @ApiOperation({ summary: 'Bỏ yêu thích (không ảnh hưởng lịch sử làm bài)' })
  @ApiOkResponse({ type: FavoriteStateDto })
  removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<FavoriteStateDto> {
    return this.library.setFavorite(user, testId, false);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Báo lỗi đề hoặc câu hỏi' })
  @ApiOkResponse({ type: ReportDto })
  @ApiNotFoundResponse({
    description: 'FULLTEST_NOT_FOUND, QUESTION_NOT_FOUND',
  })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ): Promise<ReportDto> {
    return this.library.report(user, dto);
  }
}
