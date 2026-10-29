import { ApiProperty } from '@nestjs/swagger';

/** Một dòng `quizzes` (shape `select *` của Supabase). */
export class QuizDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  module_id!: number | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  total_questions!: number;

  @ApiProperty({ nullable: true, type: Number })
  time_limit_seconds!: number | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: String })
  audio_url!: string | null;

  @ApiProperty({ nullable: true, type: Boolean })
  is_free!: boolean | null;
}
