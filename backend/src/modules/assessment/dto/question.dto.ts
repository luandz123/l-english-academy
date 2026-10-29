import { ApiProperty } from '@nestjs/swagger';

/** Đáp án khi đang làm bài: **không** có `is_correct`, `explanation`. */
export class AnswerOptionDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  question_id!: number | null;

  @ApiProperty({ nullable: true, type: String })
  answer_text!: string | null;

  @ApiProperty()
  display_order!: number;
}

/**
 * Câu hỏi khi đang làm bài. Bỏ các cột lộ đáp án hoặc lời giải:
 * `explanation`, `transcript`, `translation`, `dictation_keywords` (QuizPage không đọc).
 */
export class QuestionDto {
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
  knowledge_tag!: string | null;

  @ApiProperty({ nullable: true, type: String })
  passage_text!: string | null;

  @ApiProperty({ nullable: true, type: String })
  group_id!: string | null;

  @ApiProperty({ type: [AnswerOptionDto] })
  answers!: AnswerOptionDto[];
}

/** Đáp án khi xem lại sau khi nộp: đủ cột như `answers(*)`. */
export class ReviewAnswerDto extends AnswerOptionDto {
  @ApiProperty({ nullable: true, type: Boolean })
  is_correct!: boolean | null;

  @ApiProperty({ nullable: true, type: String })
  explanation!: string | null;
}

/** Câu hỏi khi xem lại sau khi nộp: đủ cột như `select("*, answers(*)")`. */
export class ReviewQuestionDto {
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

  @ApiProperty({ type: [ReviewAnswerDto] })
  answers!: ReviewAnswerDto[];
}
