import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { FullTestDto } from './full-test.dto';

export class SaveAnswerItemDto {
  @ApiProperty({ example: 'Apple' })
  @IsString()
  answer_text!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional({ example: 'Giải thích', nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string | null;
}

export class SaveQuestionDto {
  @ApiPropertyOptional({ example: 'What is this?', nullable: true })
  @IsOptional()
  @IsString()
  question_text?: string | null;

  @ApiPropertyOptional({ example: 'Đây là cái gì?', nullable: true })
  @IsOptional()
  @IsString()
  translation?: string | null;

  @ApiPropertyOptional({ example: 'apple, banana', nullable: true })
  @IsOptional()
  @IsString()
  dictation_keywords?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({
    example: 'multiple_choice',
    default: 'multiple_choice',
  })
  @IsOptional()
  @IsString()
  question_type?: string | null;

  @ApiProperty({ type: [SaveAnswerItemDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerItemDto)
  answers!: SaveAnswerItemDto[];
}

export class BulkDeleteQuestionsDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  question_ids!: number[];
}

export class ReorderQuestionsDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  question_ids!: number[];
}

export class QuestionImageItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  question_id!: number;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  image_url!: string | null;
}

export class SetQuestionImagesDto {
  @ApiProperty({ type: [QuestionImageItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionImageItemDto)
  items!: QuestionImageItemDto[];
}

export class PatchQuizDto {
  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url!: string | null;
}

export class SaveModuleQuizDto {
  @ApiProperty({ example: 'Mini Test Chương 1' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 10, minimum: 0 })
  @IsInt()
  @Min(0)
  total_questions!: number;

  @ApiPropertyOptional({ example: 600, minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  time_limit_seconds?: number | null;
}

export class AdminFullTestCourseDto {
  @ApiPropertyOptional({ example: 1 })
  id?: number;

  @ApiProperty({ example: 'Khóa TOEIC' })
  title!: string;
}

export class AdminFullTestDetailDto extends FullTestDto {
  @ApiPropertyOptional({ type: AdminFullTestCourseDto, nullable: true })
  courses!: AdminFullTestCourseDto | null;
}

export class UpdateFullTestDto {
  @ApiProperty({ example: 'Đề thi TOEIC 1' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Mô tả đề thi', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({ example: '2026', default: '2026' })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ example: '2026-03-29T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsString()
  release_date?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  course_id?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsInt()
  display_order?: number | null;

  @ApiPropertyOptional({ example: 200, nullable: true })
  @IsOptional()
  @IsInt()
  total_questions?: number | null;
}

export class CreateFullTestDto {
  @ApiProperty({ example: 'TOEIC Practice Test 1' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  course_id!: number;

  @ApiPropertyOptional({ example: 'Mô tả đề thi', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({ example: '2026', default: '2026' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  display_order?: number;

  @ApiPropertyOptional({ example: '2026-03-29T00:00:00.000Z', nullable: true })
  @IsOptional()
  @IsString()
  release_date?: string | null;

  @ApiPropertyOptional({ example: 200, default: 200 })
  @IsOptional()
  @IsInt()
  total_questions?: number;
}

export class AdminFullTestSectionQuizDto {
  @ApiProperty({ example: 30 })
  total_questions!: number;
}

export class AdminFullTestSectionDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  part_number!: number;

  @ApiProperty({ example: 10 })
  quiz_id!: number;

  @ApiPropertyOptional({ type: AdminFullTestSectionQuizDto, nullable: true })
  quizzes!: AdminFullTestSectionQuizDto | null;
}

export class AdminFullTestListItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'TOEIC Practice Test 1' })
  title!: string;

  @ApiPropertyOptional({ example: 'Mô tả đề thi', nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  course_id!: number | null;

  @ApiProperty({ example: '2026' })
  category!: string;

  @ApiProperty({ example: 1 })
  display_order!: number;

  @ApiPropertyOptional({ example: 200, nullable: true })
  total_questions!: number | null;

  @ApiPropertyOptional({ example: '2026-03-29T00:00:00.000Z', nullable: true })
  release_date!: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  audio_url!: string | null;

  @ApiPropertyOptional({ nullable: true })
  created_at!: string | null;

  @ApiPropertyOptional({ type: AdminFullTestCourseDto, nullable: true })
  courses!: AdminFullTestCourseDto | null;

  @ApiProperty({ type: [AdminFullTestSectionDto] })
  full_test_sections!: AdminFullTestSectionDto[];
}

export class AdminSearchVocabWordDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'abandon' })
  word!: string;

  @ApiPropertyOptional({ example: '/əˈbændən/', nullable: true })
  phonetic!: string | null;

  @ApiPropertyOptional({ example: 'từ bỏ', nullable: true })
  definition_vi!: string | null;

  @ApiPropertyOptional({ example: 'He abandoned his car.', nullable: true })
  example_sentence!: string | null;
}

export class SaveFullTestAnswerItemDto {
  @ApiPropertyOptional({ example: 123 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 'Option A' })
  @IsString()
  answer_text!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  is_correct?: boolean;

  @ApiPropertyOptional({ example: 'Giải thích', nullable: true })
  @IsOptional()
  @IsString()
  explanation?: string | null;
}

export class CreateFullTestQuestionDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 7 })
  @IsInt()
  @Min(1)
  @Max(7)
  part_number!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  display_order!: number;

  @ApiPropertyOptional({ example: 'What does the man want?', nullable: true })
  @IsOptional()
  @IsString()
  question_text?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string | null;

  @ApiPropertyOptional({ example: 'Passage text...', nullable: true })
  @IsOptional()
  @IsString()
  passage_text?: string | null;

  @ApiPropertyOptional({ example: 'group_1', nullable: true })
  @IsOptional()
  @IsString()
  group_id?: string | null;

  @ApiPropertyOptional({ example: 'Transcript text...', nullable: true })
  @IsOptional()
  @IsString()
  transcript?: string | null;

  @ApiPropertyOptional({ example: 'Dịch nghĩa...', nullable: true })
  @IsOptional()
  @IsString()
  translation?: string | null;

  @ApiProperty({ type: [SaveFullTestAnswerItemDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveFullTestAnswerItemDto)
  answers!: SaveFullTestAnswerItemDto[];
}

export class UpdateFullTestQuestionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  display_order!: number;

  @ApiPropertyOptional({ example: 'What does the man want?', nullable: true })
  @IsOptional()
  @IsString()
  question_text?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string | null;

  @ApiPropertyOptional({ example: 'Passage text...', nullable: true })
  @IsOptional()
  @IsString()
  passage_text?: string | null;

  @ApiPropertyOptional({ example: 'group_1', nullable: true })
  @IsOptional()
  @IsString()
  group_id?: string | null;

  @ApiPropertyOptional({ example: 'Transcript text...', nullable: true })
  @IsOptional()
  @IsString()
  transcript?: string | null;

  @ApiPropertyOptional({ example: 'Dịch nghĩa...', nullable: true })
  @IsOptional()
  @IsString()
  translation?: string | null;

  @ApiProperty({ type: [SaveFullTestAnswerItemDto], default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveFullTestAnswerItemDto)
  answers!: SaveFullTestAnswerItemDto[];
}

export class UpdateQuestionGroupDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  question_ids!: number[];

  @ApiPropertyOptional({ example: 'Passage text...', nullable: true })
  @IsOptional()
  @IsString()
  passage_text?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  audio_url?: string | null;

  @ApiPropertyOptional({ example: 'https://...', nullable: true })
  @IsOptional()
  @IsString()
  image_url?: string | null;

  @ApiPropertyOptional({ example: 'group_1', nullable: true })
  @IsOptional()
  @IsString()
  group_id?: string | null;
}
