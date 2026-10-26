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
   | `SMTP_USER` | Gmail dùng để gửi thư |
   | `SMTP_PASS` | **App Password** 16 ký tự (Google Account → Security → 2-Step Verification → App passwords) |
   | `MAIL_FROM` | `L-English Academy <gmail-của-bạn>` |
   | `GOOGLE_CLIENT_ID/SECRET` | để trống nếu chưa có (nút Google trả 503) |
4. Service → **Settings → Deploy Hook** → copy URL (giữ bí mật: ai có URL đều kích hoạt deploy được).

### 2.2 GitHub
Repo → **Settings → Environments → New environment `staging`** → **Environment secrets**:
- `STAGING_DATABASE_URL_UNPOOLED`: chuỗi **direct** của Neon (không có `-pooler`)
- `RENDER_DEPLOY_HOOK_URL`: URL ở bước 2.1.4

Sau đó: Actions → CI → chạy lại lần gần nhất trên nhánh refactor (hoặc push bất kỳ) → job `deploy-staging` chạy.

### 2.3 Vercel
- Project đang nối Git: mỗi nhánh có URL preview cố định dạng `https://<project>-git-refactor-nestjs-backend-<team>.vercel.app` (Vercel → Deployments → lọc theo nhánh).
- Dùng đúng URL đó cho `FRONTEND_URL`/`CORS_ORIGINS` ở Render.
- Nếu preview đang bật **Vercel Authentication** (Deployment Protection): tắt cho Preview hoặc dùng link chia sẻ, nếu không UptimeRobot/thiết bị khác không vào được.

### 2.4 UptimeRobot (giữ Render free không ngủ)
https://uptimerobot.com → New monitor → HTTP(s) → `https://lenglish-api.onrender.com/api/health` → interval 5 phút.

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
