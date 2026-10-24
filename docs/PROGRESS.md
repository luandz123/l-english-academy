# BẢNG THEO DÕI TIẾN ĐỘ REFACTOR (REFACTOR PROGRESS TRACKER)
## DỰ ÁN L-ENGLISH ACADEMY (REACT + NESTJS + POSTGRESQL)

> **Nhánh làm việc**: `refactor/nestjs-backend`  
> **Tag gốc**: `pre-refactor` (commit `ad4bcad`, đã push lên GitHub)  
> **Nguyên tắc cập nhật**: Cập nhật file này sau mỗi task/module hoàn thành. Mọi hội thoại hoặc agent tiếp quản chỉ cần đọc file này là biết chính xác hệ thống đang ở đâu.

---

## 1. Bảng Trạng Thái Tiến Độ Từng Module

| STT | Module / Hạng mục | Phạm vi công việc chính | Trạng thái | Nhánh / Commit | Ngày | Ghi chú & Điểm bàn giao |
| :---: | :--- | :--- | :---: | :--- | :---: | :--- |
| **0** | **Chuẩn bị & Tài liệu nền** | - Tag `pre-refactor` & Branch `refactor/nestjs-backend`<br/>- Backup CSDL 27 bảng ngoài repo<br/>- Tạo tài khoản test dev (Admin/Student)<br/>- [CURRENT_STATE.md](file:///c:/Users/lenovo/l-english-academy/docs/CURRENT_STATE.md) (882 dòng)<br/>- [AGENTS.md](file:///c:/Users/lenovo/l-english-academy/AGENTS.md) & [.agents/rules/refactor-rules.md](file:///c:/Users/lenovo/l-english-academy/.agents/rules/refactor-rules.md)<br/>- [HLD.md](file:///c:/Users/lenovo/l-english-academy/docs/HLD.md), [OPEN_QUESTIONS.md](file:///c:/Users/lenovo/l-english-academy/docs/OPEN_QUESTIONS.md)<br/>- ADR [0000](file:///c:/Users/lenovo/l-english-academy/docs/adr/0000-template.md) & [0001](file:///c:/Users/lenovo/l-english-academy/docs/adr/0001-modular-monolith.md)<br/>- Migration bảo mật Payment & Rollback | 🟢 **HOÀN THÀNH** | `refactor/nestjs-backend`<br/>`3bd8166` | 2026-10-24 | Đã tạo đầy đủ bộ tài liệu nền tảng, kịch bản test và migration vá lỗ hổng payment_orders. |
| **1** | **Module 1: Auth & Users** | - Khởi tạo dự án NestJS backend<br/>- Prisma ORM setup & kết nối PostgreSQL<br/>- Đăng ký, đăng nhập, JWT access ngắn + refresh cookie httpOnly<br/>- Passport JWT Strategy, Google OAuth<br/>- RBAC Guards (`@Roles('admin', 'student')`)<br/>- Frontend API adapter: `src/lib/api/auth.ts` | ⚪ **Chưa bắt đầu** | - | - | Module nền tảng đầu tiên cần triển khai. |
| **2** | **Module 2: Catalog** | - CRUD Khóa học (`courses`), Danh mục (`course_categories`)<br/>- Cấu trúc Modules bài giảng<br/>- Public Read endpoints & Admin mutations<br/>- Frontend adapter: `src/lib/api/catalog.ts` | ⚪ **Chưa bắt đầu** | - | - | Đọc nhiều, ít rủi ro, chuyển đổi nhanh. |
| **3** | **Module 3: Learning** | - Bài học (`lessons`), Tài liệu (`materials`)<br/>- Tiến độ xem video (`user_lesson_progress`)<br/>- Ghi chú cá nhân (`user_notes`), Yêu thích (`user_favorites`)<br/>- Kiểm tra quyền truy cập khóa học (`enrollments`) | ⚪ **Chưa bắt đầu** | - | - | Thay thế logic kiểm tra quyền học bài ở frontend. |
| **4** | **Module 4: Assessment** | - Chấm bài trắc nghiệm Quiz server-side<br/>- Chấm đề thi thử Full Test 200 câu TOEIC<br/>- Quy đổi thang điểm ETS quốc tế chuẩn<br/>- Vocabulary Flashcards & Dictation (chép chính tả)<br/>- Che giấu hoàn toàn cột `is_correct` khỏi client | ⚪ **Chưa bắt đầu** | - | - | **Trọng tâm bảo mật bài thi**: Không cho client gửi điểm hay xem đáp án. |
| **5** | **Module 5: Media** | - Upload avatar, media câu hỏi<br/>- Proxy Google Translate Text-to-Speech (TTS)<br/>- Signed URLs cho video bài giảng trả phí | ⚪ **Chưa bắt đầu** | - | - | Thay thế `api/tts.ts` và bảo vệ tài nguyên video. |
| **6** | **Module 6: Payments** | - Tạo đơn hàng với giá niêm yết server-side<br/>- Webhook nhận biến động số dư SePay 24/7<br/>- Kích hoạt VIP PRO & ghi danh tất cả khóa học<br/>- SSE Stream cập nhật trạng thái đơn tức thời | ⚪ **Chưa bắt đầu** | - | - | Thay thế `api/payment-webhook.ts` và `UpgradeProModal` client insert. |
| **7** | **Module 7: Admin** | - Quản trị danh sách học viên & trạng thái PRO<br/>- Duyệt đơn chuyển khoản thủ công<br/>- Audit nhật ký hoạt động (`admin_activity_log`)<br/>- Cài đặt hệ thống (`platform_settings`) | ⚪ **Chưa bắt đầu** | - | - | Dành riêng cho quyền quản trị viên (`admin`). |
| **8** | **Module 8: Gamification** | - Chuyển toàn bộ dữ liệu từ `localStorage` vào DB<br/>- Quản lý XP, Nhiệm vụ ngày, Rương quà<br/>- Daily Streak cronjob chạy lúc 00:00<br/>- Bảng xếp hạng liên người chơi (Leaderboard) | ⚪ **Chưa bắt đầu** | - | - | Chấm dứt tình trạng F12 sửa điểm XP/Rank. |
| **9** | **Module 9: Speaking** | - Tạo & quản lý phòng đàm thoại (`speaking_rooms`)<br/>- Cấp JWT token kết nối LiveKit SFU Server<br/>- WebSocket trạng thái phòng & thành viên<br/>- Lưu lịch sử phiên luyện nói (`speaking_sessions`) | ⚪ **Chưa bắt đầu** | - | - | Bỏ hoàn toàn WebRTC mesh P2P cũ. |
| **10** | **Module 10: Games Hub** | - WebSocket Gateway cho Word Shooter PvP / Solo<br/>- Tính điểm, trừ sao, thăng hạng server-side<br/>- Leaderboard xếp hạng game thời gian thực | ⚪ **Chưa bắt đầu** | - | - | Hoàn tất module realtime cuối cùng. |
| **11** | **Cắt Cầu & Dọn Dẹp (Final Cutover)** | - Gỡ bỏ hoàn toàn `@supabase/supabase-js`<br/>- Xóa thư mục `supabase/` và `api/`<br/>- Kiểm thử E2E Playwright toàn bộ ứng dụng<br/>- Merge vào `main` | ⚪ **Chưa bắt đầu** | - | - | Kết thúc đợt refactor thành công. |

---

## 2. Quy Ước Ký Hiệu Trạng Thái
- ⚪ **Chưa bắt đầu**: Module nằm trong kế hoạch, chưa có code.
- 🟡 **Đang thực hiện**: Đang trong quá trình viết code / test của module.
- 🔵 **Đang kiểm thử (Testing / Parity check)**: Code đã xong, đang chạy test và rà soát đối sánh với code cũ.
- 🟢 **HOÀN THÀNH**: Đã thỏa mãn 100% Definition of Done (Lint, test, parity tick, commit).
