/**
 * Ngữ pháp (`/api/v1/grammar`): Grammar Center, bài tập chủ điểm, câu TOEIC theo chủ điểm, Sổ lỗi
 * ngữ pháp, ôn theo lịch, quản trị. Đáp án, chấm điểm, lịch ôn và XP do server tính.
 */
import { apiClient } from "./client";
import type { QuestionFeedback, SessionQuestion, SessionSummary } from "./practice";

export type GrammarLevel = "basic" | "intermediate" | "advanced";
export type TopicStatus = "not_started" | "learning" | "learned" | "mastered";
export type ExerciseKind = "choice" | "fill" | "error";
export type TopicTab = "lesson" | "formulas" | "exercises" | "toeic";
export type MistakeStatus = "not_reviewed" | "improving" | "fixed";
export type LessonSection = "when_to_use" | "structure" | "examples" | "mistakes" | "signals";

export const LEVEL_LABELS: Record<GrammarLevel, string> = { basic: "Cơ bản", intermediate: "Trung cấp", advanced: "Nâng cao" };
export const LEVELS: GrammarLevel[] = ["basic", "intermediate", "advanced"];
export const STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: "Chưa học",
  learning: "Đang học",
  learned: "Đã học",
  mastered: "Thành thạo",
};
export const KIND_LABELS: Record<ExerciseKind, string> = { choice: "Chọn đáp án", fill: "Điền từ", error: "Tìm lỗi sai" };
export const SECTION_LABELS: Record<LessonSection, string> = {
  when_to_use: "Khi nào dùng",
  structure: "Cấu trúc và giải thích",
  examples: "Ví dụ",
  mistakes: "Lỗi hay gặp",
  signals: "Dấu hiệu nhận biết trong Part 5/6",
};
export const MISTAKE_STATUS_LABELS: Record<MistakeStatus, string> = {
  not_reviewed: "Chưa ôn",
  improving: "Đang cải thiện",
  fixed: "Đã sửa đúng",
};

export interface LevelInfo {
  level: GrammarLevel;
  label: string;
  source: "estimate" | "manual" | "roadmap" | "default";
  score: number | null;
  date: string | null;
  needs_prompt: boolean;
  changed_from: GrammarLevel | null;
}

export interface TopicCard {
  id: number;
  slug: string;
  name: string;
  group: string;
  level: GrammarLevel;
  summary: string | null;
  has_lesson: boolean;
  formula_count: number;
  exercise_count: number;
  status: TopicStatus | null;
  needs_review: boolean;
  toeic_accuracy: number | null;
  toeic_answered: number;
  open_mistakes: number | null;
  foundation: boolean;
  hidden: boolean;
}

export interface Overview {
  level: LevelInfo | null;
  topics: TopicCard[];
  groups: string[];
  progress: { learned: number; mastered: number; total: number } | null;
  resume: { slug: string; name: string; tab: TopicTab | null; started: boolean } | null;
  suggestions: { slug: string; name: string; reason: string }[];
  open_mistakes: number | null;
}

export interface Lesson {
  when_to_use?: string;
  structure?: string;
  examples?: { en: string; vi?: string }[];
  mistakes?: { wrong: string; right: string; note?: string }[];
  signals?: string[];
}

export interface Formula {
  id: number;
  pattern: string;
  usage: string;
  examples: { en: string; vi?: string }[];
  sort_order: number;
}

export interface TopicDetail extends TopicCard {
  lesson: Lesson | null;
  video_url: string | null;
  formulas: Formula[];
  exercise_counts: Record<GrammarLevel, Record<ExerciseKind, number>>;
  toeic: { available: number; tests: number; total_tagged: number; answered: number; accuracy: number | null };
  progress: {
    steps: { lesson: boolean; formulas: boolean; exercises: boolean; toeic: boolean };
    last_tab: TopicTab | null;
    remembered: number[];
    chosen_level: GrammarLevel | null;
    suggested_level: GrammarLevel;
    active_session: { id: string; answered: number; total: number } | null;
    exhausted_levels: GrammarLevel[];
  } | null;
}

export interface ItemFeedback {
  correct: boolean;
  response: string | null;
  correct_choice: number | null;
  accepted: string[];
  explanation: string | null;
  lesson_section: LessonSection | null;
  toeic?: QuestionFeedback | null;
}

export interface SessionItem {
  index: number;
  type: "ex" | "q";
  topic_id: number;
  topic_slug: string;
  topic_name: string;
  exercise: { id: number; kind: ExerciseKind; level: GrammarLevel; prompt: string; options: string[]; segments: string[] } | null;
  question: SessionQuestion | null;
  feedback: ItemFeedback | null;
  saved: boolean;
}

