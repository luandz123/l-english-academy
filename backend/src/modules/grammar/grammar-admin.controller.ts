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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  AdminExerciseDto,
  AdminQuestionListDto,
  AdminQuestionsQueryDto,
  AdminTopicDto,
  ExerciseInputDto,
  FormulaDto,
  FormulaInputDto,
  ImportDto,
  QuestionTopicDto,
  TopicInputDto,
  UpdateTopicDto,
} from './dto/grammar.dto';
import { GrammarAdminService } from './grammar-admin.service';

/** Quản trị Ngữ pháp — chỉ admin. */
@ApiTags('grammar-admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@ApiForbiddenResponse({ description: 'Không phải admin' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.admin)
@Controller('grammar/admin')
export class GrammarAdminController {
  constructor(private readonly admin: GrammarAdminService) {}

  @Get('topics')
  @ApiOperation({
    summary: 'Mọi chủ điểm (cả ẩn) kèm số công thức, bài tập, câu TOEIC',
  })
  @ApiOkResponse({ type: [AdminTopicDto] })
  topics(): Promise<AdminTopicDto[]> {
    return this.admin.listTopics();
  }

  @Get('topics/:id')
  @ApiOperation({ summary: 'Một chủ điểm (cả bài học)' })
  @ApiOkResponse({ type: AdminTopicDto })
  @ApiNotFoundResponse()
  topic(@Param('id', ParseIntPipe) id: number): Promise<AdminTopicDto> {
    return this.admin.getTopic(id);
  }

  @Post('topics')
  @ApiOperation({ summary: 'Tạo chủ điểm' })
  @ApiOkResponse({ type: AdminTopicDto })
  createTopic(@Body() dto: TopicInputDto): Promise<AdminTopicDto> {
    return this.admin.createTopic(dto);
  }

  @Patch('topics/:id')
  @ApiOperation({ summary: 'Sửa chủ điểm, bài học, video, ẩn/hiện' })
  @ApiOkResponse({ type: AdminTopicDto })
  @ApiConflictResponse({ description: 'SLUG_TAKEN' })
  updateTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
  ): Promise<AdminTopicDto> {
    return this.admin.updateTopic(id, dto);
  }

  @Get('topics/:id/formulas')
  @ApiOperation({ summary: 'Công thức của chủ điểm' })
  @ApiOkResponse({ type: [FormulaDto] })
  formulas(@Param('id', ParseIntPipe) id: number): Promise<FormulaDto[]> {
    return this.admin.listFormulas(id);
  }

  @Post('topics/:id/formulas')
  @ApiOperation({ summary: 'Thêm công thức' })
  @ApiOkResponse({ type: FormulaDto })
  createFormula(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FormulaInputDto,
  ): Promise<FormulaDto> {
    return this.admin.createFormula(id, dto);
  }

  @Put('formulas/:id')
  @ApiOperation({ summary: 'Sửa công thức' })
  @ApiOkResponse({ type: FormulaDto })
  updateFormula(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FormulaInputDto,
  ): Promise<FormulaDto> {
    return this.admin.updateFormula(id, dto);
  }

  @Delete('formulas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa công thức' })
  @ApiNoContentResponse()
  async deleteFormula(@Param('id', ParseIntPipe) id: number) {
    await this.admin.deleteFormula(id);
  }

  @Get('topics/:id/exercises')
  @ApiOperation({ summary: 'Bài tập của chủ điểm (kèm đáp án)' })
  @ApiOkResponse({ type: [AdminExerciseDto] })
  exercises(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminExerciseDto[]> {
    return this.admin.listExercises(id);
  }

  @Post('topics/:id/exercises')
  @ApiOperation({ summary: 'Thêm câu bài tập' })
  @ApiOkResponse({ type: AdminExerciseDto })
  @ApiUnprocessableEntityResponse({ description: 'INVALID_EXERCISE' })
  createExercise(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExerciseInputDto,
  ): Promise<AdminExerciseDto> {
    return this.admin.createExercise(id, dto);
  }

  @Put('exercises/:id')
  @ApiOperation({ summary: 'Sửa câu bài tập (lượt cũ giữ kết quả đã chấm)' })
  @ApiOkResponse({ type: AdminExerciseDto })
  @ApiUnprocessableEntityResponse({ description: 'INVALID_EXERCISE' })
  updateExercise(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExerciseInputDto,
  ): Promise<AdminExerciseDto> {
    return this.admin.updateExercise(id, dto);
  }

  @Delete('exercises/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Gỡ câu bài tập (ngừng dùng, giữ lỗi cũ)' })
  @ApiNoContentResponse()
  async removeExercise(@Param('id', ParseIntPipe) id: number) {
    await this.admin.removeExercise(id);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Nhập hàng loạt chủ điểm + công thức + bài tập từ JSON (kiểm tra hết trước khi ghi)',
  })
  @ApiOkResponse({ description: '{ topics, formulas, exercises }' })
  @ApiUnprocessableEntityResponse({
    description: 'INVALID_EXERCISE (chỉ rõ chủ điểm, câu)',
  })
  import(@Body() dto: ImportDto) {
    return this.admin.import(dto);
  }

  @Get('questions')
  @ApiOperation({
    summary: 'Câu Part 5/6 và chủ điểm đang gắn (lọc chủ điểm, đề, chưa gắn)',
  })
  @ApiOkResponse({ type: AdminQuestionListDto })
  questions(@Query() q: AdminQuestionsQueryDto): Promise<AdminQuestionListDto> {
    return this.admin.listQuestions(q);
  }

  @Put('questions/:id/topic')
  @ApiOperation({
    summary: 'Đổi chủ điểm của một câu TOEIC (không bị gắn tự động đè lên)',
  })
  @ApiOkResponse({ description: '{ ok: true }' })
  @ApiNotFoundResponse()
  setQuestionTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: QuestionTopicDto,
  ) {
    return this.admin.setQuestionTopic(id, dto.topic_id ?? null);
  }

  @Post('retag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Gắn lại chủ điểm tự động (bỏ qua câu admin đã sửa)',
  })
  @ApiOkResponse({ description: '{ tagged }' })
  retag() {
    return this.admin.retag();
  }
}
