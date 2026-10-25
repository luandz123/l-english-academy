# DECISIONS — Các quyết định đã chốt cho đợt refactor

> Kết quả buổi thảo luận ngày 2026-10-25 giữa chủ dự án và Claude Code.
> Trạng thái: **ĐÃ DUYỆT** (2026-10-25, gồm cả C-01 → C-06). Từ nay, file này là nguồn sự thật cho REFACTOR_PLAN.md; HLD.md/OPEN_QUESTIONS.md sẽ được chỉnh theo.
> Ký hiệu: ✅ chủ dự án chốt · ⚠️ do Claude quyết, cần xác nhận lại.

---

## 1. Quyết định đã chốt

### Mục tiêu & phạm vi
| ID | Quyết định | Lý do |
|---|---|---|
| D-01 ✅ | Mục tiêu chính: dự án CV có live demo chạy thật. | Nhà tuyển dụng cần link chạy được + repo sạch. |
| D-02 ✅ | **Giai đoạn 1 chỉ làm parity.** Chấm điểm/xếp hạng PvP ở server, leaderboard, streak cron, gamification lên DB, signed URL, chuyển dữ liệu tĩnh vào DB → backlog Phase 2. Lỗ hổng bảo mật vẫn sửa trong giai đoạn 1 (là sửa lỗi, không phải tính năng). | Parity mới đo được; tuân thủ luật 3 AGENTS.md. Gamification nằm ở `localStorage` (`src/hooks/useGamification.ts`). |
| D-03 ✅ | Gamification (`localStorage`), logic game, `part2CoachData.ts`, `toeic600Data.ts`: **không đụng** ở giai đoạn 1. Chỉ chuyển phần game đang dùng Supabase: upload ảnh ở `AdminGamesConfig.tsx`, kênh PvP (xem D-21). | Tính năng chạy ở client; parity là để nguyên. |
| D-21 ✅ | **Sửa khảo sát:** Word Shooter **có PvP** client-to-client qua Supabase Broadcast (`WordShooterLobby.tsx:456`, `WordShooterArena.tsx:777`). Giai đoạn 1 làm **một `RealtimeGateway` Socket.IO dạng relay** giữ đúng ngữ nghĩa Broadcast (join kênh, gửi sự kiện, `self: false`), dùng chung cho PvP, signaling mesh của Speaking và trạng thái phòng. Frontend có adapter `src/lib/api/realtime.ts` mô phỏng API channel để hook đổi tối thiểu. Server không chấm điểm PvP (giữ hành vi cũ). | Một gateway thay 3 nơi dùng Realtime; không thêm tính năng. |
| D-04 ✅ | **Thanh toán SePay thật** (đã liên kết ngân hàng): chuyển đủ luồng sang NestJS — giá tính ở server, webhook bắt buộc xác thực (API Key `Authorization: Apikey <key>` như hiện tại; hỗ trợ thêm HMAC-SHA256 của SePay) + backend từ chối khởi động nếu thiếu secret + idempotent, kích hoạt PRO trong 1 transaction. Endpoint simulate chỉ admin gọi được, có cờ `PAYMENT_SIMULATION_ENABLED`. | Phần giá trị nhất khi phỏng vấn; tiền thật nên bảo mật không được để sau. |

### Dữ liệu & Auth
| ID | Quyết định | Lý do |
|---|---|---|
| D-05 ✅ | Chưa có người dùng thật. **Giữ dữ liệu nội dung** (courses, modules, lessons, materials, quizzes, questions, answers, full_tests, vocab, settings, media); **bỏ tài khoản và kết quả học**, seed lại tài khoản test. | Bỏ được việc chuyển `auth.users`; rollback đơn giản. |
| D-06 ✅ | **Tự làm auth**: Passport, access JWT 15 phút (Bearer), refresh token xoay vòng trong cookie httpOnly, phát hiện dùng lại token → thu hồi cả chuỗi, mật khẩu băm argon2. | Rành NestJS; gỡ hẳn Supabase; chủ đề phỏng vấn trọng tâm. |
| D-07 ✅ | Google OAuth chuyển sang `passport-google-oauth20` ở NestJS; **bỏ nhánh Lovable** trong `src/lib/googleOAuth.ts` (chỉ chạy trên `*.lovable.app` → code chết khi không host ở Lovable). | Không đổi hành vi với người dùng ngoài Lovable. Cần tự tạo OAuth Client trên Google Cloud Console. |
| D-08 ✅ | Email gửi bằng **Nodemailer** qua SMTP; đổi nhà cung cấp chỉ bằng biến `SMTP_*`, không cần interface. Dev dùng **Mailpit** trong docker-compose. | Một implementation duy nhất, không over-engineer. |
| D-09 ✅ | Hai luồng auth phải giữ đúng: đăng ký có/không có session ngay (`src/pages/Register.tsx`), admin tạo học viên (`src/pages/admin/AdminStudents.tsx:38`) → endpoint admin. | Parity. |

