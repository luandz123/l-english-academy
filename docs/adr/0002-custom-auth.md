# ADR 0002: Tự xây dựng Auth bằng Passport + JWT thay cho Supabase Auth

- **Trạng thái**: Đã chấp thuận
- **Ngày**: 2026-10-25
- **Người quyết định**: Chủ dự án (DECISIONS D-05 → D-09)
- **Tài liệu tham chiếu**: [DECISIONS.md](../DECISIONS.md), [REFACTOR_PLAN.md](../REFACTOR_PLAN.md) §2 P1

---

## 1. Bối Cảnh
Frontend dùng `supabase.auth` ở 25 chỗ (đăng ký, đăng nhập, Google OAuth qua Supabase hoặc Lovable, quên/đặt lại mật khẩu, admin tạo học viên bằng client tạm `AdminStudents.tsx:38`). Mọi policy RLS dựa vào `auth.uid()`. Trigger `on_auth_user_created` → `handle_new_user()` tạo `profiles` + `user_roles('student')`. Chưa có người dùng thật nên không phải giữ tài khoản cũ.

## 2. Quyết Định
- `AuthModule` trong NestJS: bảng `users` (đã có trong migration baseline: email, `password_hash` argon2id, `google_id`, `email_verified_at`) và `refresh_tokens` (P1: `family_id`, hash của token, `revoked_at`).
- Access token JWT 15 phút qua `Authorization: Bearer`. Refresh token ngẫu nhiên trong cookie `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`, xoay vòng mỗi lần dùng. Token đã dùng bị dùng lại → thu hồi cả `family_id`.
- Đăng ký tạo `users` + `profiles` + `user_roles('student')` trong một transaction (thay `handle_new_user`, giữ quy tắc `full_name` = `full_name` → `name` → phần trước `@` của email).
- Google OAuth bằng `passport-google-oauth20`. Bỏ nhánh Lovable (chỉ chạy trên `*.lovable.app`).
- Email xác nhận/đặt lại mật khẩu qua Nodemailer (Mailpit khi dev, Gmail SMTP khi production).
- `JwtAuthGuard` + `RolesGuard` (`@Roles('admin')`) thay các policy RLS dựa trên `has_role`.

## 3. Hệ Quả
- **Tích cực**: gỡ hẳn Supabase; kiểm soát toàn bộ vòng đời phiên; mỗi quy tắc phân quyền có test.
- **Đánh đổi**: tự chịu trách nhiệm bảo mật (rate limit đăng nhập, chống liệt kê email, hết hạn token reset). Không chạy song song được với các module còn gọi Supabase → ADR 0004.

## 4. Các Phương Án Đã Loại Bỏ
1. **Giữ Supabase Auth, NestJS chỉ verify JWT Supabase**: nhanh lúc đầu nhưng vẫn phụ thuộc Supabase, phải làm lại sau.
2. **Thư viện auth đóng gói (Better Auth…)**: ít code hơn nhưng khó giải thích từng cơ chế; Passport là chuẩn của hệ NestJS.
3. **Refresh token trong localStorage**: lộ trước XSS.
