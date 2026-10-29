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
  Min,
  ValidateNested,
} from 'class-validator';

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

