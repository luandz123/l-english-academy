# CUTOVER — Chuyển production từ Supabase sang NestJS (P7, ADR 0004)

> Chạy **một lần**, chủ dự án + Claude cùng làm. Diễn tập rollback trên staging trước (§6).
> Điều kiện bắt đầu (§1) phải đủ hết. Mỗi bước có lệnh kiểm tra; lệch thì dừng, không làm bước sau.

## 0. Khác với REFACTOR_PLAN P7 ban đầu
| Kế hoạch cũ | Hiện tại | Lý do |
|---|---|---|
| Copy media sang R2, viết lại URL | **Không copy**. Media ở nguyên Supabase Storage, backend upload bằng service key | #27 |
| Gỡ `@supabase/supabase-js`, `grep supabase src` = 0 | **Giữ** package. Còn: Realtime Broadcast (PvP, signaling mesh) và phòng nói (hoãn) | #28, #11 |
| Chuyển tài khoản/kết quả học | **Không**. Chỉ copy nội dung; tài khoản đăng ký lại, admin cấp bằng script | D-05, A-01 |
| Phòng nói chạy trên NestJS | Hoãn sau cutover; `/speaking` giữ hành vi production hiện tại | #11 |

Dự án Supabase **phải giữ** sau cutover: Storage `materials` + Realtime + phương án rollback (≥ 30 ngày).

