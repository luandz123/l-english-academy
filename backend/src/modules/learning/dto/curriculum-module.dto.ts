import { ApiProperty } from '@nestjs/swagger';
import { LessonDto } from './lesson.dto';

/** Một dòng `modules` kèm `lessons` (shape `select *, lessons(*)` của Supabase). */
export class CurriculumModuleDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 1, nullable: true, type: Number })
  course_id!: number | null;

  @ApiProperty({ example: 'Chương 1: Listening' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiProperty({ nullable: true, type: Boolean })
  is_free!: boolean | null;

  @ApiProperty()
  is_published!: boolean;

  @ApiProperty({ type: [LessonDto] })
  lessons!: LessonDto[];
}
