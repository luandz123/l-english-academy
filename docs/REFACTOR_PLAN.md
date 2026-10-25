# REFACTOR PLAN — L-English: Supabase → NestJS + PostgreSQL

> Trạng thái: **ĐÃ DUYỆT** · Ngày: 2026-10-25 · Nhánh: `refactor/nestjs-backend`
> Dựa trên [DECISIONS.md](DECISIONS.md) (đã duyệt). Mâu thuẫn giữa file này và DECISIONS.md → DECISIONS.md thắng.
> Ước lượng giả định ~15 giờ/tuần (C-06).

---

## 1. Khối lượng thực tế (đo từ code ngày 2026-10-25)

| Nhóm | Lệnh gọi Supabase | File nặng nhất | Module backend |
|---|---|---|---|
| Auth & profile | `auth` ×25, `profiles` ×19, `user_roles` ×4 | `useAuth.tsx`, `Profile.tsx`, `Register.tsx`, `AuthCallback.tsx` | Auth |
| Catalog | `courses` ×26, `modules` ×13, `course_categories` ×10 | `AdminCourseDetail.tsx`, `ModuleManager.tsx` | Catalog |
| Learning | `lessons` ×14, `lesson_practices` ×5, `enrollments` ×12, progress/notes/favorites ×11 | `LearnPage.tsx` (14), `LessonManager.tsx` (14) | Learning |
| Assessment | `questions` ×37, `quizzes` ×29, `answers` ×16, `full_tests`+sections ×41, `user_quiz_results`/`user_answers`/full-test results ×44, vocab ×36 | `QuizManager.tsx` (31), `AdminLessonVocab.tsx` (20), `AdminFullTestManager.tsx` (12) | Assessment |
| Media | `materials` table ×44, `storage.from("materials")` ×21, `getPublicUrl` ×15, `api/tts.ts` | `AdminMaterials.tsx`, `ImportDialog.tsx` | Media |
| Payments | `payment_orders` ×4, RPC `complete_payment_order` ×2, `check_payment_order_status`, `api/payment-webhook.ts`, `api/check-payment.ts`, `api/simulate-payment.ts`, Realtime `UpgradeProModal.tsx:163` | `UpgradeProModal.tsx` | Payments |
| Admin | `platform_settings` ×12, `admin_student_notes`, `admin_activity_log`, thống kê | `AdminStudentDetail.tsx`, `AdminDashboard.tsx`, `AdminBackup.tsx`, `AdminReports.tsx` | Admin |
| Realtime | RPC join/leave/match speaking room, `speakingService.ts` (9), mesh signaling `useVoiceRoom.ts:334`, `SpeakingRoomsPage.tsx:102`, PvP `WordShooterLobby.tsx`, `WordShooterArena.tsx`, `api/speaking-token.ts` | `speakingService.ts` | Realtime (+ Speaking) |

Tổng: ~239 lệnh gọi trong 45 file + 5 Vercel function + 6 RPC + 4 kênh Realtime. 232 chỗ dùng `queryKey` phải giữ nguyên.

**Quan sát ảnh hưởng tới chiến lược:** lệnh gọi Supabase nằm **trực tiếp trong page/component**, không qua hook/service. Muốn chuyển thì bắt buộc phải sửa file `.tsx` → cần quy tắc "vùng được sửa" chặt (mục 5).

---

## 2. Lộ trình theo giai đoạn

Mỗi giai đoạn kết thúc bằng một **mốc kiểm chứng được**. Production (`main`, Supabase) không bị đụng tới cho tới P7 (C-01).

