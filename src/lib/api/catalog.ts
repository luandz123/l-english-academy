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
  if (
    result.error &&
    (result.error.status === 404 || result.error.code === "COURSE_NOT_FOUND")
  ) {
    return { data: null, error: null };
  }
  return result;
}
