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
  ValidateIf,
} from 'class-validator';

export const EXAM_TYPES = ['full', 'mini', 'practice_set'] as const;
export const EXAM_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const EXAM_SKILLS = ['listening', 'reading', 'full'] as const;
export const EXAM_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const;
export const EXAM_SORTS = [
  'newest',
  'popular',
  'difficulty',
  'attempts',
] as const;
export const VERIFICATION_STATUSES = [
  'unverified',
  'verified',
  'needs_review',
] as const;
export const REPORT_REASONS = [
  'wrong_answer',
  'bad_explanation',
  'audio_problem',
  'display_problem',
  'missing_content',
  'duplicate',
  'other',
] as const;
export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;

/** 9 mục kiểm duyệt (E06 §6.2) — thứ tự cố định, client gửi mảng 9 boolean. */
export const VERIFICATION_CHECKLIST = [
  'Đủ số lượng câu hỏi theo cấu trúc đã công bố',
  'Nội dung câu hỏi rõ ràng, không bị lỗi hiển thị',
  'Các lựa chọn trả lời đầy đủ',
  'Đáp án chính xác đã được kiểm tra',
  'Giải thích đáp án hợp lý và không mâu thuẫn',
  'Audio nghe được, đúng nội dung và không bị lỗi',
  'Passage và câu hỏi liên kết chính xác',
  'Không có câu hỏi trùng lặp ngoài dự kiến',
  'Thời gian và độ khó được đánh giá phù hợp',
];

const toStrArray = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const arr: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [value];
  return arr
    .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)).trim())
    .filter(Boolean);
};
const toIntArray = ({ value }: { value: unknown }): unknown => {
  const arr = toStrArray({ value });
  return Array.isArray(arr) ? arr.map((v) => Number(v)) : arr;
};

export class ExamLibraryQueryDto {
  @ApiPropertyOptional({ description: 'Tìm theo tên hoặc mã đề (id)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    type: [String],
    description: "Năm, hoặc 'older' = các năm trước 2024",
  })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  years?: string[];

  @ApiPropertyOptional({ enum: EXAM_DIFFICULTIES, isArray: true })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsIn([...EXAM_DIFFICULTIES], { each: true })
  difficulties?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @ApiPropertyOptional({ enum: EXAM_TYPES, isArray: true })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsIn([...EXAM_TYPES], { each: true })
  types?: string[];

  @ApiPropertyOptional({ enum: EXAM_SKILLS, isArray: true })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsIn([...EXAM_SKILLS], { each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];

  @ApiPropertyOptional({ enum: EXAM_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsIn([...EXAM_STATUSES], { each: true })
  statuses?: string[];

  @ApiPropertyOptional({ enum: ['free', 'premium'] })
  @IsOptional()
  @IsIn(['free', 'premium'])
  access?: 'free' | 'premium';

  @ApiPropertyOptional({ enum: ['verified', 'unverified'] })
  @IsOptional()
  @IsIn(['verified', 'unverified'])
  verified?: 'verified' | 'unverified';

  @ApiPropertyOptional({ enum: EXAM_SORTS, default: 'newest' })
  @IsOptional()
  @IsIn([...EXAM_SORTS])
  sort?: (typeof EXAM_SORTS)[number];
}

export class FavoritesQueryDto {
  @ApiPropertyOptional({ enum: EXAM_SKILLS })
  @IsOptional()
  @IsIn([...EXAM_SKILLS])
  skill?: (typeof EXAM_SKILLS)[number];
}

export class CreateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  test_id?: number;

  @ApiPropertyOptional()
  @ValidateIf(
    (o: CreateReportDto) =>
      o.test_id === undefined || o.question_id !== undefined,
  )
  @IsInt()
  question_id?: number;

  @ApiProperty({ enum: REPORT_REASONS })
  @IsIn([...REPORT_REASONS])
  reason!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class UpdateExamMetaDto {
  @ApiPropertyOptional({ nullable: true, minimum: 2000, maximum: 2100 })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number | null;

  @ApiPropertyOptional({ enum: EXAM_DIFFICULTIES, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsIn([...EXAM_DIFFICULTIES])
  difficulty?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  topics?: string[];

  @ApiPropertyOptional({ enum: EXAM_TYPES })
  @IsOptional()
  @IsIn([...EXAM_TYPES])
  test_type?: string;

  @ApiPropertyOptional({ nullable: true, minimum: 1, maximum: 300 })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  @Min(1)
  @Max(300)
  duration_minutes?: number | null;
}

export class UpdateVerificationDto {
  @ApiProperty({
    type: [Boolean],
    description: '9 mục checklist theo thứ tự VERIFICATION_CHECKLIST',
  })
  @IsArray()
  @ArrayMaxSize(9)
  @IsBoolean({ each: true })
  checklist!: boolean[];

  @ApiProperty({
    description: 'true = xác minh (cần đủ 9 mục); false = bỏ xác minh',
  })
  @IsBoolean()
  verified!: boolean;
}

export class UpdateQuestionTagsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(40)
  passage_type?: string | null;

  @ApiPropertyOptional({ enum: EXAM_DIFFICULTIES })
  @IsOptional()
  @IsIn([...EXAM_DIFFICULTIES])
  difficulty?: string;
}

export class AdminQuestionsQueryDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  test_id!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  part?: number;
}

export class RetagDto {
  @ApiPropertyOptional({ description: 'Bỏ trống = mọi đề' })
  @IsOptional()
  @IsInt()
  test_id?: number;
}

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_STATUSES })
  @IsOptional()
  @IsIn([...REPORT_STATUSES])
  status?: string;
}

