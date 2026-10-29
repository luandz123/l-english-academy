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

export class CourseJsonAnswerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  answer_text?: string;

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

export class CourseJsonQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  part?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  question_text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  passage_text?: string | null;

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
  translation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  transcript?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  group_id?: string | number | null;

  @ApiPropertyOptional({ type: [CourseJsonAnswerDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CourseJsonAnswerDto)
  answers?: CourseJsonAnswerDto[];
}

export class CourseJsonExamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  exam_title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_url?: string | null;

  @ApiProperty({ type: [CourseJsonQuestionDto] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CourseJsonQuestionDto)
  questions!: CourseJsonQuestionDto[];
}

export class CourseJsonImportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  course_title?: string;

  @ApiProperty({ type: [CourseJsonExamDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CourseJsonExamDto)
  exams!: CourseJsonExamDto[];
}
