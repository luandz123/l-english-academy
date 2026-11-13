import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { toOptionalBoolean } from '../../../common/transforms/to-optional-boolean';

export const SESSION_KINDS = [
  'question_type',
  'mini_test',
  'mistakes',
  'retry',
  'questions',
] as const;
export const DIFFICULTY_FILTERS = ['all', 'easy', 'medium', 'hard'] as const;
export const MODES = ['practice', 'test'] as const;
export const FEEDBACKS = ['immediate', 'end'] as const;
export const ORDERS = ['random', 'sequential'] as const;
export const MISTAKE_STATUSES = ['not_reviewed', 'improving', 'fixed'] as const;
export const SKILLS = ['listening', 'reading'] as const;

const toIntArray = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  const arr: unknown[] = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [value];
  return arr.map((v) =>
    typeof v === 'number' ? v : Number(typeof v === 'string' ? v.trim() : NaN),
  );
};
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

// ---------------- Requests ----------------

export class MistakeFilterDto {
  @ApiPropertyOptional({ enum: SKILLS })
  @IsOptional()
  @IsIn([...SKILLS])
  skill?: (typeof SKILLS)[number];

  @ApiPropertyOptional({ type: [Number], description: 'Lọc theo Part (1–7)' })
  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];

  @ApiPropertyOptional({ type: [String], description: 'Dạng câu hỏi (key)' })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  categories?: string[];

  @ApiPropertyOptional({ enum: MISTAKE_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toStrArray)
  @IsArray()
  @IsIn([...MISTAKE_STATUSES], { each: true })
  statuses?: string[];

  @ApiPropertyOptional({
    description: 'Chỉ câu sai trong N ngày gần đây',
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recent_days?: number;

  @ApiPropertyOptional({
    description: 'Sai ít nhất N lần',
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  min_wrong?: number;

  @ApiPropertyOptional({ description: 'Chỉ câu đã bookmark' })
  @IsOptional()
  @Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
    toOptionalBoolean(obj[key]),
  )
  @IsBoolean()
  bookmarked?: boolean;
}

export class ListMistakesQueryDto extends MistakeFilterDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateSessionDto {
  @ApiProperty({
    enum: SESSION_KINDS,
    description:
      'question_type: luyện theo dạng câu; mini_test: Mini Test; mistakes: luyện câu sai; retry: luyện lại câu sai/bỏ trống của một lượt',
  })
  @IsIn([...SESSION_KINDS])
  kind!: (typeof SESSION_KINDS)[number];

  @ApiPropertyOptional({
    enum: SKILLS,
    description: 'Mini Test theo kỹ năng (bỏ trống nếu chọn Part)',
  })
  @IsOptional()
  @IsIn([...SKILLS])
  skill?: (typeof SKILLS)[number];

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Part (question_type: đúng 1 Part; mini_test: 1 Part hoặc bỏ trống)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Dạng câu hỏi đã chọn (question_type)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Loại văn bản Part 7' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  passage_types?: string[];

  @ApiPropertyOptional({ enum: DIFFICULTY_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn([...DIFFICULTY_FILTERS])
  difficulty?: (typeof DIFFICULTY_FILTERS)[number];

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    description: 'Số câu (bỏ trống với retry/mistakes = tất cả, tối đa 100)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  count?: number;

  @ApiProperty({ enum: MODES })
  @IsIn([...MODES])
  mode!: (typeof MODES)[number];

  @ApiPropertyOptional({
    enum: FEEDBACKS,
    description: 'Chế độ practice: xem giải thích sau mỗi câu hay khi nộp bài',
  })
  @IsOptional()
  @IsIn([...FEEDBACKS])
  feedback?: (typeof FEEDBACKS)[number];

  @ApiPropertyOptional({ enum: ORDERS, default: 'random' })
  @IsOptional()
  @IsIn([...ORDERS])
  order?: (typeof ORDERS)[number];

  @ApiPropertyOptional({
    description:
      'Giới hạn giờ (phút). Bỏ trống = tự động theo số câu (chế độ test); 0 = không bấm giờ',
    minimum: 0,
    maximum: 180,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  time_limit_minutes?: number;

  @ApiPropertyOptional({
    description:
      'question_type: chỉ lấy câu học viên chưa từng làm (nút "Luyện 10 câu dạng này")',
  })
  @IsOptional()
  @IsBoolean()
  unseen_only?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'questions: luyện lại đúng các câu này (vd. "Sai cả hai lần" ở So sánh đề); câu không có quyền bị bỏ',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  question_ids?: number[];

  @ApiPropertyOptional({ description: 'retry: lượt luyện nguồn' })
  @IsOptional()
  @IsUUID()
  source_session_id?: string;

  @ApiPropertyOptional({
    type: MistakeFilterDto,
    description: 'mistakes: bộ lọc câu sai',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => MistakeFilterDto)
  mistake_filter?: MistakeFilterDto;
}

export class SaveAnswerDto {
  @ApiProperty()
  @IsInt()
  question_id!: number;

  @ApiPropertyOptional({ nullable: true, description: 'null = bỏ chọn' })
  @IsOptional()
  @IsInt()
  selected_answer_id?: number | null;
}

export class BookmarkBatchDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  question_ids!: number[];
}

export class ListSessionsQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

// ---------------- Responses ----------------

export class CatalogCategoryDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() description!: string;
}

export class CatalogPartDto {
  @ApiProperty() part!: number;
  @ApiProperty({ enum: SKILLS }) skill!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [CatalogCategoryDto] })
  categories!: CatalogCategoryDto[];
}

export class CatalogCountDto {
  @ApiProperty() part!: number;
  @ApiProperty() category!: string;
  @ApiProperty({ nullable: true, type: String }) passage_type!: string | null;
  @ApiProperty() difficulty!: string;
  @ApiProperty() count!: number;
}

export class PracticeCatalogDto {
  @ApiProperty({ type: [CatalogPartDto] }) parts!: CatalogPartDto[];
  @ApiProperty({ type: [CatalogCategoryDto] })
  passage_types!: CatalogCategoryDto[];
  @ApiProperty({
    type: [CatalogCountDto],
    description:
      'Số câu luyện được (đã lọc theo quyền) theo Part × dạng × loại văn bản × độ khó',
  })
  counts!: CatalogCountDto[];
}

export class SessionAnswerOptionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: String }) answer_text!: string | null;
}

export class QuestionFeedbackDto {
  @ApiProperty() is_correct!: boolean;
  @ApiProperty({ nullable: true, type: Number }) selected_answer_id!:
    number | null;
  @ApiProperty() correct_answer_id!: number;
  @ApiProperty({ nullable: true, type: String }) explanation!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' } })
  answer_explanations!: Record<string, string>;
  @ApiProperty({ nullable: true, type: String }) transcript!: string | null;
  @ApiProperty({ nullable: true, type: String }) translation!: string | null;
}

export class SessionQuestionDto {
  @ApiProperty() id!: number;
  @ApiProperty() part!: number;
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({ nullable: true, type: String }) category_label!: string | null;
  @ApiProperty({ nullable: true, type: String }) passage_type!: string | null;
  @ApiProperty({ nullable: true, type: String }) group_key!: string | null;
  @ApiProperty({ nullable: true, type: String }) question_text!: string | null;
  @ApiProperty({ nullable: true, type: String }) passage!: string | null;
  @ApiProperty({ nullable: true, type: String }) audio_url!: string | null;
  @ApiProperty({ nullable: true, type: String }) image_url!: string | null;
  @ApiProperty({ type: [SessionAnswerOptionDto] })
  answers!: SessionAnswerOptionDto[];
  @ApiProperty({ nullable: true, type: Number }) source_test_id!: number | null;
  @ApiProperty({ nullable: true, type: String }) source_test_title!:
    string | null;
  @ApiProperty() bookmarked!: boolean;
  @ApiProperty({ nullable: true, type: Number, description: 'Lựa chọn đã lưu' })
  selected_answer_id!: number | null;
  @ApiPropertyOptional({
    type: QuestionFeedbackDto,
    nullable: true,
    description:
      'Chỉ có khi được xem đáp án (đã chốt câu ở chế độ phản hồi ngay, hoặc đã nộp bài)',
  })
  feedback!: QuestionFeedbackDto | null;
}

export class SessionSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() title!: string;
  @ApiProperty() skill!: string;
  @ApiProperty() mode!: string;
  @ApiProperty() feedback!: string;
  @ApiProperty() status!: string;
  @ApiProperty() total_questions!: number;
  @ApiProperty() answered_count!: number;
  @ApiProperty({ nullable: true, type: Number }) correct_count!: number | null;
  @ApiProperty({ nullable: true, type: Number }) wrong_count!: number | null;
  @ApiProperty({ nullable: true, type: Number }) unanswered_count!:
    number | null;
  @ApiProperty({ nullable: true, type: Number }) time_limit_seconds!:
    number | null;
  @ApiProperty({ nullable: true, type: Number }) time_spent_seconds!:
    number | null;
  @ApiProperty() started_at!: string;
  @ApiProperty({ nullable: true, type: String }) submitted_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) daily_date!: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true }) config!: Record<
    string,
    unknown
  >;
}