export interface TopicResult {
  correct: number;
  total: number;
  next_due: string | null;
  graduated: boolean;
  rescheduled: boolean;
}

export interface GrammarSession {
  id: string;
  kind: "exercise" | "review" | "retry";
  topic: { id: number; slug: string; name: string } | null;
  level: GrammarLevel | null;
  status: "in_progress" | "submitted" | "abandoned";
  total: number;
  answered: number;
  correct: number;
  started_at: string;
  items: SessionItem[];
  config: {
    count: number | null;
    kind: string | null;
    extra: boolean;
    exhausted: boolean;
    skipped: { topic_id: number; name: string; reason: string }[];
    topic_results: Record<string, TopicResult>;
  };
  recap: Record<string, { formulas: Formula[]; mistakes: { wrong: string; right: string; note?: string }[]; notes: string[] }>;
}

export interface GrammarResult {
  id: string;
  kind: GrammarSession["kind"];
  total: number;
  correct: number;
  percent: number;
  time_seconds: number;
  xp: number;
  xp_new: boolean;
  wrong_indexes: number[];
  level_hint: { type: "up" | "down"; from: GrammarLevel; to: GrammarLevel | null } | null;
  topics: (TopicResult & { topic_id: number; slug: string; name: string })[];
  fixed_count: number;
  topic: { slug: string; name: string } | null;
  level: GrammarLevel | null;
}

export interface ReviewSummary {
  due: { topic_id: number; slug: string; name: string; open: number; due: string; last_review_at: string | null; available: number }[];
  due_count: number;
  est_minutes: number;
  extra_available: boolean;
  has_mistakes: boolean;
  active_session_id: string | null;
}

export interface GrammarMistake {
  key: string;
  type: "ex" | "q";
  ref_id: number;
  source_label: string;
  level: GrammarLevel | null;
  status: MistakeStatus;
  wrong_count: number;
  last_wrong_at: string | null;
  note: string | null;
  manual: boolean;
  updated: boolean;
  unavailable: boolean;
  kind: ExerciseKind | null;
  prompt: string;
  passage: string | null;
  options: string[];
  chosen: string | null;
  correct: string | null;
  explanation: string | null;
}

export interface MistakeGroup {
  topic: { id: number; slug: string; name: string; hidden: boolean };
  open: number;
  total: number;
  last_wrong_at: string | null;
  next_review: string | null;
  items: GrammarMistake[];
}

export interface MistakeBook {
  open: number;
  topics_with_mistakes: number;
  total: number;
  groups: MistakeGroup[];
}

export interface MistakeFilter {
  source?: "exercise" | "toeic";
  status?: MistakeStatus;
  days?: 7 | 30;
  repeated?: boolean;
}

// ---------- Học viên ----------

export const getGrammarOverview = () => apiClient.get<Overview>("grammar/overview");
export const getGrammarTopic = (slug: string) => apiClient.get<TopicDetail>(`grammar/topics/${encodeURIComponent(slug)}`);
export const getFormulaSheet = () =>
  apiClient.get<{ topic: { slug: string; name: string; group: string; level: GrammarLevel }; formulas: Formula[] }[]>("grammar/formulas");
export const getGrammarLinks = () =>
  apiClient.get<{ slug: string; name: string; roadmap_labels: string[]; toeic_categories: string[] }[]>("grammar/links");
export const getCategoryTopic = (category: string) =>
  apiClient.get<{ topic: { slug: string; name: string } | null }>(`grammar/category-topic?category=${encodeURIComponent(category)}`);

export const updateGrammarSettings = (body: { level?: GrammarLevel; dismiss_prompt?: boolean; ack_level_change?: boolean }) =>
  apiClient.put<LevelInfo>("grammar/settings", body);

export const markTopicProgress = (
  slug: string,
  body: { action: "open" | "lesson_done" | "formula" | "formula_unset"; tab?: TopicTab; formula_id?: number },
) => apiClient.post<{ ok: true }>(`grammar/topics/${encodeURIComponent(slug)}/progress`, body);

export const setTopicLevel = (slug: string, level: GrammarLevel) =>
  apiClient.put<{ ok: true }>(`grammar/topics/${encodeURIComponent(slug)}/level`, { level });

