import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ImportQuizQuestionAnswerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;

  @ApiProperty()
  @IsBoolean()
  is_correct!: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string | null;
}

export class ImportQuizQuestionItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(5000)
  question_text!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  question_type!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  translation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dictation_keywords?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  audio_url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  image_url?: string | null;

  @ApiProperty({ type: [ImportQuizQuestionAnswerDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ImportQuizQuestionAnswerDto)
  answers!: ImportQuizQuestionAnswerDto[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  vocab_text?: string | null;
}

export class ImportQuizQuestionsDto {
  @ApiProperty({ type: [ImportQuizQuestionItemDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ImportQuizQuestionItemDto)
  questions!: ImportQuizQuestionItemDto[];

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  effective_lesson_id?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  quiz_title?: string | null;
}

export class ImportQuizQuestionsResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  count!: number;
}
