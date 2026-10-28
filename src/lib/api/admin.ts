/**
 * Adapter admin frontend gọi backend NestJS thay cho truy vấn Supabase (T-014, T-018, T-020).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";
import type { ProfileRow } from "./auth";

export interface AdminStudentNoteRow {
  id: number;
  admin_id: string;
  student_id: string;
  content: string;
  created_at: string | null;
}

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string | null;
}

export interface AdminCountsRow {
  total_students: number;
  total_courses: number;
  total_quiz_attempts: number;
}

export interface AdminRecentEnrollmentRow {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string | null;
  expires_at: string | null;
  courses: {
    title: string;
  } | null;
  profiles: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface AdminRecentQuizResultRow {
  id: number;
  user_id: string;
  quiz_id: number;
  score: number;
  correct_answers: number | null;
  total_questions: number | null;
  completed_at: string | null;
  quizzes: {
    title: string;
  } | null;
  profiles: {
    user_id: string;
    full_name: string | null;
  } | null;
}

export interface AdminQuizScoresRow {
  quizzes: { id: number; title: string }[];
  results: { quiz_id: number; score: number }[];
}

export interface AdminCourseEnrollmentsRow {
  courses: { id: number; title: string }[];
  enrollments: { course_id: number }[];
}

export interface AdminUserAnswerRow {
  question_id: number;
  is_correct: boolean | null;
}

export interface AdminQuestionRow {
  id: number;
  question_text: string | null;
}

export interface AdminStudentsRow {
  profiles: ProfileRow[];
  enrollments: { user_id: string; expires_at: string | null }[];
}

/** Danh sách ghi chú của một học viên (ADM-004). */
export async function listStudentNotes(
  userId: string,
): Promise<{ data: AdminStudentNoteRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<AdminStudentNoteRow[]>(`admin/users/${userId}/notes`),
  );
}

/** Thêm ghi chú cho học viên (ADM-004). `admin_id` lấy từ token trên server. */
export async function addStudentNote(
  userId: string,
  content: string,
): Promise<{ data: AdminStudentNoteRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<AdminStudentNoteRow>(`admin/users/${userId}/notes`, {
      content,
    }),
  );
}

/** Đọc một cài đặt công khai (không cần đăng nhập, bóc .setting). */
export async function getPublicSetting(
  key: string,
): Promise<{ data: SettingRow | null; error: ApiError | null }> {
  const res = await toResult(
    apiClient.get<{ setting: SettingRow | null }>(
      `settings/${encodeURIComponent(key)}`,
    ),
  );
  if (res.error) {
    return { data: null, error: res.error };
  }
  return { data: res.data?.setting ?? null, error: null };
}

/** Admin xem danh sách mọi cài đặt nền tảng. */
export async function listAdminSettings(): Promise<{
  data: SettingRow[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<SettingRow[]>('admin/settings'));
}

/** Admin cập nhật hoặc tạo mới một cài đặt nền tảng. */
export async function saveSetting(
  key: string,
  value: string,
): Promise<{ data: SettingRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.put<SettingRow>(`admin/settings/${encodeURIComponent(key)}`, {
      value,
    }),
  );
}

/** Admin xem tổng số lượng học viên, khóa học, lượt thi (ADM-001). */
export async function getAdminStatsCounts(): Promise<{
  data: AdminCountsRow | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<AdminCountsRow>('admin/stats/counts'));
}

/** Admin xem 5 lượt đăng ký khóa học gần nhất (ADM-001). */
export async function getAdminRecentEnrollments(): Promise<{
  data: AdminRecentEnrollmentRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminRecentEnrollmentRow[]>('admin/stats/recent-enrollments'),
  );
}

/** Admin xem 5 kết quả thi gần nhất (ADM-001). */
export async function getAdminRecentResults(): Promise<{
  data: AdminRecentQuizResultRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminRecentQuizResultRow[]>('admin/stats/recent-results'),
  );
}

/** Admin xem điểm trung bình các bài thi (ADM-001). */
export async function getAdminQuizScores(): Promise<{
  data: AdminQuizScoresRow | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<AdminQuizScoresRow>('admin/stats/quiz-scores'));
}

/** Admin xem phân bố học viên theo khóa học (ADM-018). */
export async function getAdminCourseEnrollments(): Promise<{
  data: AdminCourseEnrollmentsRow | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminCourseEnrollmentsRow>('admin/stats/course-enrollments'),
  );
}

/** Admin xem câu trả lời để phân tích câu hỏi khó (ADM-018). */
export async function getAdminUserAnswers(): Promise<{
  data: AdminUserAnswerRow[] | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<AdminUserAnswerRow[]>('admin/stats/answers'));
}

/** Admin lấy danh sách câu hỏi theo IDs (ADM-018). */
export async function getAdminQuestionsByIds(
  ids: number[],
): Promise<{ data: AdminQuestionRow[] | null; error: ApiError | null }> {
  const query = ids.length ? `?ids=${ids.join(',')}` : '';
  return toResult(
    apiClient.get<AdminQuestionRow[]>(`admin/stats/questions${query}`),
  );
}

/** Admin xem danh sách học viên kèm tóm tắt ghi danh (ADM-002). */
export async function getAdminStudents(): Promise<{
  data: AdminStudentsRow | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.get<AdminStudentsRow>('admin/stats/students'));
}
