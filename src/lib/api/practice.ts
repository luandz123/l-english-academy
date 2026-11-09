/**
 * Luyện đề (`/api/v1/practice`): luyện theo dạng câu, Mini Test, Daily Challenge, sổ câu sai,
 * thư viện đề có bộ lọc, yêu thích, đề đã xác minh, báo lỗi. Server chọn câu, giữ đáp án và chấm
 * điểm — client chỉ gửi cấu hình lượt luyện và lựa chọn từng câu.
 */
import { apiClient } from "./client";

export type Skill = "listening" | "reading";
export type DifficultyFilter = "all" | "easy" | "medium" | "hard";
export type PracticeMode = "practice" | "test";
export type FeedbackMode = "immediate" | "end";
export type MistakeStatus = "not_reviewed" | "improving" | "fixed";

export interface CategoryDef {
  key: string;
  label: string;
  description: string;
}

export interface CatalogPart {
  part: number;
  skill: Skill;
  name: string;
  categories: CategoryDef[];
}

export interface CatalogCount {
  part: number;
  category: string;
  passage_type: string | null;
  difficulty: string;
  count: number;
}

export interface PracticeCatalog {
  parts: CatalogPart[];
  passage_types: CategoryDef[];
  counts: CatalogCount[];
}

export interface MistakeFilter {
  skill?: Skill;
  parts?: number[];
  categories?: string[];
  statuses?: MistakeStatus[];
  recent_days?: number;
  min_wrong?: number;
  bookmarked?: boolean;
}

export interface CreateSessionBody {
  kind: "question_type" | "mini_test" | "mistakes" | "retry";
  skill?: Skill;
  parts?: number[];
  categories?: string[];
  passage_types?: string[];
  difficulty?: DifficultyFilter;
  count?: number;
  mode: PracticeMode;
  feedback?: FeedbackMode;
  order?: "random" | "sequential";
  time_limit_minutes?: number;
  source_session_id?: string;
  mistake_filter?: MistakeFilter;
}

export interface SessionSummary {
  id: string;
  code: string;
  kind: "question_type" | "mini_test" | "daily" | "mistakes" | "retry";
  title: string;
  skill: string;
  mode: PracticeMode;
  feedback: FeedbackMode;
  status: "in_progress" | "submitted" | "abandoned";
  total_questions: number;
  answered_count: number;
  correct_count: number | null;
  wrong_count: number | null;
  unanswered_count: number | null;
  time_limit_seconds: number | null;
  time_spent_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
  daily_date: string | null;
  config: Record<string, unknown>;
}

export interface QuestionFeedback {
  is_correct: boolean;
  selected_answer_id: number | null;
  correct_answer_id: number;
  explanation: string | null;
  answer_explanations: Record<string, string>;
  transcript: string | null;
  translation: string | null;
}

export interface AnswerOption {
  id: number;
  answer_text: string | null;
}

export interface SessionQuestion {
  id: number;
  part: number;
  category: string | null;
  category_label: string | null;
  passage_type: string | null;
  group_key: string | null;
  question_text: string | null;
  passage: string | null;
  audio_url: string | null;
  image_url: string | null;
  answers: AnswerOption[];
  source_test_id: number | null;
  source_test_title: string | null;
  bookmarked: boolean;
  selected_answer_id: number | null;
  feedback: QuestionFeedback | null;
}

export interface SessionDetail extends SessionSummary {
  questions: SessionQuestion[];
  remaining_seconds: number | null;
}

export interface Breakdown {
  part: number;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
}

export interface SessionResult extends SessionDetail {
  accuracy: number;
  average_seconds_per_question: number | null;
  by_part: Breakdown[];
  by_category: (Breakdown & { category: string; label: string })[];
}

export interface SaveAnswerResult {
  saved: boolean;
  locked: boolean;
  feedback: QuestionFeedback | null;
}

export interface DailyChallenge {
  date: string;
  session: SessionSummary | null;
  focus_listening_part: number;
  focus_reading_part: number;
  streak: number;
}

export interface MistakeSummary {
  total_wrong: number;
  fixed: number;
  improving: number;
  not_reviewed: number;
  bookmarked: number;
  listening: number;
  reading: number;
}

export interface MistakeItem {
  id: number;
  question_id: number;
  part: number | null;
  category: string | null;
  category_label: string | null;
  question_text: string | null;
  passage: string | null;
  audio_url: string | null;
  image_url: string | null;
  transcript: string | null;
  answers: AnswerOption[];
  selected_answer_id: number | null;
  correct_answer_id: number | null;
  explanation: string | null;
  source_test_id: number | null;
  source_test_title: string | null;
  wrong_count: number;
  status: MistakeStatus;
  review_count: number;
  is_bookmarked: boolean;
  first_wrong_at: string | null;
  last_wrong_at: string | null;
  last_reviewed_at: string | null;
}

