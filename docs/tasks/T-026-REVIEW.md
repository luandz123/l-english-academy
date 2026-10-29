# Review T-026 (Claude, 2026-10-29) — ✅ PASS (lần 2)

Review trên `fdafc66`. Phần còn lại tốt: service key chỉ ở server và không commit, `folder` theo danh sách cho phép, tên file được làm sạch (không có `/` → không thoát thư mục), `/media/upload` chỉ admin, `StorageService` có 2 implementation thật. Phải sửa 2 điểm rồi push lại cùng nhánh:

1. **Giới hạn kích thước ngay ở multer** (chống tràn bộ nhớ). Hiện `FileInterceptor('file')` không có `limits` → multer đọc trọn file vào RAM rồi service mới kiểm `file.size`. `/media/avatar` mở cho mọi học viên đã đăng nhập → gửi file vài GB làm sập Render. Sửa:
   - `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_FILE_SIZE, files: 1 } }))` cho `/media/upload`;
   - `FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_FILE_SIZE, files: 1 } })` cho `/media/avatar`;
   - Lỗi vượt cỡ của multer (`PayloadTooLargeException` / `LIMIT_FILE_SIZE`) phải ra 413 hoặc 400 `{ code: 'FILE_TOO_LARGE' }`, không 500. Thêm e2e: avatar 6 MB → 413/400, server không lỗi.
2. **Bỏ `image/svg+xml` khỏi `ALLOWED_AVATAR_MIME_TYPES`.** SVG chứa được script; học viên tự tải lên bucket công khai. Giữ JPG, PNG, WebP, GIF. Kiểm thêm phần mở rộng file khớp MIME (ảnh `.svg` gửi kèm `image/png` → 400). Thêm e2e.

Sau khi sửa: chạy lại lệnh kiểm tra, dán output nguyên văn **sau commit cuối**, push lại `task/T-026-media-upload`.

---

## Lần 2 (trên `cb968f2`) — ✅ PASS, merged

- Điểm 1: `FileInterceptor` có `limits.fileSize` (50 MB upload, 5 MB avatar) + `files: 1`; vượt cỡ → `FILE_TOO_LARGE` (e2e avatar 6 MB). 50 MB khớp giới hạn mỗi file của Supabase gói free nên không làm hỏng audio Full Test cũ.
- Điểm 2: bỏ SVG; đuôi file phải khớp MIME (e2e `.svg` gửi `image/png` → 400). Đây là thay đổi hành vi có chủ đích vì bảo mật (code cũ nhận mọi ảnh).
- Production thiếu `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` → env schema chặn khởi động (không âm thầm dùng storage giả).
- **Claude sửa khi merge:** `AdminCourseJsonImport.tsx` có hàm local `uploadMedia` che hàm import cùng tên → hàm tự gọi lại chính nó với `Blob`, lỗi bị `catch` nuốt, media import từ JSON không bao giờ được upload. Đổi thành `import { uploadMedia as uploadMediaFile }`. Bắt được nhờ bước `tsc` mới.
- Lỗi `tsc` có sẵn ở `AdminBackup.tsx:308` (cột `created_at` không có trong `user_full_test_results`) — file chưa đổi, để T-033.

Kiểm tra sau gộp (merge/T-026):
```
LINT_TYPE_OK
Tests:       319 passed, 319 total
Tests:       356 passed, 356 total
BUILD_OK
Tests  200 passed (200)
FE_LINT_OK
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
supabase.storage left: 0
✓ built in 46.36s
```
