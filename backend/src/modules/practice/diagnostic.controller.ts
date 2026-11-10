import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  type AuthenticatedUser,
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';
import { DiagnosticService } from './diagnostic.service';
import { SessionSummaryDto } from './dto/practice.dto';

export class StartDiagnosticDto {
  @ApiPropertyOptional({
    description: 'true = bỏ lượt đang làm dở và làm lại từ đầu',
  })
  @IsOptional()
  @IsBoolean()
  restart?: boolean;
}

export class DiagnosticStatusDto {
  @ApiProperty() available!: boolean;
  @ApiProperty() total_questions!: number;
  @ApiProperty() minutes!: number;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  structure!: unknown[];
  @ApiProperty({ type: SessionSummaryDto, nullable: true })
  in_progress!: SessionSummaryDto | null;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  latest!: unknown;
  @ApiProperty({ description: 'Đã làm trong 7 ngày qua (sẽ gặp lại cùng câu)' })
  retake_warning!: boolean;
  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Full Test đủ 7 Part trong 30 ngày',
  })
  recent_full_test!: unknown;
}

export class DiagnosticReportDto {
  @ApiProperty() session_id!: string;
  @ApiProperty() usable!: boolean;
  @ApiProperty() total_questions!: number;
  @ApiProperty() answered!: number;
  @ApiProperty() correct!: number;
  @ApiProperty() blank!: number;
  @ApiProperty({ type: 'object', additionalProperties: true })
  estimate!: unknown;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) parts!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object' } }) weak!: unknown[];
}

/** Bài kiểm tra trình độ (P01): miễn phí cho mọi tài khoản đăng nhập; kết quả chỉ của chính mình. */
@ApiTags('practice')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
@UseGuards(JwtAuthGuard)
@Controller('practice/diagnostic')
export class DiagnosticController {
  constructor(private readonly diagnostic: DiagnosticService) {}

  @Get()
  @ApiOperation({
    summary:
      'Trạng thái bài kiểm tra trình độ: cấu trúc, lượt dở, kết quả gần nhất',
  })
  @ApiOkResponse({ type: DiagnosticStatusDto })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.diagnostic.status(user);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Bắt đầu hoặc tiếp tục bài kiểm tra trình độ (lượt luyện chế độ Test, 40 phút)',
  })
  @ApiOkResponse({ type: SessionSummaryDto })
  @ApiNotFoundResponse({ description: 'DIAGNOSTIC_UNAVAILABLE' })
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartDiagnosticDto,
  ) {
    return this.diagnostic.start(user, dto.restart === true);
  }

  @Get(':id/report')
  @ApiOperation({
    summary:
      'Kết quả chẩn đoán: khoảng điểm L/R/Tổng, mức từng Part, dạng yếu sơ bộ',
  })
  @ApiOkResponse({ type: DiagnosticReportDto })
  @ApiNotFoundResponse({
    description: 'SESSION_NOT_FOUND (không có hoặc không phải của tôi)',
  })
  @ApiForbiddenResponse({ description: 'SESSION_NOT_SUBMITTED' })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.diagnostic.report(user, id);
  }
}
