# Review T-026 (Claude, 2026-10-29) — 🔁 TRẢ LẠI

Review trên `fdafc66`. Phần còn lại tốt: service key chỉ ở server và không commit, `folder` theo danh sách cho phép, tên file được làm sạch (không có `/` → không thoát thư mục), `/media/upload` chỉ admin, `StorageService` có 2 implementation thật. Phải sửa 2 điểm rồi push lại cùng nhánh:

1. **Giới hạn kích thước ngay ở multer** (chống tràn bộ nhớ). Hiện `FileInterceptor('file')` không có `limits` → multer đọc trọn file vào RAM rồi service mới kiểm `file.size`. `/media/avatar` mở cho mọi học viên đã đăng nhập → gửi file vài GB làm sập Render. Sửa:
   - `@UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_FILE_SIZE, files: 1 } }))` cho `/media/upload`;
   - `FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_FILE_SIZE, files: 1 } })` cho `/media/avatar`;
   - Lỗi vượt cỡ của multer (`PayloadTooLargeException` / `LIMIT_FILE_SIZE`) phải ra 413 hoặc 400 `{ code: 'FILE_TOO_LARGE' }`, không 500. Thêm e2e: avatar 6 MB → 413/400, server không lỗi.
2. **Bỏ `image/svg+xml` khỏi `ALLOWED_AVATAR_MIME_TYPES`.** SVG chứa được script; học viên tự tải lên bucket công khai. Giữ JPG, PNG, WebP, GIF. Kiểm thêm phần mở rộng file khớp MIME (ảnh `.svg` gửi kèm `image/png` → 400). Thêm e2e.

Sau khi sửa: chạy lại lệnh kiểm tra, dán output nguyên văn **sau commit cuối**, push lại `task/T-026-media-upload`.
