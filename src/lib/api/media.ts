import { apiClient, ApiError, toResult } from "./client";

export interface MediaUploadResult {
  path: string;
  public_url: string;
  publicUrl: string;
}

export interface AdminMaterialRow {
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
  courses: { title: string } | null;
}

export interface CreateMaterialPayload {
  title: string;
  file_url: string;
  file_type?: string;
  folder_path?: string;
  course_id?: number | null;
  lesson_id?: number | null;
  quiz_id?: number | null;
  display_order?: number;
}

/**
 * Tải lên tệp media vào thư mục được cấu hình trên server (Admin).
 */
export async function uploadMedia(
  file: File | Blob,
  folder: string,
  filename?: string,
): Promise<MediaUploadResult> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file, file.name);
  } else {
    formData.append("file", file, filename || "upload.bin");
  }
  formData.append("folder", folder);
  if (filename) {
    formData.append("filename", filename);
  }

  const res = await apiClient.post<{ path: string; public_url: string }>(
    "/media/upload",
    formData,
  );

  return {
    path: res.path,
    public_url: res.public_url,
    publicUrl: res.public_url,
  };
}

/**
 * Tải lên ảnh đại diện hoặc ảnh bìa cá nhân (Học viên & Admin).
 */
export async function uploadAvatar(
  file: File | Blob,
  folder: "avatars" | "covers" = "avatars",
): Promise<MediaUploadResult> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append("file", file, file.name);
  } else {
    formData.append("file", file, "image.png");
  }
  formData.append("folder", folder);

  const res = await apiClient.post<{ path: string; public_url: string }>(
    "/media/avatar",
    formData,
  );

  return {
    path: res.path,
    public_url: res.public_url,
    publicUrl: res.public_url,
  };
}

/**
 * Phiên bản bọc { data, error } tương thích với các component cũ xử lý lỗi theo kiểu Supabase.
 */
export async function uploadMediaSafe(
  file: File | Blob,
  folder: string,
  filename?: string,
): Promise<{ data: { publicUrl: string; path: string } | null; error: ApiError | Error | null }> {
  try {
    const data = await uploadMedia(file, folder, filename);
    return { data, error: null };
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Admin: Lấy danh sách tài liệu thư viện (có thể lọc theo course_id hoặc folder_path)
 */
export async function listAdminMaterials(
  filters?: { course_id?: number; folder_path?: string },
): Promise<{ data: AdminMaterialRow[] | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<AdminMaterialRow[]>("admin/materials", {
      query: {
        course_id: filters?.course_id,
        folder_path: filters?.folder_path,
      },
    }),
  );
}

/**
 * Admin: Thêm tài liệu mới vào thư viện
 */
export async function createAdminMaterial(
  payload: CreateMaterialPayload,
): Promise<{ data: AdminMaterialRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<AdminMaterialRow>("admin/materials", payload),
  );
}

/**
 * Admin: Xóa 1 tài liệu theo ID
 */
export async function deleteAdminMaterial(
  id: number,
): Promise<{ data: void | null; error: ApiError | null }> {
  return toResult(
    apiClient.delete<void>(`admin/materials/${id}`),
  );
}

/**
 * Admin: Đổi tên thư mục trong transaction
 */
export async function renameAdminMaterialFolder(
  oldPath: string,
  newPath: string,
): Promise<{ data: { count: number } | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<{ count: number }>("admin/materials/rename-folder", {
      old_path: oldPath,
      new_path: newPath,
    }),
  );
}

/**
 * Admin: Xóa thư mục và các tệp bên trong trong transaction
 */
export async function deleteAdminMaterialFolder(
  folderPath: string,
): Promise<{ data: { count: number } | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<{ count: number }>("admin/materials/delete-folder", {
      folder_path: folderPath,
    }),
  );
}

