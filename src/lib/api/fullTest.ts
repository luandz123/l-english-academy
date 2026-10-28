/**
 * Adapter Full Test gọi backend NestJS thay cho Supabase. Server chấm và quy đổi ETS;
 * client chỉ gửi đáp án đã chọn và thông tin phiên.
 */
import { apiClient, toResult, ApiError } from "./client";
import type { ReviewQuestionRow } from "./assessment";

export interface FullTestRow {
  id: number;
  course_id: number | null;
  category: string;
  title: string;
  total_questions: number | null;
  release_date: string | null;
  display_order: number;
  created_at: string | null;
  audio_url: string | null;
  description: string | null;
  total_attempts: number | null;
}

export interface FullTestQuestionRow extends ReviewQuestionRow {
  part_number: number;
}

export interface FullTestResultRow {
  id: number;
  user_id: string;
  test_id: number;
  total_score: number | null;
  listening_score: number | null;
  reading_score: number | null;
  correct_answers: number | null;
  time_spent_seconds: number | null;
  completed_at: string | null;
  total_questions: number | null;
  listening_correct: number | null;
  reading_correct: number | null;
  pause_count: number | null;
  test_mode: string | null;
  answers_detail: unknown;
}

export interface FullTestResultWithTestRow extends FullTestResultRow {
  full_tests: FullTestRow | null;
}

export interface FullTestAnswerDetailRow {
  id: number;
  result_id: number;
  question_id: number;
  selected_answer_id: number | null;
  is_correct: boolean | null;
  part_number: number | null;
}

export interface SubmitFullTestInput {
  answers: { question_id: number; selected_answer_id: number | null }[];
  selected_parts: number[];
  test_mode: "exam" | "practice";
  time_spent_seconds: number;
  pause_count: number;
  time_allocated_minutes: number;
  answers_map: Record<string, number>;
}

/** Như `.maybeSingle()`: đề không có → `{ data: null, error: null }`. */
export async function getFullTest(
  testId: number,
): Promise<{ data: FullTestRow | null; error: ApiError | null }> {
  const result = await toResult(apiClient.get<FullTestRow>(`assessment/full-tests/${testId}`));
  if (result.error?.code === "FULLTEST_NOT_FOUND") return { data: null, error: null };
  return result;
}

/** Câu hỏi kèm đáp án; server trả 403 `FULLTEST_LOCKED` khi không được vào khóa của đề. */
export async function getFullTestQuestions(
  testId: number,
): Promise<{ data: FullTestQuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<FullTestQuestionRow[]>(`assessment/full-tests/${testId}/questions`),
  );
}

export async function submitFullTest(
  testId: number,
  input: SubmitFullTestInput,
): Promise<{ data: FullTestResultRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<FullTestResultRow>(`assessment/full-tests/${testId}/submit`, input),
  );
}

/** Như `.maybeSingle()`: không có hoặc của người khác (404) → `{ data: null, error: null }`. */
export async function getFullTestResult(
  resultId: number,
): Promise<{ data: FullTestResultRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<FullTestResultRow>(`assessment/full-test-results/${resultId}`),
  );
  if (result.error?.code === "RESULT_NOT_FOUND") return { data: null, error: null };
  return result;
}

export async function getLatestFullTestResult(
  testId: number,
): Promise<{ data: FullTestResultRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<{ result: FullTestResultRow | null }>(
      `assessment/full-tests/${testId}/results/latest`,
    ),
  );
  if (result.error) return { data: null, error: result.error };
  return { data: result.data?.result ?? null, error: null };
}

export async function listFullTestAnswerDetails(
  resultId: number,
): Promise<{ data: FullTestAnswerDetailRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<FullTestAnswerDetailRow[]>(`assessment/full-test-results/${resultId}/answers`),
  );
}

export async function listCourseFullTests(
  courseId: number,
): Promise<{ data: FullTestRow[] | null; error: ApiError | null }> {
  return toResult(apiClient.get<FullTestRow[]>(`assessment/courses/${courseId}/full-tests`));
}

export async function listMyFullTestResults(): Promise<{
  data: FullTestResultWithTestRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<FullTestResultWithTestRow[]>("assessment/full-test-results/me"),
  );
}
