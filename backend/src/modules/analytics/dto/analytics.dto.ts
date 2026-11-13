import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';
import { WINDOWS, type WindowKey } from '../analytics-config';

export class WeaknessQueryDto {
  @ApiPropertyOptional({
    enum: WINDOWS,
    default: '30',
    description: 'Cửa sổ thời gian (ngày) hoặc all',
  })
  @IsOptional()
  @IsIn([...WINDOWS])
  window?: WindowKey;

  @ApiPropertyOptional({
    enum: ['all', 'listening', 'reading'],
    default: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'listening', 'reading'])
  skill?: 'all' | 'listening' | 'reading';
}

export class CompareQueryDto {
  @ApiProperty({
    type: [Number],
    description: '2–3 id kết quả Full Test, cách nhau dấu phẩy',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.split(',').map((v) => Number(v.trim()))
      : value,
  )
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  ids!: number[];
}

// ---------- Response (các khối lồng nhau mô tả bằng object để Swagger gọn) ----------

export class PracticeActionDto {
  @ApiProperty({ enum: ['practice', 'review', 'locked', 'none'] })
  action!: string;
  @ApiProperty({ description: 'Số câu chưa làm còn luyện được (đề có quyền)' })
  available!: number;
  @ApiProperty({ description: 'Số câu chưa làm ở đề chưa mở khóa' })
  locked!: number;
  @ApiProperty({ description: 'Số câu dạng này đang có trong Sổ câu sai' })
  mistakes!: number;
}

export class CategoryAnalysisDto {
  @ApiProperty() part!: number;
  @ApiProperty() category!: string;
  @ApiProperty() label!: string;
  @ApiProperty() answered!: number;
  @ApiProperty() correct!: number;
  @ApiProperty() wrong!: number;
  @ApiProperty() blank!: number;
  @ApiProperty({ nullable: true, type: Number }) accuracy!: number | null;
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'Chênh so với tỉ lệ đúng chung (điểm %)',
  })
  gap!: number | null;
  @ApiProperty({ enum: ['insufficient', 'weak', 'average', 'good'] })
  level!: string;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  trend!: unknown;
  @ApiProperty({ type: 'object', additionalProperties: true }) flags!: unknown;
  @ApiProperty({ type: PracticeActionDto }) practice!: PracticeActionDto;
  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description: 'Lượt luyện dạng này trong 24h qua',
  })
  recent_practice!: unknown;
}

export class PartAnalysisDto {
  @ApiProperty() part!: number;
  @ApiProperty() skill!: string;
  @ApiProperty() name!: string;
  @ApiProperty() answered!: number;
  @ApiProperty() correct!: number;
  @ApiProperty({ nullable: true, type: Number }) accuracy!: number | null;
  @ApiProperty({ enum: ['insufficient', 'weak', 'average', 'good'] })
  level!: string;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  trend!: unknown;
  @ApiProperty({ type: [CategoryAnalysisDto] })
  categories!: CategoryAnalysisDto[];
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description: 'Part 7: theo loại văn bản',
  })
  passage_types!: unknown[];
}

export class WeaknessReportDto {
  @ApiProperty({ enum: ['empty', 'insufficient', 'ready'] }) state!: string;
  @ApiProperty({ enum: WINDOWS }) window!: string;
  @ApiProperty() skill!: string;
  @ApiProperty({ type: 'object', additionalProperties: true })
  summary!: unknown;
  @ApiProperty({ type: [CategoryAnalysisDto] }) top!: CategoryAnalysisDto[];
  @ApiProperty({ enum: ['weak', 'lowest'] }) top_mode!: string;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  needed!: unknown;
  @ApiProperty({
    nullable: true,
    enum: WINDOWS,
    description: 'Gợi ý mở rộng cửa sổ khi cửa sổ hiện tại thiếu dữ liệu',
  })
  suggest_window!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) skills!: unknown;
  @ApiProperty({ type: [PartAnalysisDto] }) parts!: PartAnalysisDto[];
}

export class ProgressDto {
  @ApiProperty({ enum: ['empty', 'activity', 'full'] }) state!: string;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  estimate!: unknown;
  @ApiProperty({ nullable: true, type: Number }) change_30d!: number | null;
  @ApiProperty({ type: 'object', additionalProperties: true })
  last_30d!: unknown;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  score_points!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object' } }) parts!: unknown[];
  @ApiProperty({ type: 'array', items: { type: 'object' } }) weekly!: unknown[];
  @ApiProperty({ type: [CategoryAnalysisDto] })
  weaknesses!: CategoryAnalysisDto[];
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  history!: unknown[];
}

export class CompareDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  attempts!: unknown[];
  @ApiProperty() same_test!: boolean;
  @ApiProperty({ type: 'object', additionalProperties: true })
  score_diff!: unknown;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) parts!: unknown[];
  @ApiProperty({ type: 'object', additionalProperties: true })
  category_changes!: unknown;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  questions!: unknown;
}

export class RecommendationDto {
  @ApiProperty({ enum: ['diagnostic', 'exam', 'all_done', 'none'] })
  kind!: string;
  @ApiProperty({ type: 'object', nullable: true, additionalProperties: true })
  primary!: unknown;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  alternatives!: unknown[];
}
