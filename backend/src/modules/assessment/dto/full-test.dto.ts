import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ReviewQuestionDto } from './question.dto';

/** Một dòng `full_tests`. */
export class FullTestDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  course_id!: number | null;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true, type: Number })
  total_questions!: number | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  release_date!: string | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  created_at!: string | null;

  @ApiProperty({ nullable: true, type: String })
  audio_url!: string | null;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  total_attempts!: number | null;
}

/**
 * Câu hỏi Full Test **kèm** đáp án đúng/lời giải: chế độ "Luyện tập" hiện đáp án ngay khi
 * chọn (`FullTestExam.tsx:1897-1991`), nên chỉ trả cho người có quyền vào khóa của đề.
 */
export class FullTestQuestionDto extends ReviewQuestionDto {
  @ApiProperty({ minimum: 1, maximum: 7 })
  part_number!: number;
}

export class FullTestAnswerItemDto {
  @ApiProperty()
  @IsInt()
  question_id!: number;

  @ApiProperty({ nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  selected_answer_id!: number | null;
}

/**
 * Client gửi đáp án đã chọn + thông tin phiên. Điểm, số câu đúng, `is_correct`, tổng số câu
 * do server tính (AGENTS.md luật 5). `answers_map` là map `vị trí câu → đáp án` client cũ lưu
 * trong `answers_detail.answers` để trang kết quả hiển thị; server lưu nguyên, không dùng để chấm.
 */
export class SubmitFullTestDto {
  @ApiProperty({ type: [FullTestAnswerItemDto] })
  @IsArray()
  @ArrayMaxSize(400)
  @ValidateNested({ each: true })
  @Type(() => FullTestAnswerItemDto)
  answers!: FullTestAnswerItemDto[];

  @ApiProperty({ type: [Number], example: [1, 2, 3, 4, 5, 6, 7] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  selected_parts!: number[];

  @ApiProperty({ enum: ['exam', 'practice'] })
  @IsIn(['exam', 'practice'])
  test_mode!: 'exam' | 'practice';

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(24 * 3600)
  time_spent_seconds!: number;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  pause_count!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  time_allocated_minutes!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { '0': 1201, '1': 1205 },
  })
  @IsObject()
  answers_map!: Record<string, number>;
}

/** Một dòng `user_full_test_results`. */
export class FullTestResultDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty()
  test_id!: number;

  @ApiProperty({ nullable: true, type: Number })
  total_score!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  listening_score!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  reading_score!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  correct_answers!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  time_spent_seconds!: number | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  completed_at!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  total_questions!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  listening_correct!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  reading_correct!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  pause_count!: number | null;

  @ApiProperty({ nullable: true, type: String })
  test_mode!: string | null;

  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  answers_detail!: unknown;
}

export class FullTestResultWithTestDto extends FullTestResultDto {
  @ApiProperty({ type: FullTestDto, nullable: true })
  full_tests!: FullTestDto | null;
}

export class LatestFullTestResultResponseDto {
  @ApiProperty({ type: FullTestResultDto, nullable: true })
  result!: FullTestResultDto | null;
}

/** Một dòng `full_test_answer_details`. */
export class FullTestAnswerDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  result_id!: number;

  @ApiProperty()
  question_id!: number;

  @ApiProperty({ nullable: true, type: Number })
  selected_answer_id!: number | null;

  @ApiProperty({ nullable: true, type: Boolean })
  is_correct!: boolean | null;

  @ApiProperty({ nullable: true, type: Number })
  part_number!: number | null;
}
