# T-003: Đổi các trang auth từ `supabase.auth` sang `src/lib/api/auth.ts`

> **Người làm**: Antigravity · **Module**: Auth (frontend) · **Nhánh**: `task/T-003-auth-adapter` (tách từ `refactor/nestjs-backend` **sau khi** `task/P1-auth` và T-002 đã merge)
> **Phụ thuộc**: P1-auth merge, T-002 merge (proxy `/api/v1` trong `vite.config.ts`) · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `docs/REFACTOR_PLAN.md` §5 (**vùng được sửa**), `src/lib/api/auth.ts`, `docs/adr/0002-custom-auth.md`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 1. Mục tiêu
Thay toàn bộ lệnh gọi `supabase.auth.*` và các truy vấn `profiles`/`user_roles` **của chính người dùng** bằng hàm trong `src/lib/api/auth.ts`. `authClient` có cùng tên hàm và cùng shape `{ data, error }` với `supabase.auth`, nên hầu hết chỉ đổi vế phải của dòng gọi.

## 2. Phạm vi — chỉ trong vùng §5 REFACTOR_PLAN
| File | Dòng | Cũ | Mới |
|---|---|---|---|
| `src/hooks/useAuth.tsx` | 2–3 | `import { User, Session } from "@supabase/supabase-js"`, `import { supabase }` | `import { authClient, getMyAdminRole, getMyProfile, type AuthUser as User, type AuthSession as Session } from "@/lib/api/auth"` (alias giữ nguyên tên kiểu đang dùng trong file) |
| `src/hooks/useAuth.tsx` | 56, 196, 219, 262, 267, 293 | `supabase.auth.X` | `authClient.X` |
| `src/hooks/useAuth.tsx` | 100–104 | `supabase.from("profiles").select(...).eq(...).maybeSingle()` | `getMyProfile()` |
| `src/hooks/useAuth.tsx` | 105–110 | `supabase.from("user_roles")...maybeSingle()` | `getMyAdminRole()` |
| `src/pages/Login.tsx` | 69 | `supabase.auth.signInWithPassword` | `authClient.signInWithPassword` |
| `src/pages/Login.tsx` | 80–85 | truy vấn `user_roles` | `getMyAdminRole()` |
| `src/pages/Register.tsx` | 48 | `supabase.auth.signUp` | `authClient.signUp` |
| `src/pages/Register.tsx` | 64–70 | `supabase.from("profiles").upsert({ user_id, full_name }, …)` | `updateMyProfile({ full_name: fullName })` (backend đã tạo profile khi đăng ký) |
| `src/pages/ForgotPassword.tsx` | 18 | `supabase.auth.resetPasswordForEmail` | `authClient.resetPasswordForEmail` |
| `src/pages/ResetPassword.tsx` | 37, 43 | `supabase.auth.updateUser`, `signOut` | `authClient.updateUser`, `authClient.signOut` |
| `src/pages/AuthCallback.tsx` | 85, 97, 114 | `supabase.auth.X` | `authClient.X` |
| `src/pages/AuthCallback.tsx` | 43–48 | truy vấn `user_roles` | `getMyAdminRole()` |
| `src/pages/Profile.tsx` | 598–601 | `profiles.update({ avatar_url })` | `updateMyProfile({ avatar_url: newUrl })` |
| `src/pages/Profile.tsx` | 669–675 | `profiles.update({ full_name, avatar_url })` | `updateMyProfile({ full_name: editFullName, avatar_url: editAvatarUrl \|\| null })` |
| `src/pages/Profile.tsx` | 603, 635, 680 | `supabase.auth.updateUser` | `authClient.updateUser` |
| `src/lib/googleOAuth.ts` | toàn file | nhánh Lovable + `supabase.auth.signInWithOAuth` | chỉ còn `authClient.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams } })`, giữ chữ ký hàm `signInWithGoogle()` và kiểu trả về (DECISIONS D-07) |
| `src/pages/admin/AdminStudents.tsx` | 31–49 | `createClient(...)` tạm + `tempSupabase.auth.signUp` | `adminCreateStudent({ email, password, options: { data: { full_name: fullName } } })`; giữ `if (error) throw error; if (!data.user) throw ...` |
| `src/services/speakingService.ts` | 197, 249, 358, 400, 423, 537 | `supabase.auth.getUser/getSession` | `authClient.getUser/getSession` |

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị (kể cả toast, `console.*`), `queryKey`, tên state, thứ tự hook.
- Các truy vấn **không** thuộc auth trong cùng file (ví dụ `speakingService.ts` đọc `profiles` của người khác, `speaking_rooms`; `Profile.tsx` đọc kết quả học) — để module sau.
- `src/integrations/lovable/`, `src/integrations/supabase/` (xóa ở P7).
- Logic 7 ngày không hoạt động và cache `lenglish_cached_profile` trong `useAuth.tsx` (giữ nguyên ở client — PARITY AUTH-011/012).

