import { apiClient, ApiError } from "./client";

export interface MediaUploadResult {
  path: string;
  public_url: string;
  publicUrl: string;
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