export class SessionDetailDto extends SessionSummaryDto {
  @ApiProperty({ type: [SessionQuestionDto] }) questions!: SessionQuestionDto[];
  @ApiProperty({
    description: 'Giây còn lại (null = không bấm giờ)',
    nullable: true,
    type: Number,
  })
  remaining_seconds!: number | null;
}

export class SaveAnswerResultDto {
  @ApiProperty() saved!: boolean;
  @ApiProperty() locked!: boolean;
  @ApiPropertyOptional({ type: QuestionFeedbackDto, nullable: true })
  feedback!: QuestionFeedbackDto | null;
}

export class PartBreakdownDto {
  @ApiProperty() part!: number;
  @ApiProperty() total!: number;
  @ApiProperty() correct!: number;
  @ApiProperty() wrong!: number;
  @ApiProperty() unanswered!: number;
}

export class SessionResultDto extends SessionDetailDto {
  @ApiProperty() accuracy!: number;
  @ApiProperty({ nullable: true, type: Number }) average_seconds_per_question!:
    number | null;
  @ApiProperty({ type: [PartBreakdownDto] }) by_part!: PartBreakdownDto[];
  @ApiProperty({
    type: [PartBreakdownDto],
    description: 'Theo dạng câu (category ở field part = Part)',
  })
  by_category!: (PartBreakdownDto & { category: string; label: string })[];
}

