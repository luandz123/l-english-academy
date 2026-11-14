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
import { AppRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  CardDto,
  CreateEntryDto,
  EntriesQueryDto,
  EntryDto,
  EntryListDto,
  LookupDto,
  LookupQueryDto,
  NotebookListDto,
  NotebookQueryDto,
  QueueDto,
  ReviewDto,
  SaveBatchDto,
  SaveResultDto,
  SaveWordDto,
  SettingsDto,
  SummaryDto,
  UpdateEntryDto,
  UpdateWordDto,
  WordDto,
} from './dto/vocabulary.dto';
import type { Rating } from './vocab-rules';
import { VocabularyService } from './vocabulary.service';

/**
 * Từ vựng cá nhân (D15). Cần đăng nhập; sổ từ và lịch ôn chỉ của chính mình (từ của người khác → 404).
 * Lịch ôn SRS do server tính, client chỉ gửi nút đánh giá.
 */
@ApiTags('vocabulary')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocab: VocabularyService) {}

  @Get('lookup')
  @ApiOperation({
    summary:
      'Tra từ trong kho (600 từ TOEIC, bộ flashcard) và cho biết đã lưu chưa',
  })
  @ApiOkResponse({ type: LookupDto })
  lookup(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: LookupQueryDto,
  ): Promise<LookupDto> {
    return this.vocab.lookup(user.id, q.word);
  }

  @Get('notebook')
  @ApiOperation({
    summary:
      'Sổ từ vựng của tôi (lọc nguồn, Part, cấp độ, trạng thái, đến hạn)',
  })
  @ApiOkResponse({ type: NotebookListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: NotebookQueryDto,
  ): Promise<NotebookListDto> {
    return this.vocab.list(user.id, q);
  }

  @Get('notebook/summary')
  @ApiOperation({
    summary: 'Số từ, đến hạn hôm nay, từ mới còn được học, đã thuộc',
  })
  @ApiOkResponse({ type: SummaryDto })
  summary(@CurrentUser() user: AuthenticatedUser): Promise<SummaryDto> {
    return this.vocab.summary(user.id);
  }

  @Get('notebook/words')
  @ApiOperation({
    summary: 'Danh sách từ (dạng khóa) đã lưu — để đánh dấu nút "Đã lưu"',
  })
  @ApiOkResponse({ description: '{ words: string[] }' })
  savedWords(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ words: string[] }> {
    return this.vocab.savedWords(user.id);
  }

  @Post('notebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Lưu một từ (từ bài nghe, bài đọc, flashcard hoặc tự thêm). Đã có thì không tạo trùng.',
  })
  @ApiOkResponse({ type: SaveResultDto })
  @ApiUnprocessableEntityResponse({
    description: 'DEFINITION_REQUIRED (kho chưa có nghĩa), INVALID_WORD',
  })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveWordDto,
  ): Promise<SaveResultDto> {
    return this.vocab.save(user.id, dto);
  }

  @Post('notebook/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lưu nhiều từ (cả bộ flashcard, danh sách theo Part/cấp độ)',
  })
  @ApiOkResponse({ description: '{ added, skipped }' })
  saveBatch(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveBatchDto) {
    return this.vocab.saveBatch(user.id, dto);
  }

  @Patch('notebook/:id')
  @ApiOperation({ summary: 'Sửa nghĩa, phiên âm, câu ví dụ, ghi chú' })
  @ApiOkResponse({ type: WordDto })
  @ApiNotFoundResponse({ description: 'WORD_NOT_FOUND' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWordDto,
  ): Promise<WordDto> {
    return this.vocab.update(user.id, id, dto);
  }

  @Delete('notebook/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa từ khỏi sổ (kèm lịch ôn)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'WORD_NOT_FOUND' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.vocab.remove(user.id, id);
  }

  @Get('review/queue')
  @ApiOperation({
    summary: 'Thẻ cần ôn hôm nay: từ đến hạn + từ mới (giới hạn mỗi ngày)',
  })
  @ApiOkResponse({ type: QueueDto })
  queue(@CurrentUser() user: AuthenticatedUser): Promise<QueueDto> {
    return this.vocab.queue(user.id);
  }

  @Post('review/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Chấm một thẻ (Quên / Khó / Nhớ / Dễ) — server tính lịch ôn tiếp theo',
  })
  @ApiOkResponse({ type: CardDto })
  @ApiConflictResponse({ description: 'NOT_DUE' })
  @ApiNotFoundResponse({ description: 'WORD_NOT_FOUND' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewDto,
  ): Promise<CardDto> {
    return this.vocab.review(user.id, id, dto.rating as Rating);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Số từ mới mỗi ngày' })
  @ApiOkResponse({ type: SummaryDto })
  settings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SettingsDto,
  ): Promise<SummaryDto> {
    return this.vocab.saveSettings(user.id, dto.new_per_day);
  }

  @Get('entries')
  @ApiOperation({
    summary: 'Từ vựng theo Part và cấp độ (kho 600 từ TOEIC + từ admin thêm)',
  })
  @ApiOkResponse({ type: EntryListDto })
  entries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: EntriesQueryDto,
  ): Promise<EntryListDto> {
    return this.vocab.entries(user.id, q);
  }
}

/** Quản lý kho từ (nhãn Part/cấp độ) — chỉ admin. */
@ApiTags('vocabulary-admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@ApiForbiddenResponse({ description: 'Không phải admin' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@Controller('vocabulary/admin')
export class VocabularyAdminController {
  constructor(private readonly vocab: VocabularyService) {}

  @Post('entries')
  @ApiOperation({ summary: 'Thêm từ vào kho' })
  @ApiOkResponse({ type: EntryDto })
  @ApiConflictResponse({ description: 'ENTRY_EXISTS' })
  create(@Body() dto: CreateEntryDto): Promise<EntryDto> {
    return this.vocab.createEntry(dto);
  }

  @Patch('entries/:id')
  @ApiOperation({
    summary:
      'Sửa nghĩa / Part / cấp độ (gắn nhãn tự động sau này không ghi đè)',
  })
  @ApiOkResponse({ type: EntryDto })
  @ApiNotFoundResponse({ description: 'WORD_NOT_FOUND' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEntryDto,
  ): Promise<EntryDto> {
    return this.vocab.updateEntry(id, dto);
  }

  @Post('retag')
  @ApiOperation({
    summary:
      'Gắn lại Part/cấp độ theo tần suất trong kho câu hỏi (giữ nhãn admin đã sửa)',
  })
  @ApiOkResponse({ description: '{ tagged }' })
  async retag(): Promise<{ tagged: number }> {
    return { tagged: await this.vocab.retag() };
  }
}
