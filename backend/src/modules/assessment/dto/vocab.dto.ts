import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VocabCategoryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ nullable: true, example: 2 })
  course_id!: number | null;

  @ApiProperty({ example: 'Từ vựng Cơ bản 1' })
  title!: string;

  @ApiProperty({ example: 1 })
  display_order!: number;
}

export class VocabQuizDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  category_id!: number | null;

  @ApiProperty({ example: 'Day 1: Office Routine' })
  title!: string;

  @ApiProperty({ example: 10 })
  total_questions!: number;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiPropertyOptional({ nullable: true, example: 5 })
  lesson_id!: number | null;
}

export class VocabWordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ nullable: true, example: 1 })
  vocab_quiz_id!: number | null;

  @ApiProperty({ example: 'agenda' })
  word!: string;

  @ApiPropertyOptional({ nullable: true, example: '/əˈdʒen.də/' })
  phonetic!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'a list of matters to be discussed at a meeting',
  })
  definition_en!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'chương trình nghị sự, lịch trình',
  })
  definition_vi!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'The next item on the agenda is the budget.',
  })
  example_sentence!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://example.com/img.jpg',
  })
  image_url!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://example.com/male.mp3',
  })
  audio_male_url!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 'https://example.com/female.mp3',
  })
  audio_female_url!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'calendar' })
  wrong_answer_1!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'schedule' })
  wrong_answer_2!: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'timetable' })
  wrong_answer_3!: string | null;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiPropertyOptional({ nullable: true, example: 42 })
  question_id!: number | null;
}

export class LessonQuizSummaryDto {
  @ApiPropertyOptional({ nullable: true, example: 10 })
  quiz_id!: number | null;
}

export class LessonQuizIdResponseDto {
  @ApiPropertyOptional({
    type: () => LessonQuizSummaryDto,
    nullable: true,
  })
  lesson!: LessonQuizSummaryDto | null;
}