export const startExerciseSession = (
  slug: string,
  body: { level: GrammarLevel; count: number; kind?: "all" | ExerciseKind; allow_less?: boolean },
) => apiClient.post<GrammarSession>(`grammar/topics/${encodeURIComponent(slug)}/exercise-sessions`, body);

export const startToeicSession = (
  slug: string,
  body: { count: number; difficulty?: "all" | "easy" | "medium" | "hard"; mode: "practice" | "test"; feedback?: "immediate" | "end"; unseen_first?: boolean },
) => apiClient.post<SessionSummary>(`grammar/topics/${encodeURIComponent(slug)}/toeic-sessions`, body);

export const getGrammarSession = (id: string) => apiClient.get<GrammarSession>(`grammar/sessions/${id}`);
export const answerGrammarItem = (id: string, body: { index: number; choice?: number; text?: string; answer_id?: number }) =>
  apiClient.post<ItemFeedback & { topic_result: TopicResult | null }>(`grammar/sessions/${id}/answers`, body);
export const finishGrammarSession = (id: string) => apiClient.post<GrammarResult>(`grammar/sessions/${id}/finish`);
export const abandonGrammarSession = (id: string) => apiClient.post<void>(`grammar/sessions/${id}/abandon`);
export const retryWrongItems = (id: string) => apiClient.post<GrammarSession>(`grammar/sessions/${id}/retry-wrong`);

export const getGrammarReview = () => apiClient.get<ReviewSummary>("grammar/review");
export const startGrammarReview = (body: { topic_ids?: number[]; extra?: boolean }) =>
  apiClient.post<GrammarSession>("grammar/review", body);

export function grammarMistakesQuery(f: MistakeFilter): string {
  const p = new URLSearchParams();
  if (f.source) p.set("source", f.source);
  if (f.status) p.set("status", f.status);
  if (f.days) p.set("days", String(f.days));
  if (f.repeated) p.set("repeated", "true");
  const s = p.toString();
  return s ? `grammar/mistakes?${s}` : "grammar/mistakes";
}
export const getGrammarMistakes = (f: MistakeFilter = {}) => apiClient.get<MistakeBook>(grammarMistakesQuery(f));
export const retryGrammarMistake = (type: "ex" | "q", id: number) =>
  apiClient.post<GrammarSession>("grammar/mistakes/retry", { type, id });
export const saveExerciseMistake = (exerciseId: number) =>
  apiClient.post<{ saved: true }>(`grammar/mistakes/exercises/${exerciseId}/save`);
export const setMistakeNote = (type: "ex" | "q", id: number, note: string) =>
  apiClient.put<{ ok: true }>(type === "ex" ? `grammar/mistakes/exercises/${id}/note` : `grammar/mistakes/questions/${id}/note`, { note });
export const deleteExerciseMistake = (exerciseId: number) => apiClient.delete<void>(`grammar/mistakes/exercises/${exerciseId}`);
export const restoreExerciseMistake = (exerciseId: number) =>
  apiClient.post<{ ok: true }>(`grammar/mistakes/exercises/${exerciseId}/restore`);

// ---------- Chủ điểm của câu TOEIC (gom nhiều câu vào một lần gọi) ----------

type TopicRef = { slug: string; name: string } | null;
const topicCache = new Map<number, Promise<TopicRef>>();
let pending: { id: number; resolve: (v: TopicRef) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  const batch = pending;
  pending = [];
  timer = null;
  const ids = [...new Set(batch.map((b) => b.id))];
  apiClient
    .get<{ question_id: number; slug: string; name: string }[]>(`grammar/question-topics?ids=${ids.join(",")}`)
    .then((rows) => {
      const byId = new Map(rows.map((r) => [r.question_id, { slug: r.slug, name: r.name }]));
      for (const b of batch) b.resolve(byId.get(b.id) ?? null);
    })
    .catch(() => {
      for (const b of batch) {
        topicCache.delete(b.id);
        b.resolve(null);
      }
    });
}

/** Chủ điểm ngữ pháp của một câu TOEIC (null nếu không có). Các lời gọi trong cùng nhịp được gom lại. */
export function getQuestionTopic(questionId: number): Promise<TopicRef> {
  const hit = topicCache.get(questionId);
  if (hit) return hit;
  const p = new Promise<TopicRef>((resolve) => {
    pending.push({ id: questionId, resolve });
    if (!timer) timer = setTimeout(flush, 20);
  });
  topicCache.set(questionId, p);
  return p;
}

// ---------- Quản trị ----------