| GĐ | Nội dung | Mốc hoàn thành | Ước lượng |
|---|---|---|---|
| **P0 Nền móng** | `backend/` NestJS; docker-compose (Postgres, MinIO, Mailpit); config validate bằng Joi/zod; Prisma `db pull` từ Supabase → baseline migration; đo kích thước DB/media (O-04, O-05); exception filter, logger, Swagger `/api/docs`, health; khung test (Jest + supertest + Testcontainers); CI job backend; `src/lib/api` client nền; mẫu task; ADR 0002–0005 | `docker compose up` + `npm run test` xanh; CI xanh; Swagger mở được | 1 tuần |
| **P1 Lát cắt dọc** (D-20) | Auth đầy đủ (register/login/refresh rotation/logout/me, Google OAuth, forgot/reset, email); Catalog đọc + ghi admin; tách FK `profiles → auth.users`; script copy dữ liệu nội dung sang Neon; **deploy staging**: Render + Neon + Vercel Preview với rewrite `/api` | Đăng nhập trên link staging (kể cả Safari/iOS), xem danh sách khóa học từ NestJS | 1–1,5 tuần |
| **P2 Learning** | Lessons, practices, enrollments + kiểm tra quyền xem bài trả phí, progress, notes, favorites | `LearnPage` chạy hoàn toàn qua API trên staging | 0,5–1 tuần |
| **P3 Assessment** | Quiz chấm ở server, ẩn `is_correct`; Full Test + quy đổi ETS ở server (`FullTestExam.tsx:738`); vocab; dictation; admin CRUD câu hỏi (`QuizManager`, `AdminFullTest*`, `AdminLessonVocab`, `ImportDialog`) | Không còn đáp án nào trong response của học viên (test tự động kiểm) | 1,5 tuần |
| **P4 Payments** | Tạo đơn giá server-side; webhook (API Key + HMAC, idempotent, transaction); check status; simulate admin-only + cờ; SSE (thử qua rewrite, O-01); thay RPC `complete_payment_order` | Thanh toán chạy với **SePay test mode** trên staging; replay webhook 2 lần chỉ kích hoạt 1 lần | 1 tuần |
| **P5 Admin + Media** | Quản lý học viên (tạo học viên thay `AdminStudents.tsx:38`), ghi chú, activity log, settings, dashboard/report/backup; `StorageService` (MinIO/R2), upload, proxy TTS | Toàn bộ trang `/admin/*` chạy qua API | 1,5 tuần |
| **P6 Realtime** | `RealtimeGateway` Socket.IO relay (D-21); speaking rooms join/leave/match; LiveKit token (nhánh giữ nguyên); mesh signaling; trạng thái phòng; PvP lobby/arena | 2 trình duyệt nói chuyện được (mesh) và chơi PvP được trên staging | 1 tuần |
| **P7 Cutover** | Đóng băng nội dung → dump lại → nạp Neon + kiểm số dòng; copy media sang R2 + viết lại URL; gỡ `@supabase/supabase-js`; đổi env Vercel production + rewrite; đổi URL webhook SePay; giao dịch thật 2.000đ; theo dõi 72h | Production chạy NestJS; `grep supabase src` = 0 | 0,5 tuần |
| **Phase 2** (backlog) | LiveKit 100%, chấm PvP ở server, gamification lên DB, leaderboard, streak, signed URL, dữ liệu tĩnh vào DB, trang Điều khoản/Chính sách, domain + Resend | — | — |

Tổng ~8–9 tuần. Lõi P0–P4 trên staging ~5 tuần (C-06 ghi 3–4 tuần cho riêng 5 module; P0 thêm ~1 tuần).

---

## 3. Phân công Claude Code ↔ Antigravity (D-17)

**Nguyên tắc:** Claude làm việc cần suy luận hoặc nhạy cảm bảo mật; Antigravity làm việc lặp lại theo mẫu đã có. Module đầu tiên của mỗi loại do Claude làm làm **mẫu tham chiếu**, các module sau Antigravity làm theo mẫu.

| GĐ | Claude Code | Antigravity |
|---|---|---|
| P0 | Toàn bộ khung, Prisma pull, test infra, CI, mẫu task, ADR | — (chưa có mẫu để làm theo) |
| P1 | Auth (toàn bộ), guards, cookie/rewrite, script dữ liệu, deploy staging | Catalog: endpoint + DTO + mapper + test theo spec; adapter `src/lib/api/catalog.ts` + thay lệnh gọi ở các trang catalog |
| P2 | Spec + kiểm tra quyền truy cập bài trả phí | Toàn bộ code Learning theo spec |
| P3 | Engine chấm Quiz/Full Test/ETS, ẩn đáp án, test chống lộ đáp án | Admin CRUD câu hỏi/đề, vocab, dictation, adapter |
| P4 | Toàn bộ Payments | Adapter `UpgradeProModal` theo spec |
| P5 | `StorageService`, endpoint tạo học viên, phân quyền admin | CRUD settings/notes/log/reports, upload adapter |
| P6 | `RealtimeGateway` + adapter channel | Thay lệnh gọi ở `speakingService.ts`, Lobby/Arena theo mẫu |
| P7 | Kịch bản cutover, chạy cùng chủ dự án | Script đếm dòng, script viết lại URL media |
| Mọi GĐ | Viết spec task, review, merge vào `refactor/nestjs-backend`, cập nhật PROGRESS/PARITY | Chạy lint/typecheck/test/build trước khi báo xong |

