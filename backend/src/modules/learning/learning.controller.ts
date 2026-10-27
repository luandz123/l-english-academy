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
  ApiCreatedResponse,
  ApiNoContentResponse,
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
  CreateNoteDto,
  CurriculumModuleDto,
  EnrollmentResponseDto,
  FavoriteDto,
  LessonProgressDto,
  MaterialDto,
  NoteDto,
  PracticeDto,
  UpdateLessonProgressDto,
} from './dto';
import { LearningService } from './learning.service';

@ApiTags('learning')
@ApiBearerAuth()
@Controller('learning')
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Get('courses/:courseId/curriculum')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Cây module + bài của một khóa',
    description:
      'Không cần đăng nhập. Bài người xem không được học có video_url/pdf_url = null. ' +
      'Admin thấy cả module/bài is_published = false. Khóa không tồn tại → [].',
  })
  @ApiOkResponse({ type: [CurriculumModuleDto] })
  @ApiUnauthorizedResponse({ description: 'Có gửi token nhưng sai/hết hạn' })
  getCurriculum(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<CurriculumModuleDto[]> {
    return this.learning.getCurriculum(courseId, user);
  }

  @Get('courses/:courseId/enrollment')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ghi danh của chính người dùng vào khóa' })
  @ApiOkResponse({ type: EnrollmentResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getMyEnrollment(
    @Param('courseId', ParseIntPipe) courseId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EnrollmentResponseDto> {
    return this.learning.getMyEnrollment(user.id, courseId);
  }

  @Get('lessons/:lessonId/materials')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Tài liệu của một bài',
    description: 'Bài không tồn tại hoặc người xem không được học → [].',
  })
  @ApiOkResponse({ type: [MaterialDto] })
  @ApiUnauthorizedResponse({ description: 'Có gửi token nhưng sai/hết hạn' })
  getLessonMaterials(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<MaterialDto[]> {
    return this.learning.getLessonMaterials(lessonId, user);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Tiến độ học các bài của tôi' })
  @ApiOkResponse({ type: [LessonProgressDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getMyProgress(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LessonProgressDto[]> {
    return this.learning.getMyProgress(user.id);
  }

  @Put('lessons/:lessonId/progress')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cập nhật tiến độ hoàn thành bài học' })
  @ApiOkResponse({ type: LessonProgressDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  updateProgress(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: UpdateLessonProgressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LessonProgressDto> {
    return this.learning.updateProgress(user.id, lessonId, dto);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách bài học yêu thích của tôi' })
  @ApiOkResponse({ type: [FavoriteDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getMyFavorites(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoriteDto[]> {
    return this.learning.getMyFavorites(user.id);
  }

  @Put('lessons/:lessonId/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Thêm bài học vào danh sách yêu thích' })
  @ApiOkResponse({ type: FavoriteDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  addFavorite(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoriteDto> {
    return this.learning.addFavorite(user.id, lessonId);
  }

  @Delete('lessons/:lessonId/favorite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa bài học khỏi danh sách yêu thích' })
  @ApiNoContentResponse({ description: 'Đã xóa hoặc bài chưa được thích' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  removeFavorite(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.learning.removeFavorite(user.id, lessonId);
  }

  @Get('lessons/:lessonId/notes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Danh sách ghi chú của tôi trong bài học' })
  @ApiOkResponse({ type: [NoteDto] })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  getLessonNotes(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NoteDto[]> {
    return this.learning.getLessonNotes(user.id, lessonId);
  }

  @Post('lessons/:lessonId/notes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo ghi chú mới cho bài học' })
  @ApiCreatedResponse({ type: NoteDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  createNote(
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NoteDto> {
    return this.learning.createNote(user.id, lessonId, dto);
  }

  @Get('lessons/:lessonId/practices')
  @ApiOperation({ summary: 'Danh sách popup luyện tập trong bài học' })
  @ApiOkResponse({ type: [PracticeDto] })
  getLessonPractices(
    @Param('lessonId', ParseIntPipe) lessonId: number,
  ): Promise<PracticeDto[]> {
    return this.learning.getLessonPractices(lessonId);
  }
}
