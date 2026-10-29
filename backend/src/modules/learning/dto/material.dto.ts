import { ApiProperty } from '@nestjs/swagger';

/** Một dòng `materials` (shape `select *` của Supabase). */
export class MaterialDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  lesson_id!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  quiz_id!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  course_id!: number | null;

  @ApiProperty({ example: 'Từ vựng Part 1.pdf' })
  title!: string;

  @ApiProperty()
  file_url!: string;

  @ApiProperty({ example: 'pdf', nullable: true, type: String })
  file_type!: string | null;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  created_at!: string | null;

  @ApiProperty({ example: '/', nullable: true, type: String })
  folder_path!: string | null;
}