**Ngân sách hạn mức Claude (Pro):** ước tính 1 cửa sổ 5h ≈ 1 việc Claude lớn **hoặc** 3–4 lượt review + viết spec. Không để Claude đọc lại cả repo mỗi phiên: phiên mới chỉ đọc `AGENTS.md`, `PROGRESS.md`, task hiện tại và file liên quan.

---

## 4. Giao thức phối hợp (D-18, D-19)

1. **Spec task** — Claude tạo `docs/tasks/T-xxx-<slug>.md` theo mẫu `docs/tasks/_TEMPLATE.md`:
   - Mục tiêu (1–2 câu) · Module · File được sửa · **File/vùng cấm sửa**
   - Hành vi cũ cần giữ (trích dòng code cũ) · Endpoint/DTO cần có · Policy RLS cần test
   - Tiêu chí nghiệm thu (checklist) · Lệnh kiểm tra phải chạy và dán output
2. **Giao việc** — chủ dự án gửi cho Antigravity: `Làm docs/tasks/T-xxx-<slug>.md. Đọc AGENTS.md trước.`
3. **Thực hiện** — Antigravity làm trên nhánh `task/T-xxx`, commit theo Conventional Commits, push, ghi phần "Kết quả" cuối file task (output lint/typecheck/test/build, file đã sửa, chỗ chưa chắc).
4. **Review** — chủ dự án gửi cho Claude: `Review T-xxx`. Claude kiểm theo checklist:
   - DoD AGENTS.md (output thật, không tin lời tự báo — Claude tự chạy lại test)
   - Diff `.tsx` chỉ nằm trong vùng được sửa (mục 5), queryKey không đổi
   - Phân quyền: mỗi policy RLS trong spec có test; client không gửi điểm/giá/đáp án
   - Không import repository của module khác; DTO + mapper; Swagger đủ
5. **Kết quả review**: `PASS` → Claude merge vào `refactor/nestjs-backend`, tick PARITY.md, cập nhật PROGRESS.md · `FAIL` → Claude ghi lý do vào file task, chủ dự án gửi lại Antigravity.
6. **Quy tắc dừng**: trượt 2 lần → Claude tự làm task, sửa mẫu spec cho lần sau.
7. **Merge vào `main`**: chỉ ở P7, chủ dự án duyệt, Claude kèm tóm tắt 3 dòng cho mỗi module.
8. **Đánh giá quy trình** sau P1: số task giao/trượt, giờ đã bỏ ra, hạn mức Claude đã dùng → điều chỉnh tỉ lệ chia việc. Ghi vào PROGRESS.md.

---

## 5. Chiến lược giữ giao diện

**Vùng được sửa trong file `.tsx`** (ngoài vùng này là cấm):
- Dòng `import` liên quan tới supabase/api.
- Thân `queryFn`, `mutationFn`, hàm xử lý sự kiện **chỉ ở phần gọi dữ liệu** (thay `supabase.from(...)` bằng `api.xxx(...)`).
- `useEffect` chỉ làm subscribe/unsubscribe Realtime.

**Cấm**: `return (...)` JSX, `className`, chuỗi hiển thị, thứ tự render, `queryKey`, tên state.

**Cách làm**: mỗi module có `src/lib/api/<module>.ts` trả về **đúng shape cũ** của Supabase (kể cả tên trường snake_case và cấu trúc join lồng nhau như `courses(*, modules(*))`). Component chỉ đổi đúng lệnh gọi.

**Kiểm tra tự động**:
- `scripts/check-ui-diff.mjs` (P0): trên diff `.tsx`, báo lỗi nếu dòng thay đổi chứa `className=`, thẻ JSX mở/đóng, hoặc chuỗi tiếng Việt trong JSX. Chạy trong CI và trong checklist review.
- Visual regression: Playwright chụp các trang chính (tái dùng `scripts/capture_*.cjs` + `screenshots/`) trên bản cũ làm baseline, so với bản mới ở mỗi giai đoạn. Ngưỡng lệch pixel ~0,1%.
- Thông báo lỗi: backend trả mã lỗi ổn định (`code`), adapter map về đúng thông điệp mà `getFriendlyErrorMessage` (`src/lib/errorHandler.ts`) đang hiển thị.

---

## 6. Chiến lược dữ liệu & rollback