export class UpdateReportDto {
  @ApiProperty({ enum: REPORT_STATUSES })
  @IsIn([...REPORT_STATUSES])
  status!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  admin_note?: string;
}

// ---------------- Responses ----------------

export class ExamCardDto {
  @ApiProperty() id!: number;
  @ApiProperty() code!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: Number }) course_id!: number | null;
  @ApiProperty({ nullable: true, type: Number }) year!: number | null;
  @ApiProperty({ nullable: true, type: String }) difficulty!: string | null;
  @ApiProperty({ type: [String] }) topics!: string[];
  @ApiProperty({ enum: EXAM_TYPES }) test_type!: string;
  @ApiProperty({ enum: EXAM_SKILLS }) skill!: string;
  @ApiProperty({ type: [Number] }) parts!: number[];
  @ApiProperty() duration_minutes!: number;
  @ApiProperty() total_questions!: number;
  @ApiProperty({ description: 'Số lượt làm thật (user_full_test_results)' })
  attempts!: number;
  @ApiProperty() is_free!: boolean;
  @ApiProperty({ description: 'Học viên hiện tại có quyền làm' })
  accessible!: boolean;
  @ApiProperty() released!: boolean;
  @ApiProperty({ nullable: true, type: String }) release_date!: string | null;
  @ApiProperty({ enum: VERIFICATION_STATUSES }) verification_status!: string;
  @ApiProperty({ nullable: true, type: String }) verified_at!: string | null;
  @ApiProperty({ enum: EXAM_STATUSES }) user_status!: string;
  @ApiProperty({ nullable: true, type: Number }) best_score!: number | null;
  @ApiProperty() favorited!: boolean;
  @ApiProperty({ nullable: true, type: String }) created_at!: string | null;
}

export class FacetDto {
  @ApiProperty() value!: string;
  @ApiProperty() count!: number;
}

export class ExamLibraryDto {
  @ApiProperty({ type: [ExamCardDto] }) items!: ExamCardDto[];
  @ApiProperty() total!: number;
  @ApiProperty({ description: 'Tổng số đề (chưa lọc)' }) total_all!: number;
  @ApiProperty({
    description:
      'Số đề theo từng giá trị bộ lọc (tính trên toàn thư viện) — ẩn lựa chọn không có đề',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'object',
        properties: { value: { type: 'string' }, count: { type: 'number' } },
      },
    },
  })
  facets!: Record<string, FacetDto[]>;
}

export class FavoriteExamDto {
  @ApiProperty() test_id!: number;
  @ApiProperty() title!: string;
  @ApiProperty() favorited_at!: string;
  @ApiProperty({ description: 'false = đề đã bị xóa / không còn khả dụng' })
  available!: boolean;
  @ApiProperty({ type: ExamCardDto, nullable: true }) exam!: ExamCardDto | null;
}

export class FavoriteStateDto {
  @ApiProperty() test_id!: number;
  @ApiProperty() favorited!: boolean;
}

export class ReportDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: Number }) test_id!: number | null;
  @ApiProperty({ nullable: true, type: String }) test_title!: string | null;
  @ApiProperty({ nullable: true, type: Number }) question_id!: number | null;
  @ApiProperty() reason!: string;
  @ApiProperty({ nullable: true, type: String }) message!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String }) admin_note!: string | null;
  @ApiProperty({ nullable: true, type: String }) reporter_email!: string | null;
  @ApiProperty() created_at!: string;
  @ApiProperty({ nullable: true, type: String }) resolved_at!: string | null;
}

export class AdminExamDto extends ExamCardDto {
  @ApiProperty({ type: [Boolean] }) checklist!: boolean[];
  @ApiProperty({ type: [String] }) checklist_labels!: string[];
  @ApiProperty({ nullable: true, type: String }) content_changed_at!:
    string | null;
  @ApiProperty() open_reports!: number;
  @ApiProperty() tagged_questions!: number;
  @ApiProperty() eligible_questions!: number;
}

export class AdminQuestionTagDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: Number }) part!: number | null;
  @ApiProperty({ nullable: true, type: Number }) part_index!: number | null;
  @ApiProperty({ nullable: true, type: String }) text!: string | null;
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({ nullable: true, type: String }) passage_type!: string | null;
  @ApiProperty({ nullable: true, type: String }) difficulty!: string | null;
  @ApiProperty() practice_eligible!: boolean;
  @ApiProperty({ nullable: true, type: String }) tag_source!: string | null;
}

export class RetagResultDto {
  @ApiProperty() tagged!: number;
}
