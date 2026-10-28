/**
 * Adapter catalog frontend gọi backend NestJS thay cho truy vấn Supabase (T-002).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";

export type CourseType =
  | "video_quiz"
  | "flashcard"
  | "listening"
  | "speaking"
  | "fulltest";

export interface CourseCategoryRow {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface CourseRow {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  course_type: string;
  category_id: number | null;
  price: number | null;
  duration_months: number | null;
  thumbnail_url: string | null;
  instructor: string | null;
  is_active: boolean | null;
  is_free: boolean | null;
  display_order: number | null;
  created_at: string | null;
}

export interface AdminLessonRow {
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

export interface AdminQuizRow {
  id: number;
  module_id: number | null;
  title: string;
  time_limit_seconds: number | null;
  total_questions: number | null;
  display_order: number;
  created_at: string | null;
}

export interface AdminModuleRow {
  id: number;
  course_id: number | null;
  title: string;
  description: string | null;
  display_order: number;
  is_free: boolean | null;
  is_published: boolean;
}

export interface AdminModuleWithDetailsRow extends AdminModuleRow {
  lessons: AdminLessonRow[];
  quizzes: AdminQuizRow[];
}

export interface SaveModulePayload {
  title: string;
  description?: string | null;
  is_free?: boolean;
}

export interface PatchModulePayload {
  is_free?: boolean;
  is_published?: boolean;
}

export async function listCategories(params?: {
  active?: boolean;
}): Promise<{ data: CourseCategoryRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<CourseCategoryRow[]>("catalog/categories", {
      query:
        params?.active !== undefined ? { active: params.active } : undefined,
    }),
  );
}

export async function listCourses(params?: {
  active?: boolean;
  courseType?: CourseType;
}): Promise<{ data: CourseRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<CourseRow[]>("catalog/courses", {
      query: {
        ...(params?.active !== undefined ? { active: params.active } : {}),
        ...(params?.courseType ? { courseType: params.courseType } : {}),
      },
    }),
  );
}

export async function countCourses(params?: {
  active?: boolean;
}): Promise<{ count: number | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<{ count: number }>("catalog/courses/count", {
      query:
        params?.active !== undefined ? { active: params.active } : undefined,
    }),
  );
  if (result.error) {
    return { count: null, error: result.error };
  }
  return { count: result.data?.count ?? null, error: null };
}

export async function getCourse(
  id: number,
): Promise<{ data: CourseRow | null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.get<CourseRow>(`catalog/courses/${id}`),
  );
  if (result.error && result.error.code === "COURSE_NOT_FOUND") {
    return { data: null, error: null };
  }
  return result;
}

export async function getAdminCourseModules(
  courseId: number,
): Promise<{
  data: AdminModuleWithDetailsRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminModuleWithDetailsRow[]>(
      `catalog/admin/courses/${courseId}/modules`,
    ),
  );
}

export async function createModule(
  courseId: number,
  body: SaveModulePayload,
): Promise<{ data: AdminModuleRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<AdminModuleRow>(
      `catalog/admin/courses/${courseId}/modules`,
      body,
    ),
  );
}

export async function updateModule(
  id: number,
  body: SaveModulePayload,
): Promise<{ data: AdminModuleRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<AdminModuleRow>(`catalog/admin/modules/${id}`, body),
  );
}

export async function patchModule(
  id: number,
  body: PatchModulePayload,
): Promise<{ data: AdminModuleRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.patch<AdminModuleRow>(`catalog/admin/modules/${id}`, body),
  );
}

export async function deleteModule(
  id: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.delete<void>(`catalog/admin/modules/${id}`),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function reorderModules(
  courseId: number,
  moduleIds: number[],
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.put<void>(`catalog/admin/courses/${courseId}/module-order`, {
      module_ids: moduleIds,
    }),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}

export async function setFreeModule(
  courseId: number,
  moduleId: number,
): Promise<{ data: null; error: ApiError | null }> {
  const result = await toResult(
    apiClient.put<void>(`catalog/admin/courses/${courseId}/free-module`, {
      module_id: moduleId,
    }),
  );
  if (result.error) {
    return { data: null, error: result.error };
  }
  return { data: null, error: null };
}
