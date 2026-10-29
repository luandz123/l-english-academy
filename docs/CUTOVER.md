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

**Chốt (2026-10-29): nâng staging lên production**, không dựng bộ thứ hai. Service Render `lenglish-api` + DB Neon hiện tại trở thành production; dữ liệu test bị xóa và nội dung được copy lại ở ngày cutover. Lý do: chưa có người dùng thật (D-05), Render free chung 750 giờ/tháng, ít biến phải nhập lại. Đánh đổi: hết staging — cần lại thì tạo nhánh Neon + service Render mới.

## 1. Điều kiện bắt đầu
- [ ] QUEUE: T-033, T-034 ✅ merged. `grep -rn "supabase\.\(from\|rpc\|storage\|auth\)" src` chỉ còn `speakingService.ts` (hoãn #11).
- [ ] CI `refactor/nestjs-backend` xanh; staging chạy được 6 luồng ở §5 (smoke test).
- [ ] Diễn tập rollback trên staging xong (§6), ghi thời gian thực tế.
- [ ] `main` không có commit nào chưa vào nhánh refactor: `git log origin/refactor/nestjs-backend..origin/main` rỗng.
- [ ] Đã chọn giờ ít người dùng; báo trước đóng băng nội dung (admin không sửa khóa học/đề trong lúc chuyển).

## 2. Chuẩn bị trước (không ảnh hưởng production)
1. Ghi lại giá trị hiện tại các biến Render sẽ đổi (để rollback): nhánh, `PAYMENT_SIMULATION_ENABLED`, `FRONTEND_URL`, `CORS_ORIGINS`.
2. SePay: dùng lại API key đang khai ở `SEPAY_WEBHOOK_API_KEY` nếu nó chưa từng xuất hiện ngoài Render/SePay; nghi lộ thì tạo key mới.
3. Google Cloud Console: thêm redirect URI `https://<domain production>/api/v1/auth/google/callback`.

Không dán chuỗi DB, Deploy Hook, service role key, refresh token vào chat. Nhập thẳng vào Render/GitHub/Neon.

## 3. Ngày cutover
### 3.1 Đóng băng + làm sạch DB + copy nội dung (T-0)
`--truncate` xóa sạch các bảng nội dung trước khi copy. Tài khoản, kết quả, đơn test xóa bằng:
```bash
cd backend
DATABASE_URL=<neon direct> npx prisma db execute --stdin <<'SQL'
TRUNCATE public.users, public.payment_orders, public.admin_activity_log RESTART IDENTITY CASCADE;
SQL
```
(`CASCADE` theo khóa ngoại trong `schema.prisma` chỉ chạm 16 bảng dữ liệu người dùng: `users`, `profiles`, `user_roles`, `auth_tokens`, `refresh_tokens`, `enrollments`, `payment_orders`, `admin_activity_log`, `admin_student_notes`, `user_quiz_results`, `user_answers`, `user_full_test_results`, `full_test_answer_details`, `user_lesson_progress`, `user_notes`, `user_favorites` — không bảng nội dung nào. Sau đó `SELECT count(*)` các bảng này phải = 0.)
```bash
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon direct> node scripts/copy-content.mjs --dry-run --truncate
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon direct> node scripts/copy-content.mjs --truncate
SOURCE_DATABASE_URL=<supabase session pooler> TARGET_DATABASE_URL=<neon direct> node scripts/verify-content.mjs
```
Kiểm tra: `verify-content` khớp số dòng + md5 cả 15 bảng. Lệch → dừng.

### 3.2 Đổi Render `lenglish-api` sang production
1. Settings → Branch: `refactor/nestjs-backend` → `main`.
2. Environment: `PAYMENT_SIMULATION_ENABLED=false`; `FRONTEND_URL`, `CORS_ORIGINS` = domain production Vercel. (Tùy chọn: đổi `JWT_ACCESS_SECRET` — không bắt buộc vì 3.1 đã xóa refresh token, access token hết hạn sau 15 phút.)
3. Chưa deploy (chờ merge ở 3.3).

### 3.3 Merge vào `main`
- PR `refactor/nestjs-backend` → `main`, chủ dự án duyệt (REFACTOR_PLAN §4.7, kèm tóm tắt 3 dòng mỗi module).
- Merge → CI `deploy-staging` (chạy cả với `main`) áp migration rồi gọi Deploy Hook; Vercel tự build `main` (rewrite `/api/v1` → `lenglish-api`).
- `curl -fsS https://lenglish-api.onrender.com/api/health` → 200.

### 3.4 Chuyển
1. Mở domain production, đăng ký tài khoản admin (email thật), xác nhận email, rồi:
   ```bash
   cd backend && DATABASE_URL=<neon direct> node scripts/grant-admin.mjs <email> --confirm <email>
   ```
2. **SePay** → Webhooks: URL `https://<domain production>/api/v1/payments/webhooks/sepay`, API Key = `SEPAY_WEBHOOK_API_KEY`.
   Lưu ý (#30): trang `/admin/settings` vẫn hiển thị URL cũ `/api/payment-webhook` — **không** dùng URL đó.
3. Giao dịch thật 2.000đ (§5 luồng 5). Đơn phải `completed`, tài khoản thành Pro, `admin_activity_log` có dòng.
4. Từ giờ không push nhánh `refactor/nestjs-backend` nữa (job `deploy-staging-frontend` vẫn gắn alias staging nhưng backend đã là production).

## 4. Sau cutover
- Theo dõi 72h: Render logs (lỗi 5xx), Neon (kết nối, dung lượng), SePay (webhook 2xx).
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

### Kết quả smoke test — khách (Claude, 2026-10-29, staging `462c097`)
| Kiểm tra | Kết quả |
|---|---|
| `GET /catalog/courses` | 200 |
| Route cần đăng nhập (`results/me`, `payments/orders`, `quizzes/:id/submit`, `media/upload`) | 401 |
| Route admin (`admin/settings`, `catalog/admin/courses`) không token | 401 |
| Webhook SePay không API key | 401 |
| `quizzes/:id/questions` (10 id): khóa → 403, mở → 200, **không có `is_correct`** | đạt |
| Full Test khóa trả phí (113, 114) → 403 `FULLTEST_LOCKED`; khóa free (83) → 200 | đạt |
| Full Test id không tồn tại → 200 `[]` | giống code cũ (Supabase trả mảng rỗng) |

### Kết quả smoke test — đã đăng nhập (Claude + chủ dự án, 2026-10-29, staging `e7e5818`)
| Luồng | Kết quả |
|---|---|
| 2. Học bài khóa 1 (bài 48): ghi chú, tài liệu, practices, tiến độ | 200 |
| 4. Quiz 767: nộp 201 → kết quả + xem lại 200 (3/10) | đạt |
| 4. Full Test 83 (khóa free) và 113 (khóa 19): nộp 201 → kết quả + chi tiết 200 | đạt |
| 6. Admin (đọc): dashboard, khóa học, học viên, tài liệu, đơn/ghi danh, cài đặt, sao lưu | 200 |
| 6. `/admin/fulltests` | **còn gọi Supabase** → T-035 |

| 6. `/admin/fulltests` sau T-035 (staging `4f65fbf`) | đã chuyển API |
| 5. Thanh toán giả lập: `POST /payments/orders` 201 (mã `LEA86524`, QR SePay) → polling 3s → `simulate` 200 → đơn hoàn tất, hiện "Chào mừng VIP PRO" | đạt |

Còn lại (chủ dự án tự làm, cần chọn file / nhận email):
- [ ] Luồng 1: đăng ký tài khoản mới bằng email thật → nhận thư xác nhận (Gmail API) → đăng nhập.
- [ ] Luồng 6: `/admin/materials` upload 1 ảnh nhỏ → mở được qua `public_url`; `/admin/import-json` import 1 file JSON nhỏ.
- [ ] (Tùy chọn) Luồng 5 thật: chuyển khoản 2.000đ vào đơn trên staging để thử webhook SePay — chỉ khi webhook SePay đang trỏ staging.

## 6. Rollback (mục tiêu < 15 phút)
1. Vercel → Deployments → bản production cuối trước cutover → **Promote to Production** (hoặc `git revert` merge commit trên `main`). Bản đó dùng Supabase trực tiếp, không cần backend.
2. SePay → URL webhook về `https://<domain production>/api/payment-webhook` (Vercel function cũ, dùng Supabase).
3. Supabase vẫn nguyên dữ liệu (cutover chỉ **đọc** Supabase), không cần khôi phục.
4. Giao dịch phát sinh trên NestJS trong lúc chạy: xem `payment_orders` trên Neon prod, kích hoạt tay trên Supabase.

Render `lenglish-api` không cần đổi lại để rollback (bản cũ không gọi nó).

**Diễn tập trên staging:** promote một bản preview cũ lên alias `lenglish-staging.vercel.app` rồi promote lại bản mới, đo thời gian; ghi kết quả vào mục dưới.

| Ngày | Người làm | Thời gian rollback | Ghi chú |
|---|---|---|---|
| | | | |
