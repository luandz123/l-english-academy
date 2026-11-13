import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import {
  CreateRoadmapDto,
  MyRoadmapDto,
  PlacementDto,
  RoadmapDto,
} from './dto/roadmap.dto';
import { RoadmapService } from './roadmap.service';

@ApiTags('roadmap')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('roadmap')
export class RoadmapController {
  constructor(private readonly roadmap: RoadmapService) {}

  @Get('me')
  @ApiOperation({
    summary:
      'Lộ trình của tôi (tính lại tổng giờ, chặng, tài nguyên ở server). roadmap = null nếu chưa tạo.',
  })
  @ApiOkResponse({ type: MyRoadmapDto })
  getMine(@CurrentUser() user: AuthenticatedUser): Promise<MyRoadmapDto> {
    return this.roadmap.getMine(user);
  }

  @Put('me')
  @ApiOperation({
    summary:
      'Tạo hoặc làm lại lộ trình từ wizard. Điểm xuất phát "placement" do server đọc từ kết quả bài test nhanh.',
  })
  @ApiOkResponse({ type: RoadmapDto })
  @ApiBadRequestResponse({
    description:
      'VALIDATION_FAILED, INVALID_TARGET, TARGET_NOT_ABOVE_CURRENT, INVALID_TIMEFRAME, INVALID_EXAM_DATE, PLACEMENT_RESULT_NOT_FOUND',
  })
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoadmapDto,
  ): Promise<RoadmapDto> {
    return this.roadmap.create(user, dto);
  }

  @Post('me/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Chuyển sang chặng sau khi điểm ước lượng mới đã vượt chặng hiện tại (học viên bấm đồng ý)',
  })
  @ApiOkResponse({ type: RoadmapDto })
  @ApiBadRequestResponse({
    description: 'NO_ROADMAP, NOT_EXCEEDED, TARGET_REACHED',
  })
  advance(@CurrentUser() user: AuthenticatedUser): Promise<RoadmapDto> {
    return this.roadmap.advance(user);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa lộ trình của tôi' })
  @ApiNoContentResponse()
  remove(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.roadmap.remove(user.id);
  }

  @Get('placement')
  @ApiOperation({
    summary:
      'Bài test nhanh (admin chọn qua platform_settings.roadmap_placement_quiz_id) và kết quả gần nhất của tôi',
  })
  @ApiOkResponse({ type: PlacementDto })
  getPlacement(@CurrentUser() user: AuthenticatedUser): Promise<PlacementDto> {
    return this.roadmap.getPlacement(user);
  }
}