export class ActiveSessionDto {
  @ApiProperty({ type: SessionSummaryDto, nullable: true })
  session!: SessionSummaryDto | null;
}

export class DailyChallengeDto {
  @ApiProperty() date!: string;
  @ApiProperty({ type: SessionSummaryDto, nullable: true })
  session!: SessionSummaryDto | null;
  @ApiProperty() focus_listening_part!: number;
  @ApiProperty() focus_reading_part!: number;
  @ApiProperty({
    description: 'Số ngày liên tiếp đã hoàn thành Daily Challenge',
  })
  streak!: number;
}

export class MistakeSummaryDto {
  @ApiProperty({ description: 'Số câu từng sai' }) total_wrong!: number;
  @ApiProperty() fixed!: number;
  @ApiProperty() improving!: number;
  @ApiProperty() not_reviewed!: number;
  @ApiProperty() bookmarked!: number;
  @ApiProperty() listening!: number;
  @ApiProperty() reading!: number;
}

export class MistakeItemDto {
  @ApiProperty() id!: number;
  @ApiProperty() question_id!: number;
  @ApiProperty({ nullable: true, type: Number }) part!: number | null;
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({ nullable: true, type: String }) category_label!: string | null;
  @ApiProperty({ nullable: true, type: String }) question_text!: string | null;
  @ApiProperty({ nullable: true, type: String }) passage!: string | null;
  @ApiProperty({ nullable: true, type: String }) audio_url!: string | null;
  @ApiProperty({ nullable: true, type: String }) image_url!: string | null;
  @ApiProperty({ nullable: true, type: String }) transcript!: string | null;
  @ApiProperty({ type: [SessionAnswerOptionDto] })
  answers!: SessionAnswerOptionDto[];
  @ApiProperty({ nullable: true, type: Number }) selected_answer_id!:
    number | null;
  @ApiProperty({ nullable: true, type: Number }) correct_answer_id!:
    number | null;
  @ApiProperty({ nullable: true, type: String }) explanation!: string | null;
  @ApiProperty({ nullable: true, type: Number }) source_test_id!: number | null;
  @ApiProperty({ nullable: true, type: String }) source_test_title!:
    string | null;
  @ApiProperty() wrong_count!: number;
  @ApiProperty({ enum: MISTAKE_STATUSES }) status!: string;
  @ApiProperty() review_count!: number;
  @ApiProperty() is_bookmarked!: boolean;
  @ApiProperty({ nullable: true, type: String }) first_wrong_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) last_wrong_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) last_reviewed_at!:
    string | null;
}

export class MistakeListDto {
  @ApiProperty({ type: [MistakeItemDto] }) items!: MistakeItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
}

export class MistakeAttemptDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: Number }) selected_answer_id!:
    number | null;
  @ApiProperty() is_correct!: boolean;
  @ApiProperty() source!: string;
  @ApiProperty({ nullable: true, type: String }) source_id!: string | null;
  @ApiProperty() created_at!: string;
}

export class BookmarkStateDto {
  @ApiProperty() question_id!: number;
  @ApiProperty() bookmarked!: boolean;
}

export class BookmarkedIdsDto {
  @ApiProperty({ type: [Number] }) question_ids!: number[];
}