**Schema**
1. `prisma db pull` từ Supabase (`SUPABASE_DB_URL`) → chỉnh tay thành schema sạch → migration baseline `0001_init`.
2. Bảng `users` mới (id uuid, email, password_hash, google_id, email_verified_at…), `refresh_tokens` (family_id, hash, revoked_at). `profiles.user_id` và `user_roles.user_id` giữ uuid, FK đổi sang `users.id`.
3. Policy RLS → guard + điều kiện trong service; ghi ánh xạ "policy → test" vào PARITY.md.
4. RPC Postgres (`complete_payment_order`, `join/leave/match_speaking_room`…) viết lại trong service với transaction; đối chiếu logic từng dòng với SQL trong `supabase/migrations/`.

**Dữ liệu (D-05)**
- `scripts/migrate/copy-content.ts`: copy các bảng nội dung Supabase → Neon theo thứ tự FK; bỏ bảng tài khoản/kết quả; in bảng đếm dòng nguồn/đích, lệch là dừng.
- Seed tài khoản test từ biến `TEST_*` trong `.env`.
- Chạy ở P1 (staging) và chạy lại ở P7 sau khi đóng băng nội dung.

**Media**
- `scripts/migrate/copy-media.ts`: copy bucket `materials` → R2, giữ nguyên đường dẫn.
- DB đang lưu URL public Supabase (15 chỗ `getPublicUrl`) → script viết lại tiền tố URL trong các cột liên quan (ở P7, có đếm số dòng đổi).

**Rollback**
- Trước P7: không có gì cần rollback, production là `main`.
- Tại P7: giữ dự án Supabase hoạt động ≥ 30 ngày; rollback = redeploy `main` trên Vercel + đổi URL webhook SePay về `/api/payment-webhook` cũ. Thời gian rollback mục tiêu < 15 phút; diễn tập 1 lần trên staging trước cutover.
- Backup: `pg_dump` Neon hằng đêm lên R2 (D-13), thử restore 1 lần ở P1.

---

## 7. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Làm nhiều mà không ra sản phẩm | Cao | Lát cắt dọc ở P1 có link staging; mỗi GĐ có mốc kiểm chứng; PROGRESS.md cập nhật sau mỗi task |
| Phối hợp 2 công cụ kém hiệu quả | Cao | Spec dạng file, module mẫu do Claude làm trước, quy tắc dừng 2 lần, đánh giá sau P1 |
| Webhook thanh toán mới sai → mất tiền/kích hoạt sai | Cao | Test idempotency + chữ ký; SePay test mode ở staging; giao dịch thật 2.000đ trước khi mở; rollback < 15 phút |
| Lộ đáp án khi chuyển Assessment | Cao | Mapper riêng cho học viên không có trường `is_correct`; test tự động quét response |
| Component bị sửa ngoài vùng cho phép | TB | `check-ui-diff` trong CI + visual regression |
| Shape dữ liệu lệch (join lồng, null, thứ tự) | TB | Adapter test so sánh với response Supabase thật đã ghi lại (fixture) |
| Cookie/SSE qua rewrite Vercel không ổn | TB | Kiểm ngay ở P1 (cookie) và đầu P4 (SSE); phương án dự phòng trong O-01 |
| Render/Neon đổi gói free, Render ngủ | TB | Docker hóa sẵn để chuyển VPS; UptimeRobot ping; Neon fallback C-02 |
| Hết hạn mức Claude giữa chừng | TB | Phiên ngắn, đọc tối thiểu, dồn việc cơ học sang Antigravity |
| Chủ dự án không giải thích được code khi phỏng vấn | TB | Tóm tắt 3 dòng mỗi merge, ADR cho mỗi quyết định lớn, tự viết lại 1 phần nhỏ (vd. refresh rotation) |
| Webhook production hiện ở chế độ "None" | Cao | Việc ngay trong DECISIONS §3 (chủ dự án làm, không chờ refactor) |

---

## 8. Ba phiên làm việc đầu tiên

### Phiên 1 — Claude Code: Nền móng P0
**Chuẩn bị của chủ dự án:** điền `SUPABASE_DB_URL` vào `.env` (Supabase → Project Settings → Database → Connection string, chế độ Session); bật Docker Desktop; tạo tài khoản Neon (project `l-english`, region Singapore) nhưng **chưa** cần đưa connection string.

