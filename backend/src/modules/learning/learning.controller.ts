import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { CurriculumModuleDto, EnrollmentResponseDto, MaterialDto } from './dto';
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
}
