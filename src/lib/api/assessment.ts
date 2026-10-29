/**
 * Adapter assessment frontend gọi backend NestJS thay cho truy vấn Supabase (P3).
 * Trả về đúng shape { data, error } để component không phải đổi. Điểm và đáp án đúng
 * do server tính; client chỉ gửi id đáp án đã chọn.
 */
import { apiClient, toResult, ApiError } from "./client";
import type { VocabWordRow } from "./vocab";

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

export interface AdminFullTestDetailRow {
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
  courses: {
    id: number;
    title: string;
  } | null;
}

export interface AdminFullTestQuestionRow extends ReviewQuestionRow {
  part_number: number;
}

export interface UpdateFullTestPayload {
  title: string;
  description?: string | null;
  audio_url?: string | null;
  category?: string | null;
  release_date?: string | null;
}

export interface SaveFullTestAnswerPayload {
  id?: number;
  answer_text: string;
  is_correct?: boolean;
  explanation?: string | null;
}

export interface CreateFullTestQuestionPayload {
  part_number: number;
  display_order: number;
  question_text?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  passage_text?: string | null;
  group_id?: string | null;
  transcript?: string | null;
  translation?: string | null;
  answers: SaveFullTestAnswerPayload[];
}

export interface UpdateFullTestQuestionPayload {
  display_order: number;
  question_text?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  passage_text?: string | null;
  group_id?: string | null;
  transcript?: string | null;
  translation?: string | null;
  answers: SaveFullTestAnswerPayload[];
}

export interface UpdateQuestionGroupPayload {
  question_ids: number[];
  passage_text?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  group_id?: string | null;
}

/** Admin lấy chi tiết đề thi Full Test (T-024). */
export async function getAdminFullTestDetail(
  testId: number,
): Promise<{ data: AdminFullTestDetailRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<AdminFullTestDetailRow>(`assessment/admin/full-tests/${testId}`),
  );
}

/** Admin lấy danh sách câu hỏi đề thi Full Test kèm part_number (T-024). */
export async function getAdminFullTestQuestions(
  testId: number,
): Promise<{ data: AdminFullTestQuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<AdminFullTestQuestionRow[]>(
      `assessment/admin/full-tests/${testId}/questions`,
    ),
  );
}

/** Admin cập nhật thông tin đề thi Full Test (T-024). */
export async function updateAdminFullTest(
  testId: number,
  body: UpdateFullTestPayload,
): Promise<{ data: AdminFullTestDetailRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<AdminFullTestDetailRow>(
      `assessment/admin/full-tests/${testId}`,
      body,
    ),
  );
}

/** Admin tạo câu hỏi Full Test (T-024). */
export async function createAdminFullTestQuestion(
  testId: number,
  body: CreateFullTestQuestionPayload,
): Promise<{ data: AdminFullTestQuestionRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<AdminFullTestQuestionRow>(
      `assessment/admin/full-tests/${testId}/questions`,
      body,
    ),
  );
}

/** Admin cập nhật câu hỏi Full Test và đồng bộ đáp án (T-024). */
export async function updateAdminFullTestQuestion(
  id: number,
  body: UpdateFullTestQuestionPayload,
): Promise<{ data: AdminFullTestQuestionRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<AdminFullTestQuestionRow>(
      `assessment/admin/fulltest-questions/${id}`,
      body,
    ),
  );
}

/** Admin xóa câu hỏi Full Test (T-024). */
export async function deleteAdminFullTestQuestion(
  id: number,
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.delete(`assessment/admin/fulltest-questions/${id}`),
  );
  return { error: res.error };
}

/** Admin nhân bản câu hỏi Full Test (T-024). */
export async function duplicateAdminFullTestQuestion(
  id: number,
): Promise<{ data: AdminFullTestQuestionRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<AdminFullTestQuestionRow>(
      `assessment/admin/fulltest-questions/${id}/duplicate`,
    ),
  );
}

/** Admin cập nhật thông tin nhóm cho các câu hỏi Full Test (T-024). */
export async function updateAdminQuestionGroup(
  testId: number,
  body: UpdateQuestionGroupPayload,
): Promise<{ error: ApiError | null }> {
  const res = await toResult(
    apiClient.put(
      `assessment/admin/full-tests/${testId}/question-group`,
      body,
    ),
  );
  return { error: res.error };
}


export interface DictationDetailResponse {
  quiz: QuizRow;
  questions: ReviewQuestionRow[];
}

export interface DictationUserAnswerRow {
  id: number;
  question_id: number;
  is_correct: boolean | null;
  result_id: number;
}

export interface DictationProgressResponse {
  score: number;
  correct_answers: number;
  total_questions: number;
}

export interface DictationLessonResponse {
  id: number;
}

/** Lấy thông tin quiz và danh sách câu hỏi nghe chép chính tả (T-025). */
export async function getDictationQuiz(
  quizId: number,
): Promise<{ data: DictationDetailResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<DictationDetailResponse>(
      `assessment/dictation/quizzes/${quizId}`,
    ),
  );
}

/** Lấy bài học liên kết với quiz nghe chép chính tả (T-025). */
export async function getDictationLesson(
  quizId: number,
): Promise<{ data: DictationLessonResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<DictationLessonResponse | null>(
      `assessment/dictation/quizzes/${quizId}/lesson`,
    ),
  );
}

/** Lấy từ vựng gắn với câu hỏi trong quiz nghe chép chính tả (T-025). */
export async function getDictationVocab(
  quizId: number,
): Promise<{ data: VocabWordRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<VocabWordRow[]>(`assessment/dictation/quizzes/${quizId}/vocab`),
  );
}

/** Lấy hoặc tạo kết quả user_quiz_results mới nhất cho dictation (T-025). */
export async function getOrCreateDictationResult(
  quizId: number,
): Promise<{ data: QuizResultRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<QuizResultRow>(
      `assessment/dictation/quizzes/${quizId}/result`,
    ),
  );
}

/** Lấy danh sách câu đã hoàn thành của user cho quiz này (T-025). */
export async function getDictationAnswers(
  quizId: number,
): Promise<{ data: DictationUserAnswerRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<DictationUserAnswerRow[]>(
      `assessment/dictation/quizzes/${quizId}/answers`,
    ),
  );
}

/** Đánh dấu hoàn thành một câu hỏi nghe chép chính tả (T-025). */
export async function markDictationQuestionDone(
  quizId: number,
  questionId: number,
): Promise<{ data: DictationProgressResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<DictationProgressResponse>(
      `assessment/dictation/quizzes/${quizId}/questions/${questionId}/done`,
    ),
  );
}

/** Hủy đánh dấu hoàn thành một câu hỏi nghe chép chính tả (T-025). */
export async function unmarkDictationQuestionDone(
  quizId: number,
  questionId: number,
): Promise<{ data: DictationProgressResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.delete<DictationProgressResponse>(
      `assessment/dictation/quizzes/${quizId}/questions/${questionId}/done`,
    ),
  );
}

/** Đồng bộ danh sách câu hỏi đã hoàn thành trong session khi nộp bài (T-025). */
export async function syncDictationSession(
  quizId: number,
  questionIds: number[],
): Promise<{ data: DictationProgressResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<DictationProgressResponse>(
      `assessment/dictation/quizzes/${quizId}/sync`,
      { question_ids: questionIds },
    ),
  );
}

/** Reset toàn bộ tiến trình nghe chép chính tả của quiz này (T-025). */
export async function resetDictation(
  quizId: number,
): Promise<{ data: DictationProgressResponse | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<DictationProgressResponse>(
      `assessment/dictation/quizzes/${quizId}/reset`,
    ),
  );
}
