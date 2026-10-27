/**
 * Adapter learning frontend gọi backend NestJS thay cho truy vấn Supabase (T-007).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";

export interface LessonRow {
  id: number;
  module_id: number | null;
  title: string;
  video_url: string | null;
  duration_seconds: number | null;
  display_order: number;
  is_live: boolean | null;
  live_time: string | null;
  lesson_type: string;
  quiz_id: number | null;
  pdf_url: string | null;
  is_free: boolean | null;
  is_published: boolean;
}

export interface CurriculumModuleRow {
  id: number;
  course_id: number | null;
  title: string;
  description: string | null;
  display_order: number;
  is_free: boolean | null;
  is_published: boolean;
  lessons: LessonRow[];
}

export interface EnrollmentRow {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string | null;
  expires_at: string | null;
}

export interface MaterialRow {
  id: number;
  lesson_id: number | null;
  quiz_id: number | null;
  course_id: number | null;
  title: string;
  file_url: string;
  file_type: string | null;
  display_order: number;
  created_at: string | null;
  folder_path: string | null;
}

export interface LessonProgressRow {
  id: number;
  user_id: string;
  lesson_id: number;
  is_completed: boolean | null;
  last_watched_at: string | null;
  watch_duration_seconds: number | null;
}

export interface FavoriteRow {
  id: number;
  user_id: string;
  lesson_id: number;
  created_at: string | null;
}

export interface NoteRow {
  id: number;
  user_id: string;
  lesson_id: number;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PracticeQuizRow {
  id: number;
  title: string;
  total_questions: number;
}

export interface PracticeRow {
  id: number;
  lesson_id: number;
  quiz_id: number | null;
  trigger_at_seconds: number;
  title: string | null;
  display_order: number;
  created_at: string | null;
  quizzes: PracticeQuizRow | null;
}

export async function getCurriculum(
  courseId: number,
): Promise<{ data: CurriculumModuleRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<CurriculumModuleRow[]>(`learning/courses/${courseId}/curriculum`),
  );
}

export async function getMyEnrollment(
  courseId: number,
): Promise<{ data: EnrollmentRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<{ enrollment: EnrollmentRow | null }>(
      `learning/courses/${courseId}/enrollment`,
    ),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: result.data?.enrollment ?? null, error: null };
}

export async function listLessonMaterials(
  lessonId: number,
): Promise<{ data: MaterialRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<MaterialRow[]>(`learning/lessons/${lessonId}/materials`),
  );
}

export async function listMyProgress(): Promise<{
  data: LessonProgressRow[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<LessonProgressRow[]>("learning/progress"));
}

export async function setLessonProgress(
  lessonId: number,
  isCompleted: boolean,
): Promise<{ data: LessonProgressRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<LessonProgressRow>(`learning/lessons/${lessonId}/progress`, {
      is_completed: isCompleted,
    }),
  );
}

export async function listMyFavorites(): Promise<{
  data: FavoriteRow[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<FavoriteRow[]>("learning/favorites"));
}

export async function addFavorite(
  lessonId: number,
): Promise<{ data: FavoriteRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<FavoriteRow>(`learning/lessons/${lessonId}/favorite`),
  );
}

export async function removeFavorite(
  lessonId: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.delete<void>(`learning/lessons/${lessonId}/favorite`),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function listMyNotes(
  lessonId: number,
): Promise<{ data: NoteRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<NoteRow[]>(`learning/lessons/${lessonId}/notes`),
  );
}

export async function addNote(
  lessonId: number,
  content: string,
): Promise<{ data: NoteRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<NoteRow>(`learning/lessons/${lessonId}/notes`, { content }),
  );
}

export async function listLessonPractices(
  lessonId: number,
): Promise<{ data: PracticeRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<PracticeRow[]>(`learning/lessons/${lessonId}/practices`),
  );
}
