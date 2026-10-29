import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BulkDeleteFullTestsDto {
  @ApiProperty({ type: [Number], description: 'Danh sách ID đề thi cần xóa' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  test_ids!: number[];
}

export class ImportQuestionAnswerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(10000)
  answer_text!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  explanation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  display_order?: number;
}

export class ImportFullTestQuestionItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  part?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  part_number?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  question_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  passage_text?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  passage?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  image_url?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  transcript?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  translation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  translation_text?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  group_id?: string | number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ type: [ImportQuestionAnswerDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionAnswerDto)
  answers?: ImportQuestionAnswerDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  options?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  correct_answer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  correct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  explanation?: string | null;
}

export class ImportFullTestQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_url?: string | null;

  @ApiProperty({ type: [ImportFullTestQuestionItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportFullTestQuestionItemDto)
  questions!: ImportFullTestQuestionItemDto[];
}

export class ExamPackageItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  exam_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_url?: string | null;

  @ApiProperty({ type: [ImportFullTestQuestionItemDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportFullTestQuestionItemDto)
  questions!: ImportFullTestQuestionItemDto[];
}

export class PackageImportFullTestsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  course_id?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  create_new_course?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  course_title?: string;

  @ApiProperty({ type: [ExamPackageItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ExamPackageItemDto)
  exams!: ExamPackageItemDto[];
}