## 1. Điều kiện bắt đầu
- [ ] QUEUE: T-033, T-034 ✅ merged. `grep -rn "supabase\.\(from\|rpc\|storage\|auth\)" src` chỉ còn `speakingService.ts` (hoãn #11).
- [ ] CI `refactor/nestjs-backend` xanh; staging chạy được 6 luồng ở §5 (smoke test).
- [ ] Diễn tập rollback trên staging xong (§6), ghi thời gian thực tế.
- [ ] `main` không có commit nào chưa vào nhánh refactor: `git log origin/refactor/nestjs-backend..origin/main` rỗng.
- [ ] Đã chọn giờ ít người dùng; báo trước đóng băng nội dung (admin không sửa khóa học/đề trong lúc chuyển).

## 2. Hạ tầng production (làm trước ngày cutover được, không ảnh hưởng production)
1. **Neon**: tạo project `lenglish-prod` (Singapore, Postgres 18) — tách khỏi DB staging. Lấy 2 chuỗi: pooled (`-pooler`) và direct.
2. **Migration lên DB trống** (máy local, thư mục `backend`):
   ```bash
   DATABASE_URL=<neon prod direct> npx prisma migrate deploy
   ```
3. **GitHub** → Settings → Environments → `production` → secrets:
   `PRODUCTION_DATABASE_URL_UNPOOLED` (direct), `RENDER_PRODUCTION_DEPLOY_HOOK_URL` (điền sau bước 3.3).
4. **SePay**: chuẩn bị API key mới ≥ 16 ký tự (không dùng lại key staging). Chưa đổi URL webhook.

Không dán chuỗi DB, Deploy Hook, service role key, refresh token vào chat. Nhập thẳng vào Render/GitHub/Neon.

## 3. Ngày cutover
### 3.1 Đóng băng + copy nội dung (T-0)
```bash
cd backend
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon prod direct> node scripts/copy-content.mjs --dry-run
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon prod direct> node scripts/copy-content.mjs
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon prod direct> node scripts/verify-content.mjs
```
Kiểm tra: `verify-content` khớp số dòng + md5 cả 15 bảng. Lệch → dừng.

### 3.2 Merge vào `main`
- PR `refactor/nestjs-backend` → `main`, chủ dự án duyệt (REFACTOR_PLAN §4.7, kèm tóm tắt 3 dòng mỗi module).
- **Chưa merge** cho tới khi 3.3 xong (Vercel build `main` ngay khi merge, rewrite trỏ backend production).

### 3.3 Backend production (Render)
1. Render → Blueprint của repo → **Sync** → tạo service `lenglish-api-prod` (đã khai trong `render.yaml`).
   Tên bị trùng → đặt tên khác, sửa `vercel.json` (`destination`) và lệnh `sed` trong job `deploy-staging-frontend` của `ci.yml`.
2. Điền biến `sync: false`: `DATABASE_URL` (Neon **prod pooled**, `sslmode=verify-full`), `FRONTEND_URL` + `CORS_ORIGINS` (domain production Vercel), Gmail API, `MAIL_FROM`, Google OAuth, `SEPAY_WEBHOOK_API_KEY` (key mới), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   Kiểm tra `PAYMENT_SIMULATION_ENABLED = false`.
3. Settings → Deploy Hook → lưu vào secret `RENDER_PRODUCTION_DEPLOY_HOOK_URL`.
4. Google Cloud Console: thêm redirect URI `https://<domain production>/api/v1/auth/google/callback`.

### 3.4 Chuyển
1. Merge PR → `main`. CI: `deploy-production` chạy migration (đã áp → no-op) rồi gọi Deploy Hook. Vercel tự build `main`.
2. `curl -fsS https://lenglish-api-prod.onrender.com/api/health` → 200.
3. Mở domain production, đăng ký tài khoản admin (email thật), xác nhận email, rồi:
   ```bash
   cd backend && DATABASE_URL=<neon prod direct> node scripts/grant-admin.mjs <email> --confirm <email>
   ```
4. **SePay** → Webhooks: URL `https://<domain production>/api/v1/payments/webhooks/sepay`, API Key = `SEPAY_WEBHOOK_API_KEY`.
5. Giao dịch thật 2.000đ (§5 luồng 5). Đơn phải `completed`, tài khoản thành Pro, `admin_activity_log` có dòng.

## 4. Sau cutover
- Theo dõi 72h: Render logs (lỗi 5xx), Neon (kết nối, dung lượng), SePay (webhook 2xx).
- Render free dùng chung 750 giờ/tháng cho cả workspace: sau 72h ổn định thì **suspend** `lenglish-api` (staging) nếu thiếu giờ.
- Thu hồi quyền ghi Supabase không còn dùng: xóa các SQL function/RPC cũ (`complete_payment_order`, …) **sau 30 ngày**, cùng lúc xóa `api/payment-webhook.ts`, `api/check-payment.ts`, `api/simulate-payment.ts`.
- `api/tts.ts` (proxy TTS, không dùng Supabase) và `api/speaking-token.ts` (#11) **giữ**.
- Cập nhật PROGRESS.md (P7 ✅), PARITY.md (cột Trạng thái → `done` sau visual regression trên production).

## 5. Smoke test (staging trước cutover, production sau cutover)
| # | Luồng | Đạt khi |
|---|---|---|
| 1 | Đăng ký → email xác nhận → đăng nhập → đăng xuất | nhận thư, vào được Dashboard |
| 2 | Khóa free: mở bài, xem video/tài liệu, lưu ghi chú, tiến độ | dữ liệu còn sau F5 |
| 3 | Khóa trả phí chưa mua: bài bị khóa, quiz/popup trả 403 | không thấy đáp án trong Network |
| 4 | Quiz + Full Test: nộp bài, xem kết quả, xem lại | điểm do server tính, khớp ETS |
| 5 | Thanh toán: tạo đơn → chuyển khoản → webhook → Pro | trạng thái đổi trong ≤ 6 giây (polling 3s) |
| 6 | Admin: sửa khóa/bài/câu hỏi, upload ảnh/audio, import JSON | file mở được qua `public_url`, import lỗi không để bản ghi dở |

## 6. Rollback (mục tiêu < 15 phút)
1. Vercel → Deployments → bản production cuối trước cutover → **Promote to Production** (hoặc `git revert` merge commit trên `main`).
2. SePay → URL webhook về `https://<domain production>/api/payment-webhook` (Vercel function cũ, dùng Supabase).
3. Supabase vẫn nguyên dữ liệu (cutover chỉ **đọc** Supabase), không cần khôi phục.
4. Giao dịch phát sinh trên NestJS trong lúc chạy: xem `payment_orders` trên Neon prod, kích hoạt tay trên Supabase.

**Diễn tập trên staging:** promote một bản preview cũ lên alias `lenglish-staging.vercel.app` rồi promote lại bản mới, đo thời gian; ghi kết quả vào mục dưới.

| Ngày | Người làm | Thời gian rollback | Ghi chú |
|---|---|---|---|
| | | | |
