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

export class PracticeAnswerDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  question_id!: number | null;

  @ApiProperty({ nullable: true, type: String })
  answer_text!: string | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: Boolean })
  is_correct!: boolean | null;

  @ApiProperty({ nullable: true, type: String })
  explanation!: string | null;
}

export class PracticeQuestionDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  quiz_id!: number | null;

  @ApiProperty({ nullable: true, type: String })
  question_text!: string | null;

  @ApiProperty({ nullable: true, type: String })
  question_type!: string | null;

  @ApiProperty({ nullable: true, type: String })
  image_url!: string | null;

  @ApiProperty({ nullable: true, type: String })
  audio_url!: string | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: String })
  translation!: string | null;

  @ApiProperty({ nullable: true, type: String })
  dictation_keywords!: string | null;

  @ApiProperty({ nullable: true, type: String })
  explanation!: string | null;

  @ApiProperty({ nullable: true, type: String })
  transcript!: string | null;

  @ApiProperty({ nullable: true, type: String })
  knowledge_tag!: string | null;

  @ApiProperty({ nullable: true, type: String })
  passage_text!: string | null;

  @ApiProperty({ nullable: true, type: String })
  group_id!: string | null;

  @ApiProperty({ type: [PracticeAnswerDto] })
  answers!: PracticeAnswerDto[];
}
