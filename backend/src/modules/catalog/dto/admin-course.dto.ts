import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { COURSE_TYPES } from './list-courses-query.dto';

export class SaveCourseDto {
  @ApiProperty({ example: 'Khóa học TOEIC 450+' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    example: 'Dành cho người mới bắt đầu',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @ApiPropertyOptional({ example: 'Mô tả chi tiết...', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Cô Mai Phương', nullable: true })
  @IsOptional()
  @IsString()
  instructor?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  thumbnail_url?: string | null;

  @ApiProperty({ example: 'video_quiz', enum: COURSE_TYPES })
  @IsIn(COURSE_TYPES, { message: 'course_type không hợp lệ' })
  course_type!: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  category_id?: number | null;

  @ApiProperty({ example: 499000 })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_free!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_active!: boolean;

  @ApiPropertyOptional({ example: 6, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration_months?: number | null;

  @ApiProperty({ example: 0 })
  @IsInt()
  display_order!: number;
}

export class PatchCourseDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_free?: boolean;
}

export class SaveCategoryDto {
  @ApiProperty({ example: 'TOEIC Căn Bản' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'toeic-can-ban' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiProperty({ example: 'BookOpen' })
  @IsString()
  icon!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  display_order!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_active!: boolean;
}