## 3. Hành vi cũ cần giữ
- `getSession()` khi chưa đăng nhập: `data.session = null`, `error = null`.
- Sự kiện `onAuthStateChange`: `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED` — giống tên Supabase, `useAuth.tsx` không đổi logic xử lý.
- Lỗi trả về có `message` tiếng Anh như Supabase (`Invalid login credentials`, `Email not confirmed`, `User already registered`, …) → `getFriendlyErrorMessage` hiện đúng câu tiếng Việt cũ.
- `Register.tsx`: khi phải xác nhận email, `data.session = null` → nhánh hiện toast "kiểm tra email" như cũ.
- Link email và Google quay về `/auth/callback` (hoặc trang đích) **sau khi** backend đã đặt cookie; `AuthCallback` gọi `getSession()` là có phiên. Không còn tham số `?code=` (hàm `exchangeCodeForSession` vẫn tồn tại để code cũ không phải đổi).
- `user.user_metadata.full_name / avatar_url / bio / cover_url` đọc như cũ.

## 4. Đặc tả
Không viết hàm mới — mọi hàm đã có trong `src/lib/api/auth.ts`. Nếu thấy thiếu hàm/shape: **dừng**, ghi vào mục 8 (Claude bổ sung ở backend/adapter).

## 5. Tiêu chí nghiệm thu
- [ ] `grep -rn "supabase.auth" src` chỉ còn trong `src/integrations/`
- [ ] Các truy vấn `profiles`/`user_roles` ở bảng mục 2 đã thay; truy vấn khác giữ nguyên
- [ ] `node scripts/check-ui-diff.mjs` OK
- [ ] `npm test`, `npm run build` pass; `npm run typecheck` không tăng số lỗi so với trước khi làm (ghi số trước/sau)
- [ ] **Kiểm tra tay** (ghi kết quả từng bước vào mục 7):
  1. `docker compose up -d`; `cd backend && npx prisma migrate deploy && npm run start:dev`; `npm run dev`
  2. Đăng ký tài khoản mới → toast yêu cầu xác nhận email → mở http://localhost:8025 (Mailpit) → bấm link → về trang chủ đã đăng nhập
  3. Đăng xuất → đăng nhập lại; sai mật khẩu hiện "Email hoặc mật khẩu không chính xác…"
  4. Tải lại trang (F5) vẫn đăng nhập; mở tab thứ hai vẫn đăng nhập
  5. Quên mật khẩu → link trong Mailpit → `/reset-password` → đặt mật khẩu mới → đăng nhập bằng mật khẩu mới
  6. `/profile`: đổi tên, ảnh đại diện, bio → F5 vẫn giữ
  7. Gán admin bằng SQL (`insert into user_roles(user_id, role) values ('<id>', 'admin')`) → đăng nhập → vào `/admin/dashboard`; tạo học viên ở `/admin/students` → học viên nhận email trong Mailpit
  8. Google: nếu chưa có `GOOGLE_CLIENT_ID` thì bấm nút Google sẽ thấy lỗi 503 — ghi nhận, không cần sửa

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm test && npm run build && npm run typecheck; node scripts/check-ui-diff.mjs refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
