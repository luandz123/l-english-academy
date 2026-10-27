import { ApiProperty } from '@nestjs/swagger';

/** Một dòng `lessons` (shape `select *` của Supabase). */
export class LessonDto {
  @ApiProperty({ example: 10 })
  id!: number;

  @ApiProperty({ example: 3, nullable: true, type: Number })
  module_id!: number | null;

  @ApiProperty({ example: 'Part 1 — Mô tả tranh' })
  title!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'null khi người xem không có quyền học bài này',
  })
  video_url!: string | null;

  @ApiProperty({ example: 600, nullable: true, type: Number })
  duration_seconds!: number | null;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiProperty({ nullable: true, type: Boolean })
  is_live!: boolean | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  live_time!: string | null;

  @ApiProperty({ example: 'video' })
  lesson_type!: string;

  @ApiProperty({ nullable: true, type: Number })
  quiz_id!: number | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'null khi người xem không có quyền học bài này',
  })
  pdf_url!: string | null;

  @ApiProperty({ nullable: true, type: Boolean })
  is_free!: boolean | null;

  @ApiProperty()
  is_published!: boolean;
}
