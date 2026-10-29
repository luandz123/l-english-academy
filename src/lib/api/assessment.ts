/**
 * Adapter assessment frontend gọi backend NestJS thay cho truy vấn Supabase (P3).
 * Trả về đúng shape { data, error } để component không phải đổi. Điểm và đáp án đúng
 * do server tính; client chỉ gửi id đáp án đã chọn.
 */
import { apiClient, toResult, ApiError } from "./client";

export interface QuizRow {
  id: number;
  module_id: number | null;
  title: string;
  total_questions: number;
  time_limit_seconds: number | null;
  display_order: number;
  audio_url: string | null;
  is_free: boolean | null;
}

/** Đáp án khi làm bài: không có is_correct/explanation. */
export interface AnswerOptionRow {
  id: number;
  question_id: number | null;
  answer_text: string | null;
  display_order: number;
}

export interface QuestionRow {
  id: number;
  quiz_id: number | null;
  question_text: string | null;
  question_type: string | null;
  image_url: string | null;
  audio_url: string | null;
  display_order: number;
  knowledge_tag: string | null;
  passage_text: string | null;
  group_id: string | null;
  answers: AnswerOptionRow[];
}

export interface ReviewAnswerRow extends AnswerOptionRow {
  is_correct: boolean | null;
  explanation: string | null;
}

export interface ReviewQuestionRow extends Omit<QuestionRow, "answers"> {
  translation: string | null;
  dictation_keywords: string | null;
  explanation: string | null;
  transcript: string | null;
  answers: ReviewAnswerRow[];
}

export interface QuizResultRow {
  id: number;
  user_id: string;
  quiz_id: number;
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  time_spent_seconds: number | null;
  completed_at: string | null;
}

export interface QuizResultWithQuizRow extends QuizResultRow {
  quizzes: {
    id: number;
    title: string;
    audio_url: string | null;
    total_questions: number;
    module_id: number | null;
    modules: {
      id: number;
      title: string;
      courses: {
        id: number;
        title: string;
      } | null;
    } | null;
  } | null;
}

export interface UserAnswerRow {
  id: number;
  result_id: number;
  question_id: number;
  selected_answer_id: number | null;
  is_correct: boolean | null;
}

export interface SubmitQuizResult {
  result: QuizResultRow;
  is_first_attempt: boolean;
}

export async function getQuiz(
  quizId: number,
): Promise<{ data: QuizRow | null; error: ApiError | null }> {
  return toResult(apiClient.get<QuizRow>(`assessment/quizzes/${quizId}`));
}

export async function listQuizQuestions(
  quizId: number,
): Promise<{ data: QuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<QuestionRow[]>(`assessment/quizzes/${quizId}/questions`),
  );
}

/** Đề kèm đáp án đúng + lời giải; server trả 403 nếu chưa nộp quiz này lần nào. */
export async function getQuizReview(
  quizId: number,
): Promise<{ data: ReviewQuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<ReviewQuestionRow[]>(`assessment/quizzes/${quizId}/review`),
  );
}

export async function submitQuiz(
  quizId: number,
  answers: { question_id: number; selected_answer_id: number | null }[],
  timeSpentSeconds: number,
): Promise<{ data: SubmitQuizResult | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<SubmitQuizResult>(`assessment/quizzes/${quizId}/submit`, {
      answers,
      time_spent_seconds: timeSpentSeconds,
    }),
  );
}

/** Như `.maybeSingle()`: không có hoặc không phải của mình (404) → `{ data: null, error: null }`. */
export async function getQuizResult(
  resultId: number,
): Promise<{ data: QuizResultRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<QuizResultRow>(`assessment/results/${resultId}`),
  );
  if (result.error && result.error.code === "RESULT_NOT_FOUND") {
    return { data: null, error: null };
  }
  return result;
}

export async function getLatestQuizResult(
  quizId: number,
): Promise<{ data: QuizResultRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<{ result: QuizResultRow | null }>(
      `assessment/quizzes/${quizId}/results/latest`,
    ),
  );
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.result ?? null, error: null };
}

export async function listResultAnswers(
  resultId: number,
): Promise<{ data: UserAnswerRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<UserAnswerRow[]>(`assessment/results/${resultId}/answers`),
  );
}

/** Danh sách kết quả quiz của chính mình kèm thông tin quiz/module/course (ASM-006). */
export async function listMyQuizResults(): Promise<{
  data: QuizResultWithQuizRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<QuizResultWithQuizRow[]>("assessment/results/me"),
  );
}

