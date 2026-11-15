import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  EXERCISE_COUNTS,
  EXERCISE_KINDS,
  LESSON_SECTIONS,
  LEVELS,
  TOEIC_COUNTS,
} from '../grammar-rules';

const TABS = ['lesson', 'formulas', 'exercises', 'toeic'] as const;
const toBool = ({ obj, key }: { obj: Record<string, unknown>; key: string }) =>
  obj[key] === true || obj[key] === 'true'
    ? true
    : obj[key] === false || obj[key] === 'false'
      ? false
      : undefined;

// ================= Yêu cầu (học viên) =================

export class TopicProgressDto {
  @ApiProperty({
    enum: ['open', 'lesson_done', 'formula', 'formula_unset'],
    description:
      'open = mở chủ điểm/tab; lesson_done = "Đã đọc xong"; formula = "Tôi nhớ rồi" trên một công thức',
  })
  @IsIn(['open', 'lesson_done', 'formula', 'formula_unset'])
  action!: 'open' | 'lesson_done' | 'formula' | 'formula_unset';

  @ApiPropertyOptional({ enum: TABS })
  @IsOptional()
  @IsIn([...TABS])
  tab?: (typeof TABS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  formula_id?: number;
}

export class TopicLevelDto {
  @ApiProperty({ enum: LEVELS })
  @IsIn([...LEVELS])
  level!: (typeof LEVELS)[number];
}

export class GrammarSettingsDto {
  @ApiPropertyOptional({
    enum: LEVELS,
    description: 'Mức tự chọn ở hộp "Bạn đang ở mức nào?"',
  })
  @IsOptional()
  @IsIn([...LEVELS])
  level?: (typeof LEVELS)[number];

  @ApiPropertyOptional({ description: 'Đóng hộp mà không chọn (dùng Cơ bản)' })
  @IsOptional()
  @IsBoolean()
  dismiss_prompt?: boolean;

  @ApiPropertyOptional({
    description: 'Đã xem thông báo "Cấp gợi ý đã đổi"',
  })
  @IsOptional()
  @IsBoolean()
  ack_level_change?: boolean;
}

export class StartExerciseDto {
  @ApiProperty({ enum: LEVELS })
  @IsIn([...LEVELS])
  level!: (typeof LEVELS)[number];

  @ApiProperty({ enum: EXERCISE_COUNTS })
  @IsIn(EXERCISE_COUNTS)
  count!: number;

  @ApiPropertyOptional({ enum: ['all', ...EXERCISE_KINDS], default: 'all' })
  @IsOptional()
  @IsIn(['all', ...EXERCISE_KINDS])
  kind?: 'all' | (typeof EXERCISE_KINDS)[number];

  @ApiPropertyOptional({
    description: 'Kho ít hơn số câu đã chọn → vẫn tạo lượt với số câu đang có',
  })
  @IsOptional()
  @IsBoolean()
  allow_less?: boolean;
}

export class StartToeicDto {
  @ApiProperty({ enum: TOEIC_COUNTS })
  @IsIn(TOEIC_COUNTS)
  count!: number;

  @ApiPropertyOptional({ enum: ['all', 'easy', 'medium', 'hard'] })
  @IsOptional()
  @IsIn(['all', 'easy', 'medium', 'hard'])
  difficulty?: 'all' | 'easy' | 'medium' | 'hard';

  @ApiProperty({ enum: ['practice', 'test'] })
  @IsIn(['practice', 'test'])
  mode!: 'practice' | 'test';

  @ApiPropertyOptional({ enum: ['immediate', 'end'] })
  @IsOptional()
  @IsIn(['immediate', 'end'])
  feedback?: 'immediate' | 'end';

  @ApiPropertyOptional({ description: 'Ưu tiên câu chưa làm' })
  @IsOptional()
  @IsBoolean()
  unseen_first?: boolean;
}

export class AnswerItemDto {
  @ApiProperty({ description: 'Thứ tự câu trong lượt (0-based)' })
  @IsInt()
  @Min(0)
  index!: number;

