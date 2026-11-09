import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CURRENT_MODES,
  type CurrentMode,
  PURPOSES,
  type Purpose,
  SCORE_MAX,
  SCORE_MIN,
} from '../roadmap-planner';

// ---------- Request ----------

export class CreateRoadmapDto {
  @ApiProperty({
    enum: CURRENT_MODES,
    description:
      "'score' = tự khai điểm, 'none' = chưa thi/mất gốc, 'placement' = dùng kết quả bài test nhanh gần nhất (server tự đọc)",
  })
  @IsIn([...CURRENT_MODES])
  current_mode!: CurrentMode;

  @ApiPropertyOptional({
    minimum: SCORE_MIN,
    maximum: SCORE_MAX - 5,
    description: "Bắt buộc khi current_mode = 'score'",
  })
  @ValidateIf((o: CreateRoadmapDto) => o.current_mode === 'score')
  @IsInt()
  @Min(SCORE_MIN)
  @Max(SCORE_MAX - 5)
  current_score?: number;

  @ApiProperty({ minimum: 300, maximum: SCORE_MAX })
  @IsInt()
  @Min(300)
  @Max(SCORE_MAX)
  target_score!: number;

  @ApiProperty({ enum: PURPOSES })
  @IsIn([...PURPOSES])
  purpose!: Purpose;

  @ApiPropertyOptional({
    example: '2027-02-15',
    description:
      'Ngày dự kiến thi (YYYY-MM-DD). Gửi đúng một trong exam_date hoặc duration_weeks.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  exam_date?: string;

  @ApiPropertyOptional({ minimum: 2, maximum: 104 })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(104)
  duration_weeks?: number;

  @ApiProperty({ minimum: 15, maximum: 240 })
  @IsInt()
  @Min(15)
  @Max(240)
  minutes_per_day!: number;

  @ApiProperty({ minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  days_per_week!: number;
}

// ---------- Response ----------

export class RoadmapFocusDto {
  @ApiProperty() grammar!: number;
  @ApiProperty() vocab!: number;
  @ApiProperty() listening!: number;
  @ApiProperty() reading!: number;
}

export class RoadmapResourceDto {
  @ApiProperty({ enum: ['module', 'vocab', 'full_test'] })
  type!: 'module' | 'vocab' | 'full_test';
  @ApiProperty() id!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ type: String, nullable: true }) subtitle!: string | null;
  @ApiProperty({ description: 'Đường dẫn trong ứng dụng' }) url!: string;
}

export class RoadmapPhaseDto {
  @ApiProperty() key!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() from_score!: number;
  @ApiProperty() to_score!: number;
  @ApiProperty() hours!: number;
  @ApiProperty() weeks!: number;
  @ApiProperty() start_week!: number;
  @ApiProperty() end_week!: number;
  @ApiProperty({ example: '2026-11-09' }) start_date!: string;
  @ApiProperty({ example: '2026-12-06' }) end_date!: string;
  @ApiProperty({ type: RoadmapFocusDto }) focus!: RoadmapFocusDto;
  @ApiProperty({ type: [String] }) grammar_topics!: string[];
  @ApiProperty({ type: [String] }) vocab_topics!: string[];
  @ApiProperty({ type: [String] }) practice!: string[];
  @ApiProperty({ type: [RoadmapResourceDto] })
  resources!: RoadmapResourceDto[];
}

export class RoadmapSummaryDto {
  @ApiProperty() required_hours!: number;
  @ApiProperty() available_hours!: number;
  @ApiProperty() weekly_hours!: number;
  @ApiProperty({ enum: ['on_track', 'tight', 'at_risk'] })
  status!: 'on_track' | 'tight' | 'at_risk';
  @ApiProperty() recommended_minutes_per_day!: number;
  @ApiProperty({ description: 'Điểm ước đạt được với quỹ giờ hiện tại' })
  achievable_score!: number;
  @ApiProperty() total_weeks!: number;
  @ApiProperty() current_week!: number;
  @ApiProperty() current_phase_index!: number;
}

export class RoadmapDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CURRENT_MODES }) current_mode!: CurrentMode;
  @ApiProperty() current_score!: number;
  @ApiProperty() target_score!: number;
  @ApiProperty({ enum: PURPOSES }) purpose!: Purpose;
  @ApiProperty({ type: String, nullable: true }) exam_date!: string | null;
  @ApiProperty() duration_weeks!: number;
  @ApiProperty() minutes_per_day!: number;
  @ApiProperty() days_per_week!: number;
  @ApiProperty() started_at!: string;
  @ApiProperty() end_date!: string;
  @ApiProperty() created_at!: string;
  @ApiProperty() updated_at!: string;
  @ApiProperty() purpose_note!: string;
  @ApiProperty({ type: RoadmapSummaryDto }) summary!: RoadmapSummaryDto;
  @ApiProperty({ type: [RoadmapPhaseDto] }) phases!: RoadmapPhaseDto[];
}

export class MyRoadmapDto {
  @ApiProperty({ type: RoadmapDto, nullable: true })
  roadmap!: RoadmapDto | null;
}

export class PlacementQuizDto {
  @ApiProperty() id!: number;
  @ApiProperty() course_id!: number;
  @ApiProperty() title!: string;
  @ApiProperty() total_questions!: number;
  @ApiProperty({ type: Number, nullable: true })
  time_limit_seconds!: number | null;
}

export class PlacementResultDto {
  @ApiProperty() id!: number;
  @ApiProperty() correct_answers!: number;
  @ApiProperty() total_questions!: number;
  @ApiProperty() estimated_score!: number;
  @ApiProperty({ type: String, nullable: true }) completed_at!: string | null;
}

export class PlacementDto {
  @ApiProperty({
    type: PlacementQuizDto,
    nullable: true,
    description:
      'null khi admin chưa chọn bài test (platform_settings.roadmap_placement_quiz_id) hoặc học viên không có quyền làm quiz đó',
  })
  quiz!: PlacementQuizDto | null;

  @ApiProperty({ type: PlacementResultDto, nullable: true })
  latest_result!: PlacementResultDto | null;
}
