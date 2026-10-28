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
