import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

/** Một dòng `modules` (shape `select *` của Supabase). */
export class ModuleDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 1, nullable: true, type: Number })
  course_id!: number | null;

  @ApiProperty({ example: 'Chương 1: Listening' })
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ example: 0 })
  display_order!: number;

  @ApiProperty({ nullable: true, type: Boolean })
  is_free!: boolean | null;

  @ApiProperty()
  is_published!: boolean;
}

/** Một dòng `lessons` đầy đủ trả cho admin trong cây chương (`select *, lessons(*)`). */
export class AdminModuleLessonDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  module_id!: number | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true, type: String })
  video_url!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  duration_seconds!: number | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: Boolean })
  is_live!: boolean | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  live_time!: string | null;

  @ApiProperty()
  lesson_type!: string;

  @ApiProperty({ nullable: true, type: Number })
  quiz_id!: number | null;

  @ApiProperty({ nullable: true, type: String })
  pdf_url!: string | null;

  @ApiProperty({ nullable: true, type: Boolean })
  is_free!: boolean | null;

  @ApiProperty()
  is_published!: boolean;
}

/** Một dòng `quizzes` đầy đủ trả cho admin trong cây chương (`select *, quizzes(*)`). */
export class AdminModuleQuizDto {
  @ApiProperty()
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

/** Một dòng `modules` kèm `lessons` và `quizzes` đầy đủ cho admin (ADM-010). */
export class AdminModuleDto extends ModuleDto {
  @ApiProperty({ type: [AdminModuleLessonDto] })
  lessons!: AdminModuleLessonDto[];

  @ApiProperty({ type: [AdminModuleQuizDto] })
  quizzes!: AdminModuleQuizDto[];
}

/**
 * Tạo/sửa chương (ADM-010). Server tự tính `display_order` và nhận `course_id` từ URL;
 * client gửi `display_order` hay `course_id` trong body sẽ bị `forbidNonWhitelisted` chặn (400).
 */
export class SaveModuleDto {
  @ApiProperty({ example: 'Part 1: Photographs' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_free!: boolean;
}

export class PatchModuleDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  is_free?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class ReorderModulesDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  module_ids!: number[];
}

export class SetFreeModuleDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  module_id!: number;
}
