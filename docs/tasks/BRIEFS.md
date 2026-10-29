# Bản tóm tắt task (Antigravity tự viết spec)

Từ T-025, Claude chỉ viết **bản tóm tắt** dưới đây. Antigravity tự khảo sát code cũ và viết spec đầy đủ.

## Quy trình cho mỗi task trong file này
1. Tạo nhánh như QUEUE ghi. Chép `docs/tasks/_TEMPLATE.md` thành `docs/tasks/T-0xx-<slug>.md`.
2. **Khảo sát code cũ**, điền mục 3 "Hành vi cũ" của spec: từng chỗ `supabase.` (file:dòng, truy vấn, cách xử lý lỗi cũ), policy RLS liên quan (tìm trong `supabase/migrations/`). Ghi đủ, đừng tóm tắt.
3. Viết mục 4 "Đặc tả" theo **ràng buộc** của bản tóm tắt + mẫu đã có (T-009, T-012, T-019, T-023: controller admin riêng, guard cấp class, `inTransaction`, DTO class-validator, mapper, 404/400/409 có `code`).
4. Commit spec riêng (`docs(tasks): spec T-0xx`), **rồi** mới code. Gặp hành vi lạ hoặc ràng buộc không đủ rõ → ghi mục "Câu hỏi", làm phần còn lại, push.
5. Kiểm tra như mọi task: chạy lệnh mục 6 **sau commit cuối**, dán output **nguyên văn**, push.

### Tự rà bảo mật trước khi push (bắt buộc — dán checklist đã đánh dấu vào mục Kết quả)
- [ ] **Mọi id client gửi đều thuộc đúng đối tượng cha**: câu hỏi thuộc quiz, đáp án thuộc câu, bài thuộc chương, practice thuộc bài… Id lạ → 400 `*_IDS_INVALID`/`*_NOT_IN_*`, không ghi gì. Có e2e gửi id của đối tượng khác.
- [ ] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**, không chỉ route đầu tiên (đọc đề có kiểm thì nộp, lưu, reset cũng phải kiểm). Có e2e người không có quyền → 403 ở **từng** route.
- [ ] **Dữ liệu người khác**: route theo `:id` kiểm chủ sở hữu (hoặc admin); `user_id` chỉ lấy từ token.
- [ ] **Giới hạn đầu vào**: mảng có `ArrayMaxSize`, chuỗi lớn có `MaxLength`, file có `limits.fileSize` **ở multer** (không chỉ kiểm sau khi đã đọc file), MIME + đuôi file khớp nhau; không nhận SVG/HTML từ học viên.
- [ ] **Giá trị nhạy cảm do server tính**: điểm, tổng số câu (đếm thật), giá, `display_order`, hạn ghi danh. DTO không có trường đó (`forbidNonWhitelisted` tự chặn), có e2e gửi kèm → 400.
- [ ] **Ghi nhiều bước = một `$transaction`**; lỗi giữa chừng không để lại bản ghi dở.
- [ ] **Lỗi dạng `{ code, message }`**, không ném chuỗi trần.

Luật chung nhắc lại: không sửa JSX/`className`/câu chữ/`queryKey`; giữ đúng cách xử lý lỗi cũ (chỗ cũ bỏ qua lỗi thì vẫn bỏ qua); client **không** gửi điểm, giá, quyền, `user_id`, `display_order`; route `/me` hay đoạn cố định khai báo **trước** `/:id`; e2e 3 vai (401/403/2xx) cho mọi route admin.

---

## T-025 · Dictation (`DictationPage.tsx`) — quyết định #26 (a)
- Chuyển 4 nhóm lệnh: đọc quiz + câu hỏi, bài học theo `quiz_id`, từ vựng theo `question_id`, tạo/đọc `user_quiz_results`, lưu/reset câu (`user_answers`), reset tất cả.
- **Đề vẫn gửi transcript/`dictation_keywords`/`answers` như cũ** (client cần để tô chữ sai khi gõ). Quyền làm: dùng `LearningService.canTakeQuiz` như quiz (#22a); không có quyền → 403 `QUIZ_LOCKED`.
- **Điểm do server đếm**: `PUT …/dictation/:quizId/questions/:questionId/done` và `DELETE` (bỏ đánh dấu), `POST …/reset`. Server tự tìm/tạo kết quả mới nhất của user cho quiz, ghi `user_answers.is_correct`, rồi **đếm** `correct_answers = score = số câu is_correct = true` (như cũ `score = allDoneCount`), `total_questions = số câu của quiz`. Client **không** gửi `score`/`correct_answers`.
- Giữ `localStorage` (`dictation_done_*`) và cập nhật lạc quan `setQueryData` như cũ.

## T-026 · Upload file qua backend (Supabase Storage) — quyết định #27
- Endpoint `POST /api/v1/media/upload` (multipart, guard admin) nhận `file` + `folder` (danh sách thư mục cho phép: lấy đúng các tiền tố code cũ dùng: `lesson_pdfs`, `quiz_media`, `fulltests/audio`, `fulltests/images`, `materials`, `avatars`, …) → upload vào bucket `materials` bằng **service role key ở server** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — biến môi trường mới, thêm `.env.example`, `render.yaml` với `sync: false`; **không** commit giá trị) → trả `{ path, public_url }` **giống hệt** `getPublicUrl` cũ.
- Avatar học viên (`Profile.tsx`): `POST /api/v1/media/avatar` guard JWT, chỉ ảnh, ≤ 5 MB, đường dẫn do server đặt theo `user_id`.
- Giới hạn kích thước (lấy theo cấu hình bucket hoặc 50 MB), kiểm MIME theo loại.
- Thay **mọi** `supabase.storage.from("materials").upload(...)` + `getPublicUrl(...)` (12 file, xem `grep -rn "supabase.storage" src`) bằng adapter `uploadMedia(file, folder)` trả `publicUrl`. Giữ nguyên tên file/đường dẫn cũ đã tạo ở client nếu có (truyền `filename`).
- Một module mới `MediaModule` (`backend/src/modules/media/`), `StorageService` là interface vì có 2 implementation (Supabase thật + bản giả trong test) — đúng luật "interface chỉ khi có 2 implementation".