/** Admin lấy danh sách kết quả quiz của một học viên (ADM-003). */
export async function listUserQuizResults(
  userId: string,
): Promise<{ data: QuizResultWithQuizRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<QuizResultWithQuizRow[]>(
      `assessment/admin/users/${userId}/results`,
    ),
  );
}

export interface SaveQuestionAnswerPayload {
  answer_text: string;
  is_correct?: boolean;
  explanation?: string | null;
}

export interface SaveQuestionPayload {
  question_text?: string | null;
  translation?: string | null;
  dictation_keywords?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  question_type?: string | null;
  answers: SaveQuestionAnswerPayload[];
}

export interface SaveModuleQuizPayload {
  title: string;
  total_questions: number;
  time_limit_seconds?: number | null;
}

/** Admin lấy danh sách câu hỏi của quiz (ADM-011). */
export async function listAdminQuizQuestions(
  quizId: number,
): Promise<{ data: ReviewQuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<ReviewQuestionRow[]>(
      `assessment/admin/quizzes/${quizId}/questions`,
    ),
  );
}

/** Admin tạo câu hỏi mới cho quiz (ADM-011). */
export async function createQuizQuestion(
  quizId: number,
  body: SaveQuestionPayload,
): Promise<{ data: ReviewQuestionRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<ReviewQuestionRow>(
      `assessment/admin/quizzes/${quizId}/questions`,
      body,
    ),
  );
}

/** Admin cập nhật câu hỏi và đáp án (ADM-011). */
export async function updateQuizQuestion(
  id: number,
  body: SaveQuestionPayload,
): Promise<{ data: ReviewQuestionRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<ReviewQuestionRow>(
      `assessment/admin/questions/${id}`,
      body,
    ),
  );
}

/** Admin xóa 1 câu hỏi (ADM-011). */
export async function deleteQuizQuestion(
  id: number,
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.delete(`assessment/admin/questions/${id}`),
  );
  return { error: res.error };
}

/** Admin xóa nhiều câu hỏi cùng lúc trong quiz (ADM-011). */
export async function deleteQuizQuestions(
  quizId: number,
  questionIds: number[],
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.post(`assessment/admin/quizzes/${quizId}/questions/bulk-delete`, {
      question_ids: questionIds,
    }),
  );
  return { error: res.error };
}

/** Admin cập nhật thứ tự câu hỏi trong quiz (ADM-011). */
export async function reorderQuizQuestions(
  quizId: number,
  questionIds: number[],
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.put(`assessment/admin/quizzes/${quizId}/question-order`, {
      question_ids: questionIds,
    }),
  );
  return { error: res.error };
}

/** Admin gán ảnh hàng loạt cho các câu hỏi trong quiz (ADM-011). */
export async function setQuizQuestionImages(
  quizId: number,
  items: { question_id: number; image_url: string | null }[],
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.put(`assessment/admin/quizzes/${quizId}/question-images`, {
      items,
    }),
  );
  return { error: res.error };
}

/** Admin cập nhật audio của quiz (ADM-011). */
export async function patchQuiz(
  quizId: number,
  body: { audio_url: string | null },
): Promise<{ data: QuizRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.patch<QuizRow>(`assessment/admin/quizzes/${quizId}`, body),
  );
}

/** Admin tạo quiz độc lập trong chương (ADM-010). */
export async function createModuleQuiz(
  moduleId: number,
  body: SaveModuleQuizPayload,
): Promise<{ data: QuizRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<QuizRow>(
      `assessment/admin/modules/${moduleId}/quizzes`,
      body,
    ),
  );
}

/** Admin sửa quiz độc lập trong chương (ADM-010). */
export async function updateModuleQuiz(
  id: number,
  body: SaveModuleQuizPayload,
): Promise<{ data: QuizRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<QuizRow>(`assessment/admin/quizzes/${id}`, body),
  );
}

/** Admin xóa quiz (ADM-010). */
export async function deleteModuleQuiz(
  id: number,
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.delete(`assessment/admin/quizzes/${id}`),
  );
  return { error: res.error };
}

/** Admin tạo quiz gắn với bài học (ADM-010). */
export async function createLessonQuiz(
  lessonId: number,
): Promise<{ data: QuizRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<QuizRow>(`assessment/admin/lessons/${lessonId}/quiz`),
  );
}
