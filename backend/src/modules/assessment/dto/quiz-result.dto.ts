import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Một dòng `user_quiz_results`. `score` là numeric → number như PostgREST. */
export class QuizResultDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty()
  quiz_id!: number;

  @ApiProperty({ nullable: true, type: Number, example: 6.67 })
  score!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  correct_answers!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  total_questions!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  time_spent_seconds!: number | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  completed_at!: string | null;
}

/** Bọc trong object vì Nest trả body rỗng khi handler trả `null`. */
export class LatestQuizResultResponseDto {
  @ApiProperty({ type: QuizResultDto, nullable: true })
  result!: QuizResultDto | null;
}

/** Một dòng `user_answers`. */
export class UserAnswerDto {
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
}

export class SubmitAnswerItemDto {
  @ApiProperty()
  @IsInt()
  question_id!: number;

  @ApiProperty({ nullable: true, type: Number, description: 'null = bỏ trống' })
  @IsOptional()
  @IsInt()
  selected_answer_id!: number | null;
}

/**
 * Client chỉ gửi đáp án đã chọn và thời gian làm bài. Điểm, số câu đúng, tổng số câu,
 * `is_correct` do server tính (AGENTS.md luật 5).
 */
export class SubmitQuizDto {
  @ApiProperty({ type: [SubmitAnswerItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers!: SubmitAnswerItemDto[];

  @ApiProperty({
    description: 'Giây, tối thiểu 1 (như client cũ)',
    example: 245,
  })
  @IsInt()
  @Min(1)
  @Max(24 * 3600)
  time_spent_seconds!: number;
}

export class SubmitQuizResponseDto {
  @ApiProperty({ type: QuizResultDto })
  result!: QuizResultDto;

  @ApiProperty({
    description:
      'Đây là lần nộp đầu tiên của người dùng cho quiz này (thay truy vấn đếm ở QuizPage.tsx:329)',
  })
  is_first_attempt!: boolean;
}
