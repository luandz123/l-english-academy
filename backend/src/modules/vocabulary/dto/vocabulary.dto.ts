import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { toOptionalBoolean } from '../../../common/transforms/to-optional-boolean';
import { LEVELS, RATINGS } from '../vocab-rules';

export const SOURCES = [
  'pack',
  'toeic600',
  'listening',
  'reading',
  'manual',
] as const;
export const STATES = ['new', 'learning', 'review', 'mastered'] as const;

const csv = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const arr: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [value];
  return arr
    .map((v) => (typeof v === 'string' ? v.trim() : v))
    .filter((v) => v !== '');
};
const csvInt = ({ value }: { value: unknown }): unknown => {
  const arr = csv({ value });
  return Array.isArray(arr) ? arr.map((v) => Number(v)) : arr;
};

export class LookupQueryDto {
  @ApiProperty({ description: 'Từ hoặc cụm từ cần tra' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  word!: string;
}

export class NotebookQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) q?: string;

  @ApiPropertyOptional({ enum: SOURCES, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsIn([...SOURCES], { each: true })
  sources?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(csvInt)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];

  @ApiPropertyOptional({ enum: LEVELS, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsIn([...LEVELS], { each: true })
  levels?: string[];

  @ApiPropertyOptional({ enum: STATES, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsIn([...STATES], { each: true })
  states?: string[];

  @ApiPropertyOptional({ description: 'Chỉ từ đến hạn ôn' })
  @IsOptional()
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    toOptionalBoolean(obj[key]),
  )
  @IsBoolean()
  due?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class EntriesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) q?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(csvInt)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];

  @ApiPropertyOptional({ enum: LEVELS, isArray: true })
  @IsOptional()
  @Transform(csv)
  @IsArray()
  @IsIn([...LEVELS], { each: true })
  levels?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
  @ApiPropertyOptional({ default: 40 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class SaveWordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) word!: string;

  @ApiPropertyOptional({
    description: 'Bắt buộc khi kho không có nghĩa của từ',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  definition_vi?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phonetic?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  definition_en?: string;

  @ApiPropertyOptional({
    description: 'Câu ngữ cảnh (từ transcript / đoạn văn)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  example?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ enum: SOURCES }) @IsIn([...SOURCES]) source!: string;

  @ApiPropertyOptional({ description: 'vd. id câu hỏi nguồn' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source_ref?: string;
}

export class SaveBatchDto {
  @ApiPropertyOptional({
    type: [Number],
    description: 'Từ trong kho (600 từ TOEIC, từ theo Part/cấp độ)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @IsInt({ each: true })
  entry_ids?: number[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Từ trong bộ flashcard (vocab_questions)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(600)
  @IsInt({ each: true })
  pack_word_ids?: number[];
}

export class UpdateWordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  definition_vi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phonetic?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  example?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ReviewDto {
  @ApiProperty({ enum: RATINGS }) @IsIn([...RATINGS]) rating!: string;
}

export class SettingsDto {
  @ApiProperty({
    minimum: 0,
    maximum: 100,
    description: 'Số từ mới tối đa mỗi ngày',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  new_per_day!: number;
}

export class UpdateEntryDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(7)
  part?: number | null;

  @ApiPropertyOptional({ enum: LEVELS })
  @IsOptional()
  @IsIn([...LEVELS])
  level?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  definition_vi?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phonetic?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  example?: string;
}

export class CreateEntryDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(60) word!: string;
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  definition_vi!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  phonetic?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  example?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(7) part?: number;
  @ApiPropertyOptional({ enum: LEVELS })
  @IsOptional()
  @IsIn([...LEVELS])
  level?: string;
}

// ---------- Response ----------

export class WordDto {
  @ApiProperty() id!: number;
  @ApiProperty() word!: string;
  @ApiProperty({ nullable: true, type: String }) phonetic!: string | null;
  @ApiProperty({ nullable: true, type: String }) definition_vi!: string | null;
  @ApiProperty({ nullable: true, type: String }) definition_en!: string | null;
  @ApiProperty({ nullable: true, type: String }) example!: string | null;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty({ enum: SOURCES }) source!: string;
  @ApiProperty({ nullable: true, type: Number }) part!: number | null;
  @ApiProperty({ nullable: true, type: String }) level!: string | null;
  @ApiProperty({ enum: STATES }) state!: string;
  @ApiProperty({ nullable: true, type: String }) due_at!: string | null;
  @ApiProperty() interval_days!: number;
  @ApiProperty() lapses!: number;
  @ApiProperty() created_at!: string;
}

export class SaveResultDto {
  @ApiProperty({ type: WordDto }) word!: WordDto;
  @ApiProperty({ description: 'true = từ đã có trong sổ (không tạo trùng)' })
  already!: boolean;
}

export class LookupDto {
  @ApiProperty() word!: string;
  @ApiProperty({
    type: 'object',
    nullable: true,
    additionalProperties: true,
    description:
      'Kết quả trong kho (600 từ / bộ flashcard); null = không có, học viên tự nhập nghĩa',
  })
  found!: unknown;
  @ApiProperty({ type: WordDto, nullable: true }) saved!: WordDto | null;
}

export class CardDto extends WordDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Khoảng cách sẽ có cho từng nút',
  })
  intervals!: Record<string, string>;
}

export class QueueDto {
  @ApiProperty({ type: [CardDto] }) cards!: CardDto[];
  @ApiProperty() due!: number;
  @ApiProperty() new_today!: number;
  @ApiProperty() new_per_day!: number;
}

export class SummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() due!: number;
  @ApiProperty({ description: 'Số từ mới còn được học hôm nay' })
  new_available!: number;
  @ApiProperty() new_count!: number;
  @ApiProperty() learning!: number;
  @ApiProperty() review!: number;
  @ApiProperty() mastered!: number;
  @ApiProperty() reviewed_today!: number;
  @ApiProperty() new_per_day!: number;
}

export class EntryDto {
  @ApiProperty() id!: number;
  @ApiProperty() word!: string;
  @ApiProperty({ nullable: true, type: String }) phonetic!: string | null;
  @ApiProperty({ nullable: true, type: String }) definition_vi!: string | null;
  @ApiProperty({ nullable: true, type: String }) example!: string | null;
  @ApiProperty({ nullable: true, type: Number }) part!: number | null;
  @ApiProperty({ nullable: true, type: String }) level!: string | null;
  @ApiProperty() frequency!: number;
  @ApiProperty({ nullable: true, type: String }) tag_source!: string | null;
  @ApiProperty() saved!: boolean;
}

export class EntryListDto {
  @ApiProperty({ type: [EntryDto] }) items!: EntryDto[];
  @ApiProperty() total!: number;
  @ApiProperty({ type: 'array', items: { type: 'object' } }) facets!: unknown[];
}

export class NotebookListDto {
  @ApiProperty({ type: [WordDto] }) items!: WordDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}
