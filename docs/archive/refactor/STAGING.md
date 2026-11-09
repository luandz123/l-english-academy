# STAGING — Hướng dẫn dựng và vận hành môi trường staging

> Kiến trúc: Vercel (frontend, preview của nhánh `refactor/nestjs-backend`) → rewrite `/api/v1/*` → Render (`lenglish-api`, Docker, Singapore) → Neon (Postgres 18, Singapore). Xem ADR 0003.
> Production (`main`) vẫn chạy Supabase cho tới cutover (ADR 0004).

## 1. Đã làm sẵn trong repo
| Thành phần | File | Ghi chú |
|---|---|---|
| Image backend | `backend/Dockerfile` | multi-stage, chạy bằng user `node`, ~526MB; không chứa Prisma CLI |
| Render Blueprint | `render.yaml` | `autoDeploy: false` — deploy qua Deploy Hook sau khi migration xong |
| Deploy tự động | job `deploy-staging` trong `.github/workflows/ci.yml` | push lên `refactor/nestjs-backend` + CI xanh → `prisma migrate deploy` lên Neon → gọi Deploy Hook. Thiếu secret thì bỏ qua (cảnh báo), không làm CI đỏ |
| Rewrite | `vercel.json` | `/api/v1/:path*` → `https://lenglish-api.onrender.com/api/v1/:path*` (đặt **trước** rule `/api/*` của các Vercel function cũ) |
| Dữ liệu nội dung | `backend/scripts/copy-content.mjs`, `verify-content.mjs` | Neon đã có đủ 15 bảng nội dung, khớp md5 với Supabase (2026-10-27) |

## 2. Việc chủ dự án làm (một lần)

### 2.1 Render
1. Đăng nhập https://render.com bằng GitHub → **New → Blueprint** → chọn repo `l-english-academy`, nhánh `refactor/nestjs-backend` → Render đọc `render.yaml`.
2. Nếu tên `lenglish-api` đã có người dùng: đặt tên khác và **báo Claude** để sửa `vercel.json`.
3. Điền các biến `sync: false`:
   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | chuỗi **pooled** của Neon (host có `-pooler`), đổi `sslmode=require` → `sslmode=verify-full` |
   | `FRONTEND_URL`, `CORS_ORIGINS` | URL preview Vercel của nhánh (mục 2.3), dạng `https://…vercel.app` |
   | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` | xem §2.5 (Render free **chặn SMTP** nên không dùng Gmail SMTP/App Password) |
   | `MAIL_FROM` | `L-English Academy <gmail-đã-cấp-quyền@gmail.com>` — phải đúng Gmail ở §2.5 |
   | `GOOGLE_CLIENT_ID/SECRET` | để trống nếu chưa có (nút Google trả 503) |
4. Service → **Settings → Deploy Hook** → copy URL (giữ bí mật: ai có URL đều kích hoạt deploy được).

### 2.2 GitHub
Repo → **Settings → Environments → New environment `staging`** → **Environment secrets**:
- `STAGING_DATABASE_URL_UNPOOLED`: chuỗi **direct** của Neon (không có `-pooler`)
- `RENDER_DEPLOY_HOOK_URL`: URL ở bước 2.1.4

Sau đó: Actions → CI → chạy lại lần gần nhất trên nhánh refactor (hoặc push bất kỳ) → job `deploy-staging` chạy.

### 2.3 Vercel
- Job `deploy-staging-frontend` (CI) build nhánh refactor bằng môi trường **Preview** và gắn alias cố định **`https://lenglish-staging.vercel.app`** — dùng đúng URL này cho `FRONTEND_URL`/`CORS_ORIGINS` ở Render.
- Biến công khai `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` lấy từ *variables* của environment `staging` trên GitHub (Preview của Vercel không có).

### 2.4 UptimeRobot (giữ Render free không ngủ)
https://uptimerobot.com → New monitor → HTTP(s) → `https://lenglish-api.onrender.com/api/health` → interval 5 phút.

### 2.5 Gmail API (gửi thư xác nhận / đặt lại mật khẩu)
Render free chặn cổng SMTP 25/465/587 từ 26/09/2025 → backend gửi qua **Gmail API (HTTPS)** bằng chính Gmail của chủ dự án (miễn phí, ~500 thư/ngày, không cần domain, qua được SPF/DKIM/DMARC).

1. https://console.cloud.google.com → tạo project (ví dụ `L-English`). Dùng chung project này cho đăng nhập Google sau này.
2. **APIs & Services → Library** → tìm **Gmail API** → **Enable**.
3. **Google Auth Platform** (OAuth consent screen):
   - *Branding*: tên app `L-English Academy`, email hỗ trợ = Gmail của bạn.
   - *Audience*: User type **External** → bấm **Publish app** → trạng thái **In production**.
     ⚠️ Để "Testing" thì refresh token **hết hạn sau 7 ngày** → thư ngừng gửi.
   - *Data access* → **Add or remove scopes** → nhập `https://www.googleapis.com/auth/gmail.send` → Update → Save.
4. **Clients → Create client** → *Web application*:
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
     (sau này thêm `https://lenglish-staging.vercel.app/api/v1/auth/google/callback` cho đăng nhập Google)
   - Lưu lại **Client ID** và **Client secret**.
5. Lấy refresh token ở https://developers.google.com/oauthplayground :
   - Bánh răng ⚙ góc phải → tick **Use your own OAuth credentials** → dán Client ID / Client secret.
   - Step 1: ô *Input your own scopes* → `https://www.googleapis.com/auth/gmail.send` → **Authorize APIs**.
   - Đăng nhập **đúng Gmail sẽ dùng để gửi thư** → màn hình "Google hasn't verified this app" → **Advanced → Go to L-English Academy (unsafe)** (an toàn: app của chính bạn, chỉ bạn cấp quyền) → **Continue**.
   - Step 2: **Exchange authorization code for tokens** → copy **Refresh token** (`1//…`).
6. Render → service `lenglish-api` → **Environment**: điền `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `MAIL_FROM`; `MAIL_PROVIDER=gmail_api` (đã có từ `render.yaml`) → **Save changes**.

Bảo mật: refresh token cho phép **gửi thư dưới tên Gmail của bạn** (không đọc được thư — scope chỉ `gmail.send`). Chỉ để trong Render, không dán vào chat/repo. Thu hồi bất cứ lúc nào: https://myaccount.google.com/permissions.

## 3. Kiểm tra sau khi dựng
1. `https://lenglish-api.onrender.com/api/health` → `{"status":"ok","db":"up"}`
2. Mở URL preview → trang chủ hiện khóa học thật; DevTools → Network: `/api/v1/catalog/*` 200.
3. Đăng ký bằng email thật → nhận thư Gmail → bấm link → đã đăng nhập; F5 vẫn đăng nhập.
4. **Safari trên iPhone**: lặp lại bước 3 (kiểm tra cookie qua rewrite — rủi ro lớn nhất khi không có domain).

## 4. Copy lại dữ liệu nội dung (khi Supabase có nội dung mới)
```bash
cd backend
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon direct> node scripts/copy-content.mjs --dry-run
SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/copy-content.mjs --truncate
SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/verify-content.mjs
```
`--truncate` xóa và copy lại 15 bảng nội dung trong **một transaction** (lỗi → rollback, dữ liệu cũ giữ nguyên). Không đụng bảng tài khoản.

## 5. Backup — CHƯA BẬT
Repo đang **public** → artifact GitHub Actions tải được bởi người khác → không được lưu bản dump DB ở đó. Phương án chờ chủ dự án chọn: xem OPEN_QUESTIONS #17.
