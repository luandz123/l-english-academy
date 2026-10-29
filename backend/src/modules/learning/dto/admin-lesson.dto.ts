import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const LESSON_TYPES = ['video', 'practice', 'exam', 'dictation'] as const;

export type LessonType = (typeof LESSON_TYPES)[number];

export class SaveLessonDto {
  @ApiProperty({ example: 'Bài 1: Giới thiệu TOEIC' })
  @IsString()
  title!: string;

  @ApiProperty({ enum: LESSON_TYPES, example: 'video' })
  @IsIn(LESSON_TYPES)
  lesson_type!: LessonType;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  video_url?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  pdf_url?: string | null;

  @ApiProperty({ example: 600, minimum: 0 })
  @IsInt()
  @Min(0)
  duration_seconds!: number;
}

export class PatchLessonDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  is_free?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class ReorderLessonsDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  lesson_ids!: number[];
}