export interface AdminTopic {
  id: number;
  slug: string;
  name: string;
  group_name: string;
  level: GrammarLevel;
  sort_order: number;
  summary: string | null;
  hidden: boolean;
  video_url: string | null;
  lesson: Lesson | null;
  toeic_categories: string[];
  roadmap_labels: string[];
  formula_count: number;
  exercise_count: number;
  toeic_count: number;
  visible: boolean;
}

export interface AdminExercise {
  id: number;
  topic_id: number;
  kind: ExerciseKind;
  level: GrammarLevel;
  prompt: string;
  options: string[];
  answer_index: number | null;
  accepted_answers: string[];
  explanation: string | null;
  lesson_section: LessonSection | null;
  active: boolean;
}

export type ExerciseInput = Omit<AdminExercise, "id" | "topic_id">;
export type FormulaInput = { pattern: string; usage: string; examples: { en: string; vi?: string }[]; sort_order?: number };

export interface AdminQuestion {
  id: number;
  part: number | null;
  part_index: number | null;
  question_text: string | null;
  options: string[];
  category: string | null;
  source_test_id: number | null;
  topic_id: number | null;
  tag_source: string | null;
}

export const adminListTopics = () => apiClient.get<AdminTopic[]>("grammar/admin/topics");
export const adminCreateTopic = (body: Partial<AdminTopic> & { name: string; group_name: string; level: GrammarLevel }) =>
  apiClient.post<AdminTopic>("grammar/admin/topics", body);
export const adminUpdateTopic = (id: number, body: Partial<AdminTopic>) => apiClient.patch<AdminTopic>(`grammar/admin/topics/${id}`, body);
export const adminListFormulas = (topicId: number) => apiClient.get<Formula[]>(`grammar/admin/topics/${topicId}/formulas`);
export const adminCreateFormula = (topicId: number, body: FormulaInput) =>
  apiClient.post<Formula>(`grammar/admin/topics/${topicId}/formulas`, body);
export const adminUpdateFormula = (id: number, body: FormulaInput) => apiClient.put<Formula>(`grammar/admin/formulas/${id}`, body);
export const adminDeleteFormula = (id: number) => apiClient.delete<void>(`grammar/admin/formulas/${id}`);
export const adminListExercises = (topicId: number) => apiClient.get<AdminExercise[]>(`grammar/admin/topics/${topicId}/exercises`);
export const adminCreateExercise = (topicId: number, body: ExerciseInput) =>
  apiClient.post<AdminExercise>(`grammar/admin/topics/${topicId}/exercises`, body);
export const adminUpdateExercise = (id: number, body: ExerciseInput) => apiClient.put<AdminExercise>(`grammar/admin/exercises/${id}`, body);
export const adminRemoveExercise = (id: number) => apiClient.delete<void>(`grammar/admin/exercises/${id}`);
export const adminImportGrammar = (body: { topics: unknown[]; replace?: boolean }) =>
  apiClient.post<{ topics: number; formulas: number; exercises: number }>("grammar/admin/import", body);
export const adminListQuestions = (q: { topic_id?: number; test_id?: number; untagged?: boolean; page?: number }) => {
  const p = new URLSearchParams();
  if (q.topic_id) p.set("topic_id", String(q.topic_id));
  if (q.test_id) p.set("test_id", String(q.test_id));
  if (q.untagged) p.set("untagged", "true");
  if (q.page) p.set("page", String(q.page));
  const s = p.toString();
  return apiClient.get<{ total: number; page: number; items: AdminQuestion[] }>(`grammar/admin/questions${s ? `?${s}` : ""}`);
};
export const adminSetQuestionTopic = (id: number, topicId: number | null) =>
  apiClient.put<{ ok: true }>(`grammar/admin/questions/${id}/topic`, { topic_id: topicId });
export const adminRetagGrammar = () => apiClient.post<{ tagged: number }>("grammar/admin/retag");

/** Bỏ dấu để tìm kiếm không phân biệt dấu. */
export function foldVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Tách câu "tìm lỗi sai" thành các đoạn thường và 4 phần gạch chân. */
export function splitErrorPrompt(prompt: string): { text: string; seg: number | null }[] {
  const out: { text: string; seg: number | null }[] = [];
  let last = 0;
  let n = 0;
  for (const m of prompt.matchAll(/\[\[(.+?)\]\]/g)) {
    if (m.index! > last) out.push({ text: prompt.slice(last, m.index), seg: null });
    out.push({ text: m[1], seg: n++ });
    last = m.index! + m[0].length;
  }
  if (last < prompt.length) out.push({ text: prompt.slice(last), seg: null });
  return out;
}
