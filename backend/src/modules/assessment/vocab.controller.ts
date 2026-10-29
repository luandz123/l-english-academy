import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  LessonQuizIdResponseDto,
  VocabCategoryDto,
  VocabPoolItemDto,
  VocabQuizDto,
  VocabWordDto,
} from './dto';
import { VocabService } from './vocab.service';

@ApiTags('assessment-vocab')
@Controller('assessment/vocab')
export class VocabController {
  constructor(private readonly vocabService: VocabService) {}

  @Get('pool')
  @ApiOperation({
    summary: 'Ngân hàng từ vựng ngẫu nhiên cho game Word Shooter (công khai)',
  })
  @ApiOkResponse({ type: [VocabPoolItemDto] })
  getVocabPool(@Query('limit') limit?: string): Promise<VocabPoolItemDto[]> {
    const parsedLimit = limit
      ? Math.min(200, Math.max(1, Number(limit) || 100))
      : 100;
    return this.vocabService.getVocabPool(parsedLimit);
  }

  @Get('courses/:courseId/categories')
  @ApiOperation({
    summary: 'Danh sách danh mục từ vựng theo khóa học (công khai)',
  })
  @ApiOkResponse({ type: [VocabCategoryDto] })
  listCategories(
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<VocabCategoryDto[]> {
    return this.vocabService.listCategories(courseId);
  }

  @Get('categories/:categoryId/quizzes')
  @ApiOperation({
    summary: 'Danh sách bài học / quiz từ vựng theo danh mục (công khai)',
  })
  @ApiOkResponse({ type: [VocabQuizDto] })
  listQuizzes(
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<VocabQuizDto[]> {
    return this.vocabService.listQuizzes(categoryId);
  }

  @Get('quizzes/:vocabQuizId/words')
  @ApiOperation({
    summary: 'Danh sách từ vựng theo quiz từ vựng (công khai)',
  })
  @ApiOkResponse({ type: [VocabWordDto] })
  listWords(
    @Param('vocabQuizId', ParseIntPipe) vocabQuizId: number,
  ): Promise<VocabWordDto[]> {
    return this.vocabService.listWords(vocabQuizId);
  }

  @Get('lessons/:ref/words')
  @ApiOperation({
    summary:
      'Lấy từ vựng cho bài học theo chuỗi dò 4 bước và bộ lọc question_ids (công khai)',
  })
  @ApiOkResponse({ type: [VocabWordDto] })
  @ApiBadRequestResponse({
    description: 'Danh sách question_ids không hợp lệ hoặc > 500',
  })
  getLessonVocabWords(
    @Param('ref', ParseIntPipe) ref: number,
    @Query('question_ids') questionIds?: string,
  ): Promise<VocabWordDto[]> {
    return this.vocabService.getLessonVocabWords(ref, questionIds);
  }

  @Get('lessons/:lessonId/quiz-id')
  @ApiOperation({
    summary: 'Lấy quiz_id của bài học (công khai)',
  })
  @ApiOkResponse({ type: LessonQuizIdResponseDto })
  getLessonQuizId(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<LessonQuizIdResponseDto> {
    return this.vocabService.getLessonQuizId(lessonId);
  }
}
