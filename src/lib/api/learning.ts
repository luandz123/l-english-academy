/**
 * Adapter learning frontend gọi backend NestJS thay cho truy vấn Supabase (T-007).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";
import type { CourseRow } from "./catalog";

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

export interface MyEnrollmentRow extends EnrollmentRow {
  courses: CourseRow | null;
}

export interface AdminEnrollmentRow extends EnrollmentRow {
  courses: { title: string } | null;
}

export interface AdminEnrollmentListRow extends AdminEnrollmentRow {
  profiles: {
    id: string;
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface CourseEnrollmentRow extends EnrollmentRow {
  profiles: {
    user_id: string;
    full_name: string | null;
  } | null;
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

/** Dòng tiến độ cho Dashboard/MyCourses/Profile (OPEN_QUESTIONS #19). */
export interface LegacyProgressRow extends LessonProgressRow {
  created_at: string | null;   // = last_watched_at
  completed_at: string | null; // = last_watched_at
  updated_at: null;
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

export interface PracticeAnswerRow {
  id: number;
  question_id: number | null;
  answer_text: string | null;
  display_order: number;
  is_correct: boolean | null;
  explanation: string | null;
}

export interface PracticeQuestionRow {
  id: number;
  quiz_id: number | null;
  question_text: string | null;
  question_type: string | null;
  image_url: string | null;
  audio_url: string | null;
  display_order: number;
  translation: string | null;
  dictation_keywords: string | null;
  explanation: string | null;
  transcript: string | null;
  knowledge_tag: string | null;
  passage_text: string | null;
  group_id: string | null;
  answers: PracticeAnswerRow[];
}

export interface SaveLessonPayload {
  title: string;
  lesson_type: string;
  video_url?: string | null;
  pdf_url?: string | null;
  duration_seconds: number;
}

export interface PatchLessonPayload {
  is_free?: boolean;
  is_published?: boolean;
}

export interface SavePracticePayload {
  quiz_id?: number | null;
  trigger_at_seconds: number;
  title: string;
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

export async function listMyProgressRows(): Promise<{
  data: LegacyProgressRow[] | null;
  error: ApiError | null;
}> {
  const result = await listMyProgress();
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }
  return {
    data: result.data.map((row) => ({
      ...row,
      created_at: row.last_watched_at ?? null,
      completed_at: row.last_watched_at ?? null,
      updated_at: null,
    })),
    error: null,
  };
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

export async function listPracticeQuestions(
  lessonId: number,
  practiceId: number,
): Promise<{ data: PracticeQuestionRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<PracticeQuestionRow[]>(
      `learning/lessons/${lessonId}/practices/${practiceId}/questions`,
    ),
  );
}

export async function listAllEnrollments(): Promise<{
  data: AdminEnrollmentListRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminEnrollmentListRow[]>('learning/admin/enrollments'),
  );
}

export async function listCourseEnrollments(courseId: number): Promise<{
  data: CourseEnrollmentRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<CourseEnrollmentRow[]>(
      `learning/admin/courses/${courseId}/enrollments`,
    ),
  );
}

export async function listUserEnrollments(
  userId: string,
): Promise<{ data: AdminEnrollmentRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<AdminEnrollmentRow[]>(
      `learning/admin/users/${userId}/enrollments`,
    ),
  );
}

export async function addUserEnrollment(
  userId: string,
  courseId: number,
  expiresInDays: number | null,
): Promise<{ data: AdminEnrollmentRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.post<AdminEnrollmentRow>(
      `learning/admin/users/${userId}/enrollments`,
      {
        course_id: courseId,
        expires_in_days: expiresInDays,
      },
    ),
  );
  if (result.error?.code === "ENROLLMENT_EXISTS") {
    return {
      data: null,
      error: new ApiError(409, "23505", result.error.message, result.error.details),
    };
  }
  return result;
}

export async function removeEnrollment(
  enrollmentId: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.delete<void>(`learning/admin/enrollments/${enrollmentId}`),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function createLesson(
  moduleId: number,
  body: SaveLessonPayload,
): Promise<{ data: LessonRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<LessonRow>(`learning/admin/modules/${moduleId}/lessons`, body),
  );
}

export async function updateLesson(
  id: number,
  body: SaveLessonPayload,
): Promise<{ data: LessonRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<LessonRow>(`learning/admin/lessons/${id}`, body),
  );
}

export async function patchLesson(
  id: number,
  body: PatchLessonPayload,
): Promise<{ data: LessonRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.patch<LessonRow>(`learning/admin/lessons/${id}`, body),
  );
}

export async function deleteLesson(
  id: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.delete<void>(`learning/admin/lessons/${id}`),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function reorderLessons(
  moduleId: number,
  lessonIds: number[],
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.put<void>(`learning/admin/modules/${moduleId}/lesson-order`, {
      lesson_ids: lessonIds,
    }),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function createPractice(
  lessonId: number,
  body: SavePracticePayload,
): Promise<{ data: PracticeRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<PracticeRow>(
      `learning/admin/lessons/${lessonId}/practices`,
      body,
    ),
  );
}

export async function updatePractice(
  id: number,
  body: SavePracticePayload,
): Promise<{ data: PracticeRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<PracticeRow>(`learning/admin/practices/${id}`, body),
  );
}

export async function deletePractice(
  id: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.delete<void>(`learning/admin/practices/${id}`),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

/** Lấy danh sách modules của các khóa học đã ghi danh (T-033 / #12). */
export async function getMyCoursesModules(): Promise<{
  data: unknown[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<unknown[]>('learning/my-courses/modules'));
}

/** Lấy danh sách ghi danh của chính user kèm thông tin khóa học (T-035). */
export async function getMyEnrollments(): Promise<{
  data: MyEnrollmentRow[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<MyEnrollmentRow[]>('learning/my-enrollments'));
}