### Hạ tầng (ngân sách: 0đ/tháng)
| ID | Quyết định | Lý do |
|---|---|---|
| D-10 ✅ | Backend: **Render free, Singapore**, build từ `Dockerfile`. UptimeRobot gọi `/health` ~10 phút/lần để không bị tắt (1 service 24/7 ≈ 744h < 750h free). | Ngân sách 0. Đánh đổi đã biết: cold start ~1 phút nếu ping hỏng, Render có thể đổi chính sách → chuyển VPS dễ vì đã Docker hóa. |
| D-11 ✅ | Storage: **Cloudflare R2** (prod, free 10GB, không phí egress), **MinIO** (dev). `StorageService` interface có đúng 2 implementation. | Supabase free chỉ 500MB file; R2 tương thích S3. |
| D-12 ✅ | Frontend giữ trên **Vercel**. Chưa mua domain: `/api/*` proxy từ vercel.app sang onrender.com bằng rewrite trong `vercel.json` để cookie refresh là cookie bên thứ nhất (Safari/iOS chặn cookie bên thứ ba). Socket.IO kết nối thẳng onrender.com, xác thực bằng access token trong handshake. | Không cần domain mà vẫn chạy được trên iPhone. |
| D-13 ✅ | Gói vận hành: GitHub Actions (lint, typecheck, test, build, deploy hook Render), `pg_dump` hằng đêm lên R2 giữ 14 ngày + ghi lại 1 lần restore thử, Sentry free, UptimeRobot. | Backup + giám sát là điểm phân biệt project CV với bài tập. |

### Chất lượng & giao diện
| ID | Quyết định | Lý do |
|---|---|---|
| D-14 ✅ | Test: unit cho service có quy tắc nghiệp vụ (chấm điểm, quy đổi ETS, auth, thanh toán); test tích hợp supertest + **Testcontainers** Postgres, mỗi policy RLS cũ có 1 test phân quyền; Playwright smoke 5 luồng chính. Mục tiêu ~80% coverage tầng service, không đặt chỉ tiêu toàn cục. | Test phân quyền là bằng chứng parity bảo mật (luật 4). |
| D-15 ✅ | Repo: thêm thư mục **`backend/`** ở root, frontend để nguyên. Sinh type cho `src/lib/api` từ OpenAPI bằng `openapi-typescript`. Giữ **npm** (CI đang dùng), bỏ `bun.lock`/`bun.lockb`. | Không di chuyển frontend; hợp đồng API không lệch. |
| D-16 ✅ | Giao diện: **không đổi một pixel** ở giai đoạn 1, kể cả lỗi giao diện. Baseline từ `screenshots/` + `scripts/capture_*.cjs`, so sánh ảnh bằng Playwright trong CI. Lỗi từ backend mới phải map về đúng câu chữ của `getFriendlyErrorMessage`. | Luật 1 AGENTS.md. |