export interface MistakeList {
  items: MistakeItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MistakeAttempt {
  id: number;
  selected_answer_id: number | null;
  is_correct: boolean;
  source: "full_test" | "practice";
  source_id: string | null;
  created_at: string;
}

export type ExamType = "full" | "mini" | "practice_set";
export type ExamSkill = "listening" | "reading" | "full";
export type ExamUserStatus = "not_started" | "in_progress" | "completed";
export type VerificationStatus = "unverified" | "verified" | "needs_review";

export interface ExamCard {
  id: number;
  code: string;
  title: string;
  course_id: number | null;
  year: number | null;
  difficulty: "easy" | "medium" | "hard" | null;
  topics: string[];
  test_type: ExamType;
  skill: ExamSkill;
  parts: number[];
  duration_minutes: number;
  total_questions: number;
  attempts: number;
  is_free: boolean;
  accessible: boolean;
  released: boolean;
  release_date: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  user_status: ExamUserStatus;
  best_score: number | null;
  favorited: boolean;
  created_at: string | null;
}

export interface Facet {
  value: string;
  count: number;
}

export interface ExamLibrary {
  items: ExamCard[];
  total: number;
  total_all: number;
  facets: Record<
    "years" | "difficulties" | "topics" | "types" | "skills" | "parts" | "statuses" | "access" | "verified",
    Facet[]
  >;
}

export interface ExamLibraryQuery {
  q?: string;
  years?: string[];
  difficulties?: string[];
  topics?: string[];
  types?: string[];
  skills?: string[];
  parts?: number[];
  statuses?: string[];
  access?: "free" | "premium";
  verified?: "verified" | "unverified";
  sort?: "newest" | "popular" | "difficulty" | "attempts";
}

export interface FavoriteExam {
  test_id: number;
  title: string;
  favorited_at: string;
  available: boolean;
  exam: ExamCard | null;
}

export type ReportReason =
  | "wrong_answer"
  | "bad_explanation"
  | "audio_problem"
  | "display_problem"
  | "missing_content"
  | "duplicate"
  | "other";

export interface ExamReport {
  id: number;
  test_id: number | null;
  test_title: string | null;
  question_id: number | null;
  reason: ReportReason;
  message: string | null;
  status: "open" | "resolved" | "dismissed";
  admin_note: string | null;
  reporter_email: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AdminExam extends ExamCard {
  checklist: boolean[];
  checklist_labels: string[];
  content_changed_at: string | null;
  open_reports: number;
  tagged_questions: number;
  eligible_questions: number;
}

export interface AdminQuestionTag {
  id: number;
  part: number | null;
  part_index: number | null;
  text: string | null;
  category: string | null;
  passage_type: string | null;
  difficulty: string | null;
  practice_eligible: boolean;
  tag_source: string | null;
}

const csv = <T>(v: T[] | undefined) => (v && v.length ? v.join(",") : undefined);

// ---------- Luyện tập ----------

export const getPracticeCatalog = () => apiClient.get<PracticeCatalog>("practice/catalog");

export const createPracticeSession = (body: CreateSessionBody) =>
  apiClient.post<SessionSummary>("practice/sessions", body);

export const listPracticeHistory = (limit = 20) =>
  apiClient.get<SessionSummary[]>("practice/sessions", { query: { limit } });

export const getActivePracticeSession = () =>
  apiClient.get<{ session: SessionSummary | null }>("practice/sessions/active").then((r) => r.session);

export const getPracticeSession = (id: string) => apiClient.get<SessionDetail>(`practice/sessions/${id}`);

export const savePracticeAnswer = (id: string, questionId: number, selectedAnswerId: number | null) =>
  apiClient.put<SaveAnswerResult>(`practice/sessions/${id}/answers`, {
    question_id: questionId,
    selected_answer_id: selectedAnswerId,
  });

export const submitPracticeSession = (id: string) => apiClient.post<SessionResult>(`practice/sessions/${id}/submit`);

export const abandonPracticeSession = (id: string) => apiClient.post<void>(`practice/sessions/${id}/abandon`);

export const getPracticeResult = (id: string) => apiClient.get<SessionResult>(`practice/sessions/${id}/result`);

export const getDailyChallenge = () => apiClient.get<DailyChallenge>("practice/daily");

export const startDailyChallenge = () => apiClient.post<SessionSummary>("practice/daily");

// ---------- Sổ câu sai ----------

export const getMistakeSummary = () => apiClient.get<MistakeSummary>("practice/mistakes/summary");

export const listMistakes = (f: MistakeFilter & { page?: number; limit?: number }) =>
  apiClient.get<MistakeList>("practice/mistakes", {
    query: {
      skill: f.skill,
      parts: csv(f.parts),
      categories: csv(f.categories),
      statuses: csv(f.statuses),
      recent_days: f.recent_days,
      min_wrong: f.min_wrong,
      bookmarked: f.bookmarked,
      page: f.page,
      limit: f.limit,
    },
  });

export const getMistakeHistory = (id: number) => apiClient.get<MistakeAttempt[]>(`practice/mistakes/${id}/history`);

export const getBookmarkedQuestionIds = () =>
  apiClient.get<{ question_ids: number[] }>("practice/mistakes/bookmarks").then((r) => r.question_ids);

export const setQuestionBookmark = (questionId: number, bookmarked: boolean) =>
  bookmarked
    ? apiClient.put<{ question_id: number; bookmarked: boolean }>(`practice/mistakes/bookmarks/${questionId}`)
    : apiClient.delete<{ question_id: number; bookmarked: boolean }>(`practice/mistakes/bookmarks/${questionId}`);

export const bookmarkQuestions = (questionIds: number[]) =>
  apiClient.post<void>("practice/mistakes/bookmarks", { question_ids: questionIds });

// ---------- Thư viện đề, yêu thích, báo lỗi ----------

export const listExamLibrary = (q: ExamLibraryQuery) =>
  apiClient.get<ExamLibrary>("practice/library/exams", {
    query: {
      q: q.q?.trim() || undefined,
      years: csv(q.years),
      difficulties: csv(q.difficulties),
      topics: csv(q.topics),
      types: csv(q.types),
      skills: csv(q.skills),
      parts: csv(q.parts),
      statuses: csv(q.statuses),
      access: q.access,
      verified: q.verified,
      sort: q.sort,
    },
  });

export const getExamCard = (testId: number) => apiClient.get<ExamCard>(`practice/library/exams/${testId}`);

export const listFavoriteExams = (skill?: ExamSkill) =>
  apiClient.get<FavoriteExam[]>("practice/favorites", { query: { skill } });

export const setExamFavorite = (testId: number, favorited: boolean) =>
  favorited
    ? apiClient.put<{ test_id: number; favorited: boolean }>(`practice/favorites/${testId}`)
    : apiClient.delete<{ test_id: number; favorited: boolean }>(`practice/favorites/${testId}`);

export const reportExamIssue = (body: { test_id?: number; question_id?: number; reason: ReportReason; message?: string }) =>
  apiClient.post<ExamReport>("practice/reports", body);

// ---------- Admin ----------

export const adminListExams = () => apiClient.get<AdminExam[]>("practice/admin/exams");

export const adminUpdateExamMeta = (
  testId: number,
  body: Partial<{ year: number | null; difficulty: string | null; topics: string[]; test_type: ExamType; duration_minutes: number | null }>,
) => apiClient.patch<ExamCard>(`practice/admin/exams/${testId}`, body);

export const adminSetVerification = (testId: number, checklist: boolean[], verified: boolean) =>
  apiClient.put<ExamCard>(`practice/admin/exams/${testId}/verification`, { checklist, verified });

export const adminListQuestionTags = (testId: number, part?: number) =>
  apiClient.get<AdminQuestionTag[]>("practice/admin/questions", { query: { test_id: testId, part } });

export const adminUpdateQuestionTags = (
  questionId: number,
  body: Partial<{ category: string; passage_type: string | null; difficulty: string }>,
) => apiClient.patch<AdminQuestionTag>(`practice/admin/questions/${questionId}/tags`, body);

export const adminRetag = (testId?: number) =>
  apiClient.post<{ tagged: number }>("practice/admin/retag", testId ? { test_id: testId } : {});

export const adminListReports = (status?: string) =>
  apiClient.get<ExamReport[]>("practice/admin/reports", { query: { status } });

export const adminUpdateReport = (id: number, body: { status: string; admin_note?: string }) =>
  apiClient.patch<ExamReport>(`practice/admin/reports/${id}`, body);

// ---------- Nhãn hiển thị ----------

export const DIFFICULTY_LABELS: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
export const EXAM_TYPE_LABELS: Record<string, string> = { full: "Full Test", mini: "Mini Test", practice_set: "Practice Set" };
export const SKILL_LABELS: Record<string, string> = { listening: "Listening", reading: "Reading", full: "Full Test", mixed: "Nghe + Đọc" };
export const MISTAKE_STATUS_LABELS: Record<MistakeStatus, string> = {
  not_reviewed: "Chưa ôn",
  improving: "Đang cải thiện",
  fixed: "Đã sửa đúng",
};
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  wrong_answer: "Đáp án sai",
  bad_explanation: "Giải thích chưa đúng",
  audio_problem: "Lỗi audio",
  display_problem: "Lỗi hiển thị",
  missing_content: "Thiếu nội dung / đáp án",
  duplicate: "Câu bị trùng",
  other: "Khác",
};
