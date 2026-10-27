import { ApiProperty } from '@nestjs/swagger';

export class PracticeQuizDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  total_questions!: number;
}

export class PracticeDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  lesson_id!: number;

  @ApiProperty({ nullable: true })
  quiz_id!: number | null;

  @ApiProperty()
  trigger_at_seconds!: number;

  @ApiProperty({ nullable: true })
  title!: string | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true })
  created_at!: string | null;

  @ApiProperty({ type: PracticeQuizDto, nullable: true })
  quizzes!: PracticeQuizDto | null;
}