## T-027 · Thư viện tài liệu (`materials`) — phụ thuộc T-026
- `AdminMaterials.tsx`, `ImportDialog.tsx`, phần tài liệu ở `AdminCourseDetail.tsx`, `materials` trong `QuizManager.tsx:156`: CRUD bảng `materials` (thêm, xóa, xóa theo thư mục, đổi `folder_path`) qua `/api/v1/admin/materials` (module Learning hoặc Media — chọn Media, ghi lý do).
- Xóa theo thư mục và đổi tên thư mục: **một transaction**.

## T-028 · Import hàng loạt (Full Test + khóa học từ JSON) — phụ thuộc T-026
- `AdminFullTestManager.tsx`, `CourseFullTestManager.tsx`, `AdminCourseJsonImport.tsx` (ADM-012, ADM-014, ADD-002).
- Một endpoint import mỗi loại nhận **toàn bộ JSON đã parse** (file media upload trước qua T-026, JSON chỉ chứa URL) → server tạo đề/section/quiz/câu/đáp án (hoặc khóa/chương/bài/quiz/câu) trong **một `$transaction`**. Lỗi giữa chừng → không còn bản ghi dở (đây là lý do của ADD-002).
- Giữ đúng quy ước đặt tên/thứ tự code cũ đang làm ở client (title `Part N - …`, `display_order`…): chép quy tắc sang server, ghi rõ trong spec.
- Xóa đề / xóa quiz ở 2 trang này cũng chuyển sang API.

## T-029 · Popup luyện tập trong `LearnPage` (#20, #22f)
- `LearnPage.tsx:201` đọc `questions + answers(*)` của quiz popup. Endpoint `GET /api/v1/learning/lessons/:lessonId/practices/:practiceId/questions` trả câu **kèm** `is_correct` (JSX chấm ngay trong popup) **chỉ khi** `canStudyLesson` cho bài đó; không có quyền → 403. Practice phải thuộc bài.
- `learn-quiz-results` (`LearnPage.tsx:104`) đã chuyển ở T-011 — kiểm lại, nếu còn thì chuyển.

## T-030 · Khảo sát realtime (Speaking + Games) — quyết định #28, **chỉ khảo sát, không code**
- Đọc `speakingService.ts`, `useVoiceRoom.ts`, `SpeakingRoomsPage.tsx`, `api/speaking-token.ts`, `WordShooterLobby.tsx`, `WordShooterArena.tsx`, `AdminGamesConfig.tsx`, các migration `speaking_*`, `word_shooter_*` (nếu có) và `docs/adr/0005-realtime-relay.md`.
- Viết `docs/tasks/T-030-realtime-survey.md`: với **mỗi** chỗ gọi Supabase ghi (1) bảng/kênh realtime/RPC dùng, (2) có phụ thuộc `auth.uid()`/RLS không (tức là sẽ hỏng sau cắt cầu), (3) đề xuất tối thiểu để chạy được sau cắt cầu (vd. token LiveKit qua backend, dữ liệu phòng qua API, realtime giữ nguyên nếu không cần auth). Push rồi chuyển task kế. Claude quyết và viết tóm tắt T-031/T-032 sau.

## T-033 · Dọn lẻ — phụ thuộc T-026
- `AdminBackup.tsx` (ADM-019): xuất dữ liệu qua endpoint admin (đọc nhiều bảng) — **chỉ đọc**, giữ định dạng file xuất cũ.
- `admin_activity_log` (ADM-021): endpoint admin đọc nhật ký (trang nào đang đọc thì chuyển).
- `DashboardPage.tsx` bảng xếp hạng thời gian học (`:310`) + danh sách mọi đề (`:208`), `Profile.tsx` đếm số đề (`:207`), `MyCoursesPage.tsx:103` (giữ lỗi cột `duration_minutes` như cũ — #12 chưa quyết, trả `[]` như hiện tại thì ghi rõ), `HeroSection.tsx`, `AdminLessonVocab.tsx`, `AdminGamesConfig.tsx` (phần không realtime), `utils/audioUrl.ts`, `integrations/lovable`.
- Bảng xếp hạng: endpoint trả **tổng thời gian theo user** (server cộng), không trả từng dòng kết quả của người khác.