  @ApiPropertyOptional({
    description: 'Câu chọn đáp án / tìm lỗi sai: vị trí lựa chọn',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  choice?: number;

  @ApiPropertyOptional({ description: 'Câu điền từ: nội dung gõ' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  text?: string;

  @ApiPropertyOptional({ description: 'Câu TOEIC: id lựa chọn' })
  @IsOptional()
  @IsInt()
  answer_id?: number;
}

export class StartReviewDto {
  @ApiPropertyOptional({
    type: [Number],
    description: 'Chủ điểm chọn ôn (bỏ chọn một số chủ điểm đến hạn)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  topic_ids?: number[];

  @ApiPropertyOptional({
    description: 'Ôn thêm: chủ điểm nhiều lỗi chưa sửa nhưng chưa đến hạn',
  })
  @IsOptional()
  @IsBoolean()
  extra?: boolean;
}

export class RetryMistakeDto {
  @ApiProperty({ enum: ['ex', 'q'] })
  @IsIn(['ex', 'q'])
  type!: 'ex' | 'q';

  @ApiProperty({ description: 'id câu bài tập hoặc id câu TOEIC' })
  @IsInt()
  id!: number;
}

export class NoteDto {
  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  note!: string;
}

export class MistakesQueryDto {
  @ApiPropertyOptional({ enum: ['exercise', 'toeic'] })
  @IsOptional()
  @IsIn(['exercise', 'toeic'])
  source?: 'exercise' | 'toeic';

  @ApiPropertyOptional({ enum: ['not_reviewed', 'improving', 'fixed'] })
  @IsOptional()
  @IsIn(['not_reviewed', 'improving', 'fixed'])
  status?: 'not_reviewed' | 'improving' | 'fixed';

  @ApiPropertyOptional({ enum: [7, 30] })
  @IsOptional()
  @Type(() => Number)
  @IsIn([7, 30])
  days?: number;

  @ApiPropertyOptional({ description: 'Chỉ lỗi sai ≥ 2 lần' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  repeated?: boolean;
}

export class QuestionTopicsQueryDto {
  @ApiProperty({ description: 'Danh sách id câu, cách nhau bởi dấu phẩy' })
  @IsString()
  @MaxLength(2000)
  ids!: string;
}

export class CategoryQueryDto {
  @ApiProperty({ description: 'Nhãn dạng câu Part 5/6 (vd. verb_tense)' })
  @IsString()
  @MaxLength(40)
  category!: string;
}

// ================= Yêu cầu (admin) =================

export class FormulaExampleDto {
  @ApiProperty() @IsString() @MaxLength(400) en!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) vi?: string;
}

export class FormulaInputDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(300) pattern!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(600) usage!: string;

  @ApiPropertyOptional({ type: [FormulaExampleDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => FormulaExampleDto)
  examples?: FormulaExampleDto[];

  @ApiPropertyOptional() @IsOptional() @IsInt() sort_order?: number;
}

export class ExerciseInputDto {
  @ApiProperty({ enum: EXERCISE_KINDS })
  @IsIn([...EXERCISE_KINDS])
  kind!: (typeof EXERCISE_KINDS)[number];

  @ApiProperty({ enum: LEVELS })
  @IsIn([...LEVELS])
  level!: (typeof LEVELS)[number];

  @ApiProperty({
    description:
      'Nội dung. Điền từ: có "___" và từ gốc trong ngoặc. Tìm lỗi sai: đánh dấu đúng 4 phần [[...]]',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  prompt!: string;

  @ApiPropertyOptional({ type: [String], description: 'Câu chọn đáp án' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  options?: string[];

  @ApiPropertyOptional({ description: 'Đáp án đúng (chọn đáp án / phần sai)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3)
  answer_index?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Câu điền từ: các đáp án đúng',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  accepted_answers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;

  @ApiPropertyOptional({ enum: LESSON_SECTIONS })
  @IsOptional()
  @IsIn([...LESSON_SECTIONS])
  lesson_section?: (typeof LESSON_SECTIONS)[number];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class TopicInputDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(160) name!: string;

  @ApiPropertyOptional({ description: 'Bỏ trống thì tạo từ tên' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;

  @ApiProperty() @IsString() @MinLength(2) @MaxLength(80) group_name!: string;

  @ApiProperty({ enum: LEVELS })
  @IsIn([...LEVELS])
  level!: (typeof LEVELS)[number];

  @ApiPropertyOptional() @IsOptional() @IsInt() sort_order?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hidden?: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  video_url?: string | null;

  @ApiPropertyOptional({
    description:
      'Bài học: { when_to_use, structure, examples[{en,vi}], mistakes[{wrong,right,note}], signals[] }',
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  lesson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  toeic_categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  roadmap_labels?: string[];
}

export class UpdateTopicDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) slug?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  group_name?: string;

  @ApiPropertyOptional({ enum: LEVELS })
  @IsOptional()
  @IsIn([...LEVELS])
  level?: (typeof LEVELS)[number];

  @ApiPropertyOptional() @IsOptional() @IsInt() sort_order?: number;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() hidden?: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  video_url?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  lesson?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toeic_categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roadmap_labels?: string[];
}

export class ImportTopicDto extends TopicInputDto {
  @ApiPropertyOptional({ type: [FormulaInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => FormulaInputDto)
  formulas?: FormulaInputDto[];

  @ApiPropertyOptional({ type: [ExerciseInputDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ExerciseInputDto)
  exercises?: ExerciseInputDto[];
}

export class ImportDto {
  @ApiProperty({ type: [ImportTopicDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ImportTopicDto)
  topics!: ImportTopicDto[];

  @ApiPropertyOptional({
    description:
      'true: thay công thức của chủ điểm và ngừng dùng bài tập cũ; false (mặc định): thêm vào',
  })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}

export class QuestionTopicDto {
  @ApiProperty({
    nullable: true,
    type: Number,
    description: 'null = không có chủ điểm',
  })
  @IsOptional()
  @IsInt()
  topic_id!: number | null;
}

export class AdminQuestionsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  topic_id?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  test_id?: number;

  @ApiPropertyOptional({ description: 'Chỉ câu chưa có chủ điểm' })
  @IsOptional()
  @Transform(toBool)
  @IsBoolean()
  untagged?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

// ================= Phản hồi =================

export class LevelInfoDto {
  @ApiProperty({ enum: LEVELS }) level!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ enum: ['estimate', 'manual', 'roadmap', 'default'] })
  source!: string;
  @ApiProperty({ nullable: true, type: Number }) score!: number | null;
  @ApiProperty({ nullable: true, type: String }) date!: string | null;
  @ApiProperty({ description: 'Hiện hộp "Bạn đang ở mức nào?"' })
  needs_prompt!: boolean;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Cấp gợi ý trước khi đổi',
  })
  changed_from!: string | null;
}

export class TopicCardDto {
  @ApiProperty() id!: number;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() group!: string;
  @ApiProperty({ enum: LEVELS }) level!: string;
  @ApiProperty({ nullable: true, type: String }) summary!: string | null;
  @ApiProperty() has_lesson!: boolean;
  @ApiProperty() formula_count!: number;
  @ApiProperty() exercise_count!: number;
  @ApiProperty({
    nullable: true,
    enum: ['not_started', 'learning', 'learned', 'mastered'],
  })
  status!: string | null;
  @ApiProperty({ description: 'Từng Thành thạo nhưng tỉ lệ đúng TOEIC tụt' })
  needs_review!: boolean;
  @ApiProperty({ nullable: true, type: Number }) toeic_accuracy!: number | null;
  @ApiProperty() toeic_answered!: number;
  @ApiProperty({ nullable: true, type: Number }) open_mistakes!: number | null;
  @ApiProperty({ description: 'Cấp thấp hơn cấp gợi ý, chưa Đã học' })
  foundation!: boolean;
  @ApiProperty() hidden!: boolean;
}

export class SuggestionDto {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() reason!: string;
}

export class OverviewDto {
  @ApiProperty({ type: LevelInfoDto, nullable: true })
  level!: LevelInfoDto | null;
  @ApiProperty({ type: [TopicCardDto] }) topics!: TopicCardDto[];
  @ApiProperty({ type: [String] }) groups!: string[];
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  progress!: { learned: number; mastered: number; total: number } | null;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  resume!: {
    slug: string;
    name: string;
    tab: string | null;
    started: boolean;
  } | null;
  @ApiProperty({ type: [SuggestionDto] }) suggestions!: SuggestionDto[];
  @ApiProperty({ nullable: true, type: Number }) open_mistakes!: number | null;
}

export class FormulaDto {
  @ApiProperty() id!: number;
  @ApiProperty() pattern!: string;
  @ApiProperty() usage!: string;
  @ApiProperty({ type: [FormulaExampleDto] }) examples!: {
    en: string;
    vi?: string;
  }[];
  @ApiProperty() sort_order!: number;
}

export class TopicDetailDto extends TopicCardDto {
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  lesson!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true, type: String }) video_url!: string | null;
  @ApiProperty({ type: [FormulaDto] }) formulas!: FormulaDto[];
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Số câu bài tập theo cấp × loại: { basic: { choice, fill, error }, ... }',
  })
  exercise_counts!: Record<string, Record<string, number>>;
  @ApiProperty({ type: 'object', additionalProperties: true })
  toeic!: {
    available: number;
    tests: number;
    total_tagged: number;
    answered: number;
    accuracy: number | null;
  };
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  progress!: {
    steps: {
      lesson: boolean;
      formulas: boolean;
      exercises: boolean;
      toeic: boolean;
    };
    last_tab: string | null;
    remembered: number[];
    chosen_level: string | null;
    suggested_level: string;
    active_session: { id: string; answered: number; total: number } | null;
    exhausted_levels: string[];
  } | null;
}

export class FormulaSheetDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  topic!: { slug: string; name: string; group: string; level: string };
  @ApiProperty({ type: [FormulaDto] }) formulas!: FormulaDto[];
}

export class TopicLinkDto {
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) roadmap_labels!: string[];
  @ApiProperty({ type: [String] }) toeic_categories!: string[];
}

export class QuestionTopicDtoOut {
  @ApiProperty() question_id!: number;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
}

export class ItemFeedbackDto {
  @ApiProperty() correct!: boolean;
  @ApiProperty({ nullable: true, type: String }) response!: string | null;
  @ApiProperty({ nullable: true, type: Number }) correct_choice!: number | null;
  @ApiProperty({ type: [String] }) accepted!: string[];
  @ApiProperty({ nullable: true, type: String }) explanation!: string | null;
  @ApiProperty({ nullable: true, type: String }) lesson_section!: string | null;
  @ApiPropertyOptional({
    nullable: true,
    type: 'object',
    additionalProperties: true,
    description: 'Câu TOEIC: phản hồi của lượt luyện (đáp án đúng, giải thích)',
  })
  toeic?: Record<string, unknown> | null;
}

export class SessionItemDto {
  @ApiProperty() index!: number;
  @ApiProperty({ enum: ['ex', 'q'] }) type!: string;
  @ApiProperty() topic_id!: number;
  @ApiProperty() topic_slug!: string;
  @ApiProperty() topic_name!: string;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  exercise!: {
    id: number;
    kind: string;
    level: string;
    prompt: string;
    options: string[];
    segments: string[];
  } | null;
  @ApiProperty({
    nullable: true,
    type: 'object',
    additionalProperties: true,
    description: 'Câu TOEIC (dạng câu của lượt luyện, không có đáp án)',
  })
  question!: Record<string, unknown> | null;
  @ApiProperty({ nullable: true, type: ItemFeedbackDto })
  feedback!: ItemFeedbackDto | null;
  @ApiProperty() saved!: boolean;
}

export class GrammarSessionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['exercise', 'review', 'retry'] }) kind!: string;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  topic!: { id: number; slug: string; name: string } | null;
  @ApiProperty({ nullable: true, type: String }) level!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() total!: number;
  @ApiProperty() answered!: number;
  @ApiProperty() correct!: number;
  @ApiProperty() started_at!: string;
  @ApiProperty({ type: [SessionItemDto] }) items!: SessionItemDto[];
  @ApiProperty({ type: 'object', additionalProperties: true }) config!: Record<
    string,
    unknown
  >;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Phiên ôn: công thức + lỗi hay gặp + ghi chú của từng chủ điểm',
  })
  recap!: Record<
    string,
    { formulas: FormulaDto[]; mistakes: unknown[]; notes: string[] }
  >;
}

export class SessionResultDto {
  @ApiProperty() id!: string;
  @ApiProperty() kind!: string;
  @ApiProperty() total!: number;
  @ApiProperty() correct!: number;
  @ApiProperty() percent!: number;
  @ApiProperty() time_seconds!: number;
  @ApiProperty({ description: 'XP của lượt (server tính)' }) xp!: number;
  @ApiProperty({
    description: 'true ở lần nộp đầu tiên — client cộng XP đúng một lần',
  })
  xp_new!: boolean;
  @ApiProperty({ type: [Number] }) wrong_indexes!: number[];
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  level_hint!: { type: 'up' | 'down'; from: string; to: string | null } | null;
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  topics!: {
    topic_id: number;
    slug: string;
    name: string;
    correct: number;
    total: number;
    next_due: string | null;
    graduated: boolean;
    rescheduled: boolean;
  }[];
  @ApiProperty() fixed_count!: number;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  topic!: { slug: string; name: string } | null;
  @ApiProperty({ nullable: true, type: String }) level!: string | null;
}

export class ReviewSummaryDto {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  due!: {
    topic_id: number;
    slug: string;
    name: string;
    open: number;
    due: string;
    last_review_at: string | null;
    available: number;
  }[];
  @ApiProperty() due_count!: number;
  @ApiProperty() est_minutes!: number;
  @ApiProperty() extra_available!: boolean;
  @ApiProperty() has_mistakes!: boolean;
  @ApiProperty({ nullable: true, type: String }) active_session_id!:
    string | null;
}

export class MistakeItemDto {
  @ApiProperty() key!: string;
  @ApiProperty({ enum: ['ex', 'q'] }) type!: string;
  @ApiProperty({ description: 'id câu bài tập / câu TOEIC' }) ref_id!: number;
  @ApiProperty() source_label!: string;
  @ApiProperty({ nullable: true, type: String }) level!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() wrong_count!: number;
  @ApiProperty({ nullable: true, type: String }) last_wrong_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) note!: string | null;
  @ApiProperty() manual!: boolean;
  @ApiProperty() updated!: boolean;
  @ApiProperty() unavailable!: boolean;
  @ApiProperty({ nullable: true, type: String }) kind!: string | null;
  @ApiProperty() prompt!: string;
  @ApiProperty({ nullable: true, type: String }) passage!: string | null;
  @ApiProperty({ type: [String] }) options!: string[];
  @ApiProperty({ nullable: true, type: String }) chosen!: string | null;
  @ApiProperty({ nullable: true, type: String }) correct!: string | null;
  @ApiProperty({ nullable: true, type: String }) explanation!: string | null;
}

export class MistakeGroupDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  topic!: { id: number; slug: string; name: string; hidden: boolean };
  @ApiProperty() open!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ nullable: true, type: String }) last_wrong_at!: string | null;
  @ApiProperty({ nullable: true, type: String }) next_review!: string | null;
  @ApiProperty({ type: [MistakeItemDto] }) items!: MistakeItemDto[];
}

export class MistakesDto {
  @ApiProperty() open!: number;
  @ApiProperty() topics_with_mistakes!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [MistakeGroupDto] }) groups!: MistakeGroupDto[];
}

export class AdminTopicDto {
  @ApiProperty() id!: number;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() group_name!: string;
  @ApiProperty() level!: string;
  @ApiProperty() sort_order!: number;
  @ApiProperty({ nullable: true, type: String }) summary!: string | null;
  @ApiProperty() hidden!: boolean;
  @ApiProperty({ nullable: true, type: String }) video_url!: string | null;
  @ApiProperty({ nullable: true, type: 'object', additionalProperties: true })
  lesson!: Record<string, unknown> | null;
  @ApiProperty({ type: [String] }) toeic_categories!: string[];
  @ApiProperty({ type: [String] }) roadmap_labels!: string[];
  @ApiProperty() formula_count!: number;
  @ApiProperty() exercise_count!: number;
  @ApiProperty() toeic_count!: number;
  @ApiProperty() visible!: boolean;
}

export class AdminExerciseDto {
  @ApiProperty() id!: number;
  @ApiProperty() topic_id!: number;
  @ApiProperty() kind!: string;
  @ApiProperty() level!: string;
  @ApiProperty() prompt!: string;
  @ApiProperty({ type: [String] }) options!: string[];
  @ApiProperty({ nullable: true, type: Number }) answer_index!: number | null;
  @ApiProperty({ type: [String] }) accepted_answers!: string[];
  @ApiProperty({ nullable: true, type: String }) explanation!: string | null;
  @ApiProperty({ nullable: true, type: String }) lesson_section!: string | null;
  @ApiProperty() active!: boolean;
}

export class AdminQuestionDto {
  @ApiProperty() id!: number;
  @ApiProperty({ nullable: true, type: Number }) part!: number | null;
  @ApiProperty({ nullable: true, type: Number }) part_index!: number | null;
  @ApiProperty({ nullable: true, type: String }) question_text!: string | null;
  @ApiProperty({ type: [String] }) options!: string[];
  @ApiProperty({ nullable: true, type: String }) category!: string | null;
  @ApiProperty({ nullable: true, type: Number }) source_test_id!: number | null;
  @ApiProperty({ nullable: true, type: Number }) topic_id!: number | null;
  @ApiProperty({ nullable: true, type: String }) tag_source!: string | null;
}

export class AdminQuestionListDto {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty({ type: [AdminQuestionDto] }) items!: AdminQuestionDto[];
}
