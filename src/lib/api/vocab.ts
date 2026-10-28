/**
 * Adapter từ vựng và flashcard frontend gọi backend NestJS thay cho truy vấn Supabase (T-021).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";

export interface VocabCategoryRow {
  id: number;
  course_id: number | null;
  title: string;
  display_order: number;
}

export interface VocabQuizRow {
  id: number;
  category_id: number | null;
  title: string;
  total_questions: number;
  display_order: number;
  lesson_id: number | null;
}

export interface VocabWordRow {
  id: number;
  vocab_quiz_id: number | null;
  word: string;
  phonetic: string | null;
  definition_en: string | null;
  definition_vi: string | null;
  example_sentence: string | null;
  image_url: string | null;
  audio_male_url: string | null;
  audio_female_url: string | null;
  wrong_answer_1: string | null;
  wrong_answer_2: string | null;
  wrong_answer_3: string | null;
  display_order: number;
  question_id: number | null;
}

export interface LessonQuizIdRow {
  quiz_id: number | null;
}

/** Danh sách danh mục từ vựng theo khóa học (ASM-018). */
export async function listVocabCategories(
  courseId: number,
): Promise<{ data: VocabCategoryRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<VocabCategoryRow[]>(
      `assessment/vocab/courses/${courseId}/categories`,
    ),
  );
}

/** Danh sách bài quiz từ vựng theo danh mục (ASM-018). */
export async function listVocabQuizzes(
  categoryId: number,
): Promise<{ data: VocabQuizRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<VocabQuizRow[]>(
      `assessment/vocab/categories/${categoryId}/quizzes`,
    ),
  );
}

/** Danh sách từ vựng theo bài quiz (ASM-018). */
export async function listVocabWords(
  vocabQuizId: number,
): Promise<{ data: VocabWordRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<VocabWordRow[]>(
      `assessment/vocab/quizzes/${vocabQuizId}/words`,
    ),
  );
}

/** Lấy từ vựng cho bài học theo chuỗi dò 4 bước và lọc question_ids (ASM-019). */
export async function getLessonVocabWords(
  ref: number,
  questionIds?: number[],
): Promise<{ data: VocabWordRow[] | null; error: ApiError | null }> {
  const query =
    questionIds && questionIds.length > 0
      ? `?question_ids=${questionIds.join(",")}`
      : "";
  return toResult(
    apiClient.get<VocabWordRow[]>(
      `assessment/vocab/lessons/${ref}/words${query}`,
    ),
  );
}

/** Lấy quiz_id của bài học (ASM-019). Bóc .lesson trả về { quiz_id } hoặc null. */
export async function getLessonQuizId(
  lessonId: number,
): Promise<{ data: LessonQuizIdRow | null; error: ApiError | null }> {
  const res = await toResult(
    apiClient.get<{ lesson: LessonQuizIdRow | null }>(
      `assessment/vocab/lessons/${lessonId}/quiz-id`,
    ),
  );
  if (res.error) {
    return { data: null, error: res.error };
  }
  return { data: res.data?.lesson ?? null, error: null };
}