### Phối hợp công cụ
| ID | Quyết định | Lý do |
|---|---|---|
| D-17 ✅ | **Claude Code là lead**: thiết kế, các phần suy luận cao (auth, thanh toán, chấm điểm, phân quyền), viết spec task cho Antigravity, review và **merge vào `refactor/nestjs-backend`**. **Antigravity (Pro, Gemini 3.8 Flash)** làm task code đã được đặc tả rõ: adapter `src/lib/api`, DTO + Swagger, khung test, đối chiếu parity từng hook. | Dồn hạn mức Claude vào chỗ cần suy luận; Antigravity nhanh khi yêu cầu rõ. |
| D-18 ⚠️ | Giao thức: Claude viết `docs/tasks/T-xxx.md` (mục tiêu, file được sửa, file cấm sửa, tiêu chí nghiệm thu, lệnh kiểm tra). Chủ dự án chỉ cần chuyển một câu cho Antigravity: "Làm `docs/tasks/T-xxx.md`". Antigravity làm trên nhánh `task/T-xxx` → Claude review theo DoD → merge. **Merge vào `main` chỉ khi chủ dự án đồng ý**, kèm tóm tắt 3 dòng của Claude giải thích thay đổi. | Không có cầu nối trực tiếp giữa 2 công cụ; spec dạng file thì tái sử dụng được và Antigravity không phải đoán. Bản tóm tắt giữ cho bạn giải thích được khi phỏng vấn. |
| D-19 ⚠️ | Quy tắc dừng: task Antigravity trượt review **2 lần** → Claude tự làm task đó và chỉnh mẫu spec. Sau module đầu tiên đánh giá lại cách chia việc (thời gian, số lần trượt, hạn mức Claude đã dùng). | Trả lời nỗi lo "quy trình giữa 2 công cụ không hiệu quả": phát hiện sớm thay vì sau 5 module. |
| D-20 ⚠️ | **Lát cắt dọc trước**: khung NestJS + CI + Docker + Auth + Catalog chạy end-to-end và deploy lên Render/Neon ngay ở mốc đầu tiên, trước khi làm rộng sang các module khác. | Trả lời nỗi lo "làm phí công mà không ra kết quả": sớm có link chạy được, kiểm chứng toàn bộ đường ống (deploy, cookie qua rewrite, CI) khi còn rẻ để sửa. |

---

## 2. Quyết định do Claude thay chủ dự án (⚠️ cần xác nhận lại)

| ID | Quyết định | Lý do | Nếu chọn khác |
|---|---|---|---|
| C-01 | **Không chạy strangler trên production.** Làm toàn bộ trên `refactor/nestjs-backend`; `main` (Supabase) tiếp tục là bản live; cutover một lần khi lõi đạt parity. Rollback = trỏ lại `main`. | Auth tự làm khiến module chưa chuyển gọi Supabase bị RLS chặn (`auth.uid()` = null). Chưa có người dùng thật nên không cần chạy song song. | Giữ strangler thật → làm Auth cuối, NestJS tạm verify JWT Supabase; đi ngược thứ tự HLD. |
| C-02 | DB production: **Neon free, Singapore**. Fallback: Supabase làm Postgres thuần nếu DB > ~0,4GB. Claude sẽ đo kích thước khi lập kế hoạch. | Managed, có branching, restore 6h; Postgres free của Render hết hạn sau 30 ngày; Supabase free tạm dừng sau 1 tuần không hoạt động và không có backup. | Postgres trên VPS → tự lo backup/nâng cấp. |
| C-03 | Email prod: **Gmail SMTP + App Password** (~500 email/ngày). Khi có domain chuyển sang Resend SMTP bằng `.env`. | Resend không có domain chỉ gửi được tới email chủ tài khoản. | Dùng domain hiện có → Resend được ngay. |
| C-04 | Xác nhận email khi đăng ký: **coi như đang bật**. | Code hỗ trợ cả hai chế độ; không xác định được từ repo. | Kiểm tra dashboard Supabase → Authentication → Providers → Email → "Confirm email" rồi sửa. |
| C-05 | **Speaking: giữ WebRTC mesh**, thay kênh signaling Supabase Broadcast (`src/hooks/useVoiceRoom.ts:334`) bằng **Socket.IO gateway chỉ làm relay** (chuyển tiếp offer/answer/ICE theo phòng). Nhánh LiveKit vẫn giữ, tự bật khi có key. Trạng thái phòng (`postgres_changes` ở `SpeakingRoomsPage.tsx:102`) cũng qua Socket.IO. Làm cuối giai đoạn 1. | Chưa có `LIVEKIT_API_KEY` → **production đang chạy mesh**, bỏ mesh là đổi hành vi. Frontend đã có sẵn logic WebRTC, chỉ thay kênh vận chuyển nên khối lượng nhỏ (trước đây tôi ước lượng quá cao). Vì vậy HLD "bỏ mesh, LiveKit 100%" chuyển sang Phase 2. | Đăng ký LiveKit Cloud free, dùng 100% SFU → nâng chất lượng nhưng là thay đổi hành vi. |
| C-06 | Thời gian: ~15 giờ/tuần. Lõi 5 module (Auth, Catalog, Learning, Assessment, Payments) chạy trên **staging** trong 3–4 tuần; **toàn bộ** (thêm Admin, Media, Realtime/Speaking/PvP) và cutover production ~7–9 tuần. Lý do: theo C-01, cutover cần 100% lệnh gọi Supabase đã chuyển, vì sau khi đổi auth mọi lệnh còn lại sẽ bị RLS chặn. | Chủ dự án muốn "vài hôm" — không thực tế với 239 lệnh gọi Supabase trong 62 file + test phân quyền + hạn mức Claude Pro. | Nếu thật sự chỉ vài ngày: phạm vi = khung + CI + Docker + Auth + Catalog. |

