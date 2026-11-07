import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  Max,
  Min,
} from 'class-validator';

/** Số bước của "Luyện nghe từng bước" (quyết định D10 trong docs/UX_REVIEW.md). */
export const LISTENING_STEP_COUNT = 7;

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
    description: 'Thời điểm xong đủ 7 bước lần đầu',
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
}
