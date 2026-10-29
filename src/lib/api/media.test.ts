import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "./client";
import { uploadAvatar, uploadMedia, uploadMediaSafe } from "./media";

describe("src/lib/api/media", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("uploadMedia", () => {
    it("gửi đúng FormData đến /media/upload và trả về publicUrl", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        path: "lesson_pdfs/123_test.pdf",
        public_url: "https://test.supabase.co/storage/v1/object/public/materials/lesson_pdfs/123_test.pdf",
      });

      const file = new File(["test-content"], "test.pdf", { type: "application/pdf" });
      const res = await uploadMedia(file, "lesson_pdfs", "custom_name.pdf");

      expect(postSpy).toHaveBeenCalledTimes(1);
      const [path, body] = postSpy.mock.calls[0];
      expect(path).toBe("/media/upload");
      expect(body).toBeInstanceOf(FormData);
      const fd = body as FormData;
      expect(fd.get("folder")).toBe("lesson_pdfs");
      expect(fd.get("filename")).toBe("custom_name.pdf");

      expect(res.path).toBe("lesson_pdfs/123_test.pdf");
      expect(res.public_url).toBe(
        "https://test.supabase.co/storage/v1/object/public/materials/lesson_pdfs/123_test.pdf",
      );
      expect(res.publicUrl).toBe(
        "https://test.supabase.co/storage/v1/object/public/materials/lesson_pdfs/123_test.pdf",
      );
    });
  });

  describe("uploadAvatar", () => {
    it("gửi đúng FormData đến /media/avatar với folder mặc định", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        path: "profiles/avatars/user-1-123.png",
        public_url: "https://test.supabase.co/storage/v1/object/public/materials/profiles/avatars/user-1-123.png",
      });

      const blob = new Blob(["image-bytes"], { type: "image/png" });
      const res = await uploadAvatar(blob);

      expect(postSpy).toHaveBeenCalledTimes(1);
      const [path, body] = postSpy.mock.calls[0];
      expect(path).toBe("/media/avatar");
      expect(body).toBeInstanceOf(FormData);
      const fd = body as FormData;
      expect(fd.get("folder")).toBe("avatars");

      expect(res.path).toBe("profiles/avatars/user-1-123.png");
      expect(res.publicUrl).toContain("profiles/avatars/user-1-123.png");
    });

    it("gửi đúng FormData khi folder là covers", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        path: "profiles/covers/user-1-123.jpg",
        public_url: "https://test.supabase.co/storage/v1/object/public/materials/profiles/covers/user-1-123.jpg",
      });

      const file = new File(["cover-bytes"], "cover.jpg", { type: "image/jpeg" });
      const res = await uploadAvatar(file, "covers");

      expect(postSpy).toHaveBeenCalledTimes(1);
      const fd = postSpy.mock.calls[0][1] as FormData;
      expect(fd.get("folder")).toBe("covers");
      expect(res.path).toBe("profiles/covers/user-1-123.jpg");
    });
  });

  describe("uploadMediaSafe", () => {
    it("trả về { data, error: null } khi thành công", async () => {
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        path: "uploads/1_file.pdf",
        public_url: "https://test.supabase.co/file.pdf",
      });

      const file = new File(["content"], "file.pdf");
      const { data, error } = await uploadMediaSafe(file, "uploads");

      expect(error).toBeNull();
      expect(data?.publicUrl).toBe("https://test.supabase.co/file.pdf");
    });

    it("trả về { data: null, error } khi thất bại mà không throw", async () => {
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new ApiError(400, "FILE_TOO_LARGE", "Kích thước quá lớn"),
      );

      const file = new File(["content"], "file.pdf");
      const { data, error } = await uploadMediaSafe(file, "uploads");

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("FILE_TOO_LARGE");
    });
  });
});
