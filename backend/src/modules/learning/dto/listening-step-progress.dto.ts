import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Số bước tối đa của "Luyện nghe từng bước". Từ D17 mỗi Part có số bước riêng
 * (Part 1: 5, Part 2/3/4: 6); bài cũ theo D10 có 7 bước.
 */
export const LISTENING_STEP_COUNT = 7;
/** Số bước ít nhất của một luồng (dùng để kiểm tra `total_steps`). */
export const LISTENING_MIN_STEP_COUNT = 4;

/** Mã bài là id tĩnh ở frontend, vd. "dictation-part2-unit1", "fulltest-01-q7-q11". */
export const LISTENING_CLUSTER_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;

export class ListeningStepProgressDto {
  @ApiProperty({ example: 'dictation-part2-unit1' })
  cluster_id!: string;

  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  completed_steps!: number[];

  @ApiProperty({ minimum: 1, maximum: LISTENING_STEP_COUNT })
  current_step!: number;

  @ApiProperty({
    nullable: true,
    description: 'Thời điểm xong đủ các bước của bài lần đầu',
  })
  completed_at!: string | null;

  @ApiProperty()
  updated_at!: string;
}

export class SaveListeningStepProgressDto {
  @ApiProperty({
    type: [Number],
    description:
      'Các bước đã xong (1–7). Server gộp với dữ liệu đã lưu, không xóa bước đã xong.',
  })
  @IsArray()
  @ArrayMaxSize(LISTENING_STEP_COUNT)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(LISTENING_STEP_COUNT, { each: true })
  completed_steps!: number[];

  @ApiProperty({ minimum: 1, maximum: LISTENING_STEP_COUNT })
  @IsInt()
  @Min(1)
  @Max(LISTENING_STEP_COUNT)
  current_step!: number;

  @ApiPropertyOptional({
    minimum: LISTENING_MIN_STEP_COUNT,
    maximum: LISTENING_STEP_COUNT,
    default: LISTENING_STEP_COUNT,
    description:
      'Số bước của bài (theo Part). Server ghi completed_at khi đã xong đủ các bước 1..total_steps. Bỏ trống = 7 (bài cũ).',
  })
  @IsOptional()
  @IsInt()
  @Min(LISTENING_MIN_STEP_COUNT)
  @Max(LISTENING_STEP_COUNT)
  total_steps?: number;
}
