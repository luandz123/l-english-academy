/**
 * Adapter admin frontend gọi backend NestJS thay cho truy vấn Supabase (T-014).
 * Trả về đúng shape { data, error } để component không phải đổi.
 */
import { apiClient, toResult, ApiError } from "./client";

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

