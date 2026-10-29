import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, Min } from 'class-validator';
import { QuizDto } from './quiz.dto';
import { ReviewQuestionDto } from './question.dto';

export class DictationQuizDetailDto {
  @ApiProperty({ type: QuizDto })
  quiz!: QuizDto;

  @ApiProperty({ type: [ReviewQuestionDto] })
  questions!: ReviewQuestionDto[];
}

export class DictationLessonDto {
  @ApiProperty({ example: 42 })
  id!: number;
}

export class DictationUserAnswerDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  question_id!: number;

  @ApiPropertyOptional({ nullable: true, example: true })
  is_correct!: boolean | null;

  @ApiProperty({ example: 5 })
  result_id!: number;
}

export class DictationProgressResponseDto {
  @ApiProperty({ example: 3 })
  score!: number;

  @ApiProperty({ example: 3 })
  correct_answers!: number;

  @ApiProperty({ example: 10 })
  total_questions!: number;
}

export class SyncDictationDto {
  @ApiProperty({ example: [10, 11, 12], type: [Number] })
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  @Min(1, { each: true })
  question_ids!: number[];
}
