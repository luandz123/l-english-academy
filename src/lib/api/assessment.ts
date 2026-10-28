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
