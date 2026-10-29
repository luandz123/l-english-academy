import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class MaterialCourseDto {
  @ApiProperty()
  title!: string;
}

export class AdminMaterialDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ nullable: true, type: Number })
  lesson_id!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  quiz_id!: number | null;

  @ApiProperty({ nullable: true, type: Number })
  course_id!: number | null;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  file_url!: string;

  @ApiProperty({ nullable: true, type: String })
  file_type!: string | null;

  @ApiProperty()
  display_order!: number;

  @ApiProperty({ nullable: true, type: String })
  created_at!: string | null;

  @ApiProperty({ nullable: true, type: String })
  folder_path!: string | null;

  @ApiProperty({ nullable: true, type: MaterialCourseDto })
  courses!: MaterialCourseDto | null;
}

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  file_url!: string;

  @ApiPropertyOptional({ default: 'pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  file_type?: string;

  @ApiPropertyOptional({ default: '/' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  folder_path?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  course_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  lesson_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  quiz_id?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  display_order?: number;
}

export class ListMaterialsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  course_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folder_path?: string;
}

export class RenameFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  old_path!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  new_path!: string;
}

export class DeleteFolderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  folder_path!: string;
}

