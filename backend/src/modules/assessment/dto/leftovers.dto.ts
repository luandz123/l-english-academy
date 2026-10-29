import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class StudyTimeLeaderboardItemDto {
  @ApiProperty({ description: 'UUID của học viên' })
  user_id!: string;

  @ApiProperty({ description: 'Tổng thời gian học tập (giây)' })
  total_seconds!: number;
}

export class AssessmentStatsOverviewDto {
  @ApiProperty({ description: 'Tổng số câu hỏi trên hệ thống' })
  total_questions!: number;

  @ApiProperty({ description: 'Tổng số câu hỏi Listening' })
  listening_questions!: number;

  @ApiProperty({ description: 'Tổng số câu hỏi Reading' })
  reading_questions!: number;

  @ApiProperty({ description: 'Tổng số đề thi Full Test' })
  total_full_tests!: number;

  @ApiProperty({ description: 'Tổng số học viên' })
  total_users!: number;

  @ApiProperty({ description: 'Tổng số khóa học' })
  total_courses!: number;
}

export class VocabPoolItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  word!: string;

  @ApiPropertyOptional({ nullable: true })
  phonetic!: string | null;

  @ApiPropertyOptional({ nullable: true })
  definition_vi!: string | null;

  @ApiPropertyOptional({ nullable: true })
  audio_male_url!: string | null;
}

export class SaveVocabWordDto {
  @ApiProperty({ description: 'Từ tiếng Anh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  word!: string;

  @ApiPropertyOptional({ description: 'Phiên âm IPA' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  phonetic?: string | null;

  @ApiPropertyOptional({ description: 'Nghĩa tiếng Việt' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition_vi?: string | null;

  @ApiPropertyOptional({ description: 'Nghĩa tiếng Anh' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  definition_en?: string | null;

  @ApiPropertyOptional({ description: 'URL audio nam' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_male_url?: string | null;

  @ApiPropertyOptional({ description: 'Câu ví dụ' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  example_sentence?: string | null;

  @ApiPropertyOptional({ description: 'URL hình ảnh' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  image_url?: string | null;

  @ApiPropertyOptional({ description: 'URL audio nữ' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  audio_female_url?: string | null;

  @ApiPropertyOptional({ description: 'ID câu hỏi liên kết' })
  @IsOptional()
  @IsInt()
  question_id?: number | null;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt()
  display_order?: number;
}

export class CreateVocabWordsBatchDto {
  @ApiProperty({ type: [SaveVocabWordDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SaveVocabWordDto)
  words!: SaveVocabWordDto[];
}

export class BulkDeleteVocabWordsDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  ids!: number[];
}

export class CreateLessonVocabQuizDto {
  @ApiProperty({ description: 'Tiêu đề quiz từ vựng' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị' })
  @IsOptional()
  @IsInt()
  display_order?: number;
}
