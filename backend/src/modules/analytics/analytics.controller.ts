import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
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
import { AnalyticsService } from './analytics.service';
import { CompareService } from './compare.service';
import {
  CompareDto,
  CompareQueryDto,
  ProgressDto,
  RecommendationDto,
  WeaknessQueryDto,
  WeaknessReportDto,
} from './dto/analytics.dto';
import { RecommendationService } from './recommendation.service';

/**
 * Phân tích và cá nhân hóa (D14). Chỉ dữ liệu của chính người gọi (user id lấy từ token);
 * so sánh lượt của người khác → 404. Số liệu tính ở server từ lượt đã nộp.
 */
@ApiTags('analytics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly compareService: CompareService,
    private readonly recommendations: RecommendationService,
  ) {}

  @Get('weaknesses')
  @ApiOperation({
    summary:
      'Phân tích điểm yếu (P11): 3 dạng yếu nhất, theo Part và dạng câu, xu hướng',
  })
  @ApiOkResponse({ type: WeaknessReportDto })
  weaknesses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: WeaknessQueryDto,
  ): Promise<WeaknessReportDto> {
    return this.analytics.weaknesses(user, q.window ?? '30', q.skill ?? 'all');
  }

  @Get('progress')
  @ApiOperation({
    summary:
      'Tiến độ học tập (P10): điểm ước lượng, biểu đồ điểm, Part, hoạt động 8 tuần, lịch sử',
  })
  @ApiOkResponse({ type: ProgressDto })
  progress(@CurrentUser() user: AuthenticatedUser): Promise<ProgressDto> {
    return this.analytics.progress(user);
  }

  @Get('compare')
  @ApiOperation({ summary: 'So sánh 2–3 lượt Full Test của tôi (E09)' })
  @ApiOkResponse({ type: CompareDto })
  @ApiBadRequestResponse({ description: 'VALIDATION_FAILED, INVALID_COMPARE' })
  @ApiNotFoundResponse({
    description: 'RESULT_NOT_FOUND (không tồn tại hoặc không phải của tôi)',
  })
  compare(
    @CurrentUser() user: AuthenticatedUser,
    @Query() q: CompareQueryDto,
  ): Promise<CompareDto> {
    return this.compareService.compare(user, q.ids);
  }

  @Get('recommendations')
  @ApiOperation({
    summary:
      'Đề xuất đề tiếp theo (E10): đề chính, chế độ làm, lý do, 2 đề thay thế',
  })
  @ApiOkResponse({ type: RecommendationDto })
  recommend(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecommendationDto> {
    return this.recommendations.recommend(user);
  }

  @Post('recommendations/:testId/skip')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '"Không phải lúc này": không đề xuất lại đề này trong 7 ngày',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'FULLTEST_NOT_FOUND' })
  skip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('testId', ParseIntPipe) testId: number,
  ): Promise<void> {
    return this.recommendations.skip(user, testId);
  }
}