**Prompt:**
```
Phiên 1 — P0 Nền móng. Đọc AGENTS.md, docs/DECISIONS.md, docs/REFACTOR_PLAN.md (mục 2, 5, 6, 8), docs/PROGRESS.md.
Làm:
1. Tạo backend/ (NestJS, TypeScript strict, ESLint+Prettier), cấu hình qua biến môi trường có validate, backend/.env.example.
2. docker-compose.yml ở root: postgres:16, minio, mailpit.
3. Prisma: db pull từ SUPABASE_DB_URL (chỉ đọc), làm sạch schema, migration baseline. Đo kích thước DB, media bucket materials, đếm số bảng thật — ghi kết quả vào DECISIONS.md (O-04, O-05, C-02).
4. Nền chung: exception filter, logger, Swagger /api/docs, /health, ValidationPipe toàn cục.
5. Khung test: Jest + supertest + Testcontainers, 1 test mẫu cho /health.
6. CI: thêm job backend (lint, typecheck, test, build) vào .github/workflows/ci.yml.
7. src/lib/api/client.ts nền (fetch wrapper, base URL qua VITE_API_URL, chưa có auth).
8. scripts/check-ui-diff.mjs theo mục 5.
9. docs/tasks/_TEMPLATE.md, viết spec T-001 (Catalog backend đọc) và T-002 (adapter catalog frontend) cho Antigravity.
10. ADR: 0002 auth tự làm, 0003 hạ tầng free-tier, 0004 cutover một lần, 0005 realtime relay.
Không sửa JSX. Cuối phiên: dán output lint/typecheck/test/build thật, cập nhật PROGRESS.md, commit theo Conventional Commits trên refactor/nestjs-backend.
```
**Kết quả mong đợi:** CI xanh, `docker compose up` chạy, 2 spec task sẵn sàng.

### Phiên 2 — Antigravity: T-001 + T-002 (Catalog)
**Prompt:**
```
Đọc AGENTS.md rồi làm lần lượt docs/tasks/T-001-catalog-read.md và docs/tasks/T-002-catalog-adapter.md.
Mỗi task một nhánh task/T-xxx tách từ refactor/nestjs-backend. Chỉ sửa file được liệt kê trong spec.
Trước khi báo xong: chạy npm run lint, typecheck, test, build ở root và trong backend/, chạy node scripts/check-ui-diff.mjs,
dán output thật vào mục "Kết quả" cuối file task, ghi rõ chỗ không chắc. Push nhánh, không merge.
```
**Song song (chủ dự án):** tạo OAuth Client trên Google Cloud Console (redirect URI sẽ được cung cấp ở phiên 3), tạo App Password Gmail.

### Phiên 3 — Claude Code: review Catalog + Auth P1
**Prompt:**
```
Phiên 3 — P1. Đọc AGENTS.md, docs/PROGRESS.md, docs/REFACTOR_PLAN.md mục 3–6.
1. Review task/T-001 và task/T-002 theo checklist mục 4 (tự chạy lại test). PASS thì merge vào refactor/nestjs-backend, FAIL thì ghi lý do vào file task.
2. Làm AuthModule theo D-06 → D-09: users + refresh_tokens (migration), register/login/refresh/logout/me, xoay vòng refresh + phát hiện dùng lại, argon2, cookie httpOnly SameSite=Lax qua rewrite /api, Google OAuth, forgot/reset password qua Nodemailer (Mailpit ở dev), xác nhận email (C-04), endpoint admin tạo học viên. JwtAuthGuard, RolesGuard.
3. Test phân quyền cho các policy RLS của profiles và user_roles (trích từ supabase/migrations), test luồng refresh rotation.
4. Adapter src/lib/api/auth.ts giữ shape mà useAuth.tsx đang dùng.
5. Viết spec T-003 (thay lệnh gọi auth ở Login/Register/ForgotPassword/ResetPassword/Profile/AuthCallback) cho Antigravity.
Cuối phiên: output DoD thật, cập nhật PARITY.md, PROGRESS.md, Swagger, commit.
```

---

## 9. Definition of Done của mỗi giai đoạn

- Lint, typecheck, test, build pass ở root và `backend/` (dán output thật).
- `check-ui-diff` pass, visual regression không lệch.
- Mỗi policy RLS của module có test tương ứng; PARITY.md tick kèm file cũ → file mới.
- Swagger cập nhật; PROGRESS.md cập nhật; ADR nếu có quyết định mới.
- Mốc của giai đoạn (mục 2) được kiểm chứng trên staging.