---

## 3. Việc cần làm NGAY (ngoài refactor, trên bản live `main`)

1. **Webhook SePay đang ở chế độ xác thực "None".** `api/payment-webhook.ts:69` chỉ kiểm tra token khi có biến `SEPAY_WEBHOOK_API_KEY`/`PAYMENT_WEBHOOK_SECRET`, mà hiện chưa cấu hình → ai biết URL có thể gửi request giả để tự nâng PRO. Cách sửa không cần code: tạo key ngẫu nhiên → SePay webhook bước Bảo mật chọn **API Key** → đặt cùng giá trị vào `SEPAY_WEBHOOK_API_KEY` trên Vercel (Production) → redeploy → thử 1 đơn nhỏ. Chủ dự án làm (đã nhận hướng dẫn 2026-10-25).

---

## 4. Điều còn mở

| ID | Vấn đề | Khi nào phải chốt |
|---|---|---|
| O-01 | SSE trạng thái đơn thanh toán đi qua rewrite của Vercel có ổn định không (timeout, buffering). Phương án dự phòng: SSE kết nối thẳng onrender.com bằng vé ngắn hạn, hoặc polling. Hành vi cũ là Supabase Realtime (`UpgradeProModal.tsx:163`). | Khi làm module Payments, có thử nghiệm thật. |
| O-02 | Vercel Hobby chỉ cho phép phi thương mại; thu tiền là thương mại. Khi có doanh thu: chuyển frontend sang Cloudflare Pages hoặc Vercel Pro. | Trước khi có doanh thu. |
| O-03 | Pháp lý (Nghị định 13/2023, thuế cá nhân kinh doanh online, trang Điều khoản/Chính sách). Chủ dự án hoãn vì chưa có người dùng và doanh thu. | Trước khi mở bán cho người dùng thật. |
| O-04 | HLD ghi 31 bảng, PROGRESS ghi backup 27 bảng. Cần đối chiếu với DB thật trước khi viết schema Prisma. | Phiên đầu tiên. |
| O-05 | Kích thước DB và media hiện tại (quyết định C-02 và hạn mức R2). | Khi lập kế hoạch. |
| O-06 | Domain hiện có: nếu dùng (`app.`/`api.`) thì C-03 và D-12 đơn giản hơn. | Bất cứ lúc nào. |

---

## 5. Giả định

- A-01: Chưa có người dùng thật; dữ liệu tài khoản và kết quả học không cần giữ.
- A-02: Bản live hiện tại chạy trên Vercel (không phải Lovable).
- A-03: Antigravity tự chạy được lint/test/build trên máy và push nhánh lên GitHub.
- A-04: Render free, Neon free, R2 free, UptimeRobot, Sentry giữ chính sách như tháng 10/2026.
- A-05: SePay retry webhook khi lỗi (tối đa ~8 lần, tài liệu ghi lúc 33 phút lúc 5 giờ); timeout 8–30 giây.

---

## 6. Tài liệu cần chỉnh sau khi duyệt

- **HLD.md**: bỏ PvP/leaderboard/streak cron/"LiveKit 100%" khỏi giai đoạn 1 (D-02, C-05); thay chiến lược strangler trên production bằng C-01; thêm hạ tầng D-10 → D-13.
- **OPEN_QUESTIONS.md**: #1 (OAuth thực tế có nhánh Lovable), #3 (webhook đã có kiểm tra token nhưng là tùy chọn), #4/#6/#7 đóng theo D-03/C-05/D-02.
- **PROGRESS.md**: thêm mốc lát cắt dọc (D-20), đưa module 8 và 10 sang Phase 2.
