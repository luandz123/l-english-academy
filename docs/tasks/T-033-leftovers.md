# T-033: Dọn các truy vấn Supabase còn lại (trừ Speaking và Realtime Broadcast)

> **Người làm**: Antigravity · **Module**: assessment, admin, learning, catalog · **Nhánh**: `task/T-033-leftovers` (tách từ `origin/refactor/nestjs-backend`)
> **Phụ thuộc**: T-026, T-028 · **Ước lượng**: 4 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md`, `docs/HLD.md`, `docs/PARITY.md`.

---

## 1. Mục tiêu
Chuyển đổi toàn bộ các câu truy vấn Supabase còn sót lại ở phía frontend sang backend NestJS API có xác thực, phân quyền và kiểm soát bảo mật chặt chẽ:
- Bảng xếp hạng thời gian học (Dashboard): tính tổng theo user ở server (`SUM(time_spent_seconds)`), không trả dòng kết quả riêng lẻ của học viên khác.
- Danh sách đề thi Full Test trên Dashboard.
- Thống kê tổng quan nền tảng (Profile / HeroSection).
- Bộ dữ liệu dự phòng AdminBackup (chỉ đọc) và Admin Activity Log.
- API lấy ngân hàng từ vựng ngẫu nhiên cho game Word Shooter (`WordShooterLobby.tsx:199`), tuyệt đối không đụng vào kênh broadcast realtime.
- Quản trị từ vựng theo bài học (`AdminLessonVocab.tsx`).
- Danh sách tài khoản Admin (`AdminSettings.tsx`).
- Dọn import Supabase thừa (`AdminGamesConfig.tsx`, `HeroSection.tsx`).

---

## 2. Phạm vi

### 2.1 File được sửa
**Backend**:
- `backend/src/modules/assessment/assessment.controller.ts`, `assessment.service.ts`, `assessment.repository.ts`
- `backend/src/modules/assessment/full-test.controller.ts`, `full-test.service.ts`, `full-test.repository.ts`
- `backend/src/modules/assessment/vocab.controller.ts`, `vocab.service.ts`, `vocab.repository.ts`
- `backend/src/modules/assessment/assessment-admin.controller.ts`, `assessment-admin.service.ts`, `assessment-admin.repository.ts`
- `backend/src/modules/admin/admin.controller.ts`, `admin.service.ts`, `admin.repository.ts`
- `backend/src/modules/learning/learning.controller.ts`, `learning.service.ts`
- DTOs và spec tương ứng trong các module trên.
- E2E tests: `backend/test/leftovers-admin-backup.e2e-spec.ts`, `backend/test/assessment-leaderboard.e2e-spec.ts`.

**Frontend**:
- `src/lib/api/assessment.ts`, `src/lib/api/assessment.test.ts`
- `src/lib/api/admin.ts`, `src/lib/api/admin.test.ts`
- `src/lib/api/vocab.ts`, `src/lib/api/vocab.test.ts`
- `src/lib/api/learning.ts`, `src/lib/api/learning.test.ts`
- `src/pages/DashboardPage.tsx`
- `src/pages/Profile.tsx`
- `src/pages/MyCoursesPage.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/admin/AdminLessonVocab.tsx`
- `src/pages/admin/AdminBackup.tsx`
- `src/pages/admin/AdminSettings.tsx`
- `src/pages/admin/AdminGamesConfig.tsx`
- `src/components/game/WordShooter/WordShooterLobby.tsx`

### 2.2 Cấm sửa
- JSX, `className`, layout, câu chữ giao diện, query key TanStack Query (chỉ thêm `user?.id` nếu thiếu theo #21).
- Tuyệt đối **KHÔNG** sửa Speaking room (`speakingService.ts`, `useVoiceRoom.ts`, `SpeakingRoomsPage.tsx`, `api/speaking-token.ts`) và các kênh broadcast `arena-pvp-*`, `lobby-pvp-*`.

---

## 3. Hành vi cũ cần giữ (nguồn sự thật)

| Chỗ dùng cũ | Truy vấn Supabase cũ | Kết quả component mong đợi |
|---|---|---|
| `DashboardPage.tsx:310` | `user_full_test_results.select("user_id, time_spent_seconds")` + `user_quiz_results.select(...)` | Mảng `Array<[string, number]>` sắp xếp tổng giây giảm dần |
| `DashboardPage.tsx:208` | `full_tests.select("id, title, category, display_order, course_id").order("display_order")` | `Array<{ id, title, category, display_order, course_id }>` |
| `Profile.tsx:205-208` | `questions` count (total, listening, reading) + `full_tests` count | Object `{ totalQuestions, listeningQuestions, readingQuestions, totalFullTests }` |
| `HeroSection.tsx:17` | `profiles.select("user_id", { count: "exact", head: true })` | Object `{ users: number, courses: number }` |
| `MyCoursesPage.tsx:103` | `modules.select("..., lessons(..., duration_minutes)")` lỗi query | Trả về `[]` và fallback đếm bài học theo courseId |
| `WordShooterLobby.tsx:199` | `vocab_questions.select("id, word, phonetic, definition_vi, audio_male_url").limit(100)` | Mảng từ vựng hợp lệ |
| `AdminBackup.tsx:83-164` | `tableStats`: select count 10 bảng; `handleExportFullBackup`: select * từ 17 bảng | JSON snapshot đúng cấu trúc cũ |
| `AdminBackup.tsx:218` | `admin_activity_log.insert(...)` | Ghi nhật ký admin |
| `AdminBackup.tsx:259` | `profiles.select("user_id, full_name, email, avatar_url, updated_at")` | CSV danh sách học viên |
| `AdminBackup.tsx:288` | `user_full_test_results.select(...)` | CSV kết quả Full Test |
| `AdminBackup.tsx:334` | `questions`, `answers`, `full_tests` | JSON ngân hàng câu hỏi |
| `AdminLessonVocab.tsx:34-306` | CRUD `vocab_quizzes` và `vocab_questions` theo lessonId | Quản lý từ vựng bài học |
| `AdminSettings.tsx:194` | `user_roles.select("user_id").eq("role", "admin")` -> `profiles.in(...)` | Danh sách hồ sơ các Admin |
| `AdminGamesConfig.tsx:12` | Import `supabase` thừa, không gọi lệnh nào | Dọn sạch import thừa |

---

## 4. Đặc tả API mới

### 4.1 Bảng xếp hạng & Dashboard
- `GET /api/v1/assessment/leaderboard/study-time`
  - Guard: Public / OptionalJwtAuthGuard
  - Backend thực hiện aggregate `SUM(time_spent_seconds)` gom nhóm theo `user_id` từ `user_full_test_results` và `user_quiz_results`, sắp xếp giảm dần, giới hạn top 100.
  - Tuyệt đối không trả về từng dòng điểm/thời gian riêng lẻ của các user khác (bảo vệ quyền riêng tư).
  - Trả về: `Array<{ user_id: string; total_seconds: number }>`
  - Adapter client map sang: `Array<[string, number]>` khớp 100% với props của `LeaderboardModal`.

- `GET /api/v1/assessment/full-tests`
  - Guard: Public
  - Trả về danh sách tất cả Full Tests được xuất bản: `id, title, category, display_order, course_id`, sắp xếp `display_order asc`.

### 4.2 Thống kê Platform
- `GET /api/v1/assessment/stats/overview`
  - Guard: Public
  - Trả về:
    ```json
    {
      "total_questions": 24382,
      "listening_questions": 12676,
      "reading_questions": 11706,
      "total_full_tests": 55,
      "total_users": 1500
    }
    ```

### 4.3 Word Shooter Game Vocab Pool
- `GET /api/v1/assessment/vocab/pool?limit=100`
  - Guard: Public
  - Trả về tối đa 100 từ vựng có `word` và `definition_vi` không rỗng từ bảng `vocab_questions`.
  - Không sửa bất kỳ kênh Realtime Broadcast pvp nào.

### 4.4 Admin Backup & Activity Log
- Toàn bộ route admin nằm trong controller có guard `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')`.
- `GET /api/v1/admin/backup/stats`
  - Trả về số lượng bản ghi hiện có của 10 bảng dữ liệu: `courses`, `lessons`, `full_tests`, `questions`, `answers`, `profiles`, `user_full_test_results`, `enrollments`, `vocab_quizzes`, `platform_settings`.
- `GET /api/v1/admin/backup/export-full`
  - Đọc dữ liệu chỉ đọc (read-only) từ các bảng hệ thống để đóng gói JSON sao lưu.
- `GET /api/v1/admin/backup/export-students`
  - Trả về danh sách profiles cho xuất CSV.
- `GET /api/v1/admin/backup/export-test-results`
  - Trả về danh sách kết quả thi Full Test cho xuất CSV.
- `GET /api/v1/admin/backup/export-question-bank`
  - Trả về câu hỏi, đáp án, đề thi cho xuất JSON.
- `POST /api/v1/admin/activity-log`
  - Lưu nhật ký hoạt động của admin (`action`, `entity_type`, `entity_id`, `details`). `admin_id` lấy tự động từ JWT token, client không gửi `admin_id`.
- `GET /api/v1/admin/activity-log`
  - Xem danh sách nhật ký hoạt động.
- `GET /api/v1/admin/users/admins`
  - Trả về danh sách thông tin hồ sơ của các tài khoản có vai trò `admin`.

### 4.5 Admin Lesson Vocab
- `GET /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz`
- `POST /api/v1/assessment/admin/vocab/lessons/:lessonId/quiz`
- `GET /api/v1/assessment/admin/vocab/quizzes/:quizId/words`
- `POST /api/v1/assessment/admin/vocab/quizzes/:quizId/words`
- `PUT /api/v1/assessment/admin/vocab/words/:id`
- `DELETE /api/v1/assessment/admin/vocab/words/:id`
- `POST /api/v1/assessment/admin/vocab/words/bulk-delete`
- `GET /api/v1/assessment/admin/vocab/lessons`

---

## 5. Tiêu chí nghiệm thu
- [x] Bảng xếp hạng học tập cộng tổng ở server, bảo mật quyền riêng tư của học viên.
- [x] AdminBackup chỉ đọc, dữ liệu xuất JSON/CSV giữ nguyên định dạng cũ.
- [x] `WordShooterLobby.tsx` chuyển sang đọc vocab pool qua API, giữ nguyên kênh broadcast.
- [x] Speaking rooms và Realtime PvP không bị chỉnh sửa.
- [x] Mọi endpoint admin có guard `JwtAuthGuard` + `RolesGuard(admin)` và kiểm tra quyền đầy đủ.
- [x] `npx tsc --noEmit -p tsconfig.app.json` không có lỗi ở các file sửa.
- [x] `npx eslint src/lib/api/*.ts` sạch.
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` không lệch UI.

---

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend run test
npm --prefix backend run test:e2e -- assessment-leaderboard.e2e-spec.ts leftovers-admin-backup.e2e-spec.ts
npm test -- src/lib/api/assessment.test.ts src/lib/api/admin.test.ts src/lib/api/vocab.test.ts
npx tsc --noEmit -p tsconfig.app.json 2>&1 | Select-String "error TS" | Select-String "src/lib/api|DashboardPage|Profile|MyCoursesPage|HeroSection|AdminBackup|AdminLessonVocab|AdminSettings|WordShooterLobby"
npx eslint src/lib/api/assessment.ts src/lib/api/admin.ts src/lib/api/vocab.ts
node scripts/check-ui-diff.mjs refactor/nestjs-backend
```

---

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật (bắt buộc)
- [x] **Mọi id client gửi đều thuộc đúng đối tượng cha**: `quizId`, `lessonId` kiểm tra tồn tại.
- [x] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: guard admin `JwtAuthGuard` + `RolesGuard(admin)` trên toàn bộ endpoint backup/admin và assessment-admin.
- [x] **Dữ liệu người khác**: bảng xếp hạng gom nhóm tổng `SUM(time_spent_seconds)` ở server, không trả danh sách nộp bài / kết quả riêng của người khác.
- [x] **Giới hạn đầu vào**: `ArrayMaxSize(200)`, `MaxLength` cho mọi DTO.
- [x] **Giá trị nhạy cảm do server tính**: tổng thời gian học tính ở server; display_order tính ở server; admin_id lấy tự động từ JWT token, client không gửi admin_id.
- [x] **Ghi nhiều bước = một `$transaction`**: tạo từ vựng theo lô cập nhật tổng số câu trong transaction.
- [x] **Lỗi dạng `{ code, message }`**: ném đúng cấu trúc chuẩn.

- Commit(s):
  - `76d88d1` refactor(assessment,admin,learning): cleanup remaining supabase queries (T-033)
  - `996811e` Merge origin/refactor/nestjs-backend into task/T-033-leftovers
- File đã sửa:
  - `backend/src/modules/assessment/dto/leftovers.dto.ts`
  - `backend/src/modules/assessment/dto/index.ts`
  - `backend/src/modules/assessment/assessment.controller.ts`, `assessment.service.ts`, `assessment.repository.ts`
  - `backend/src/modules/assessment/full-test.controller.ts`, `full-test.service.ts`, `full-test.repository.ts`
  - `backend/src/modules/assessment/vocab.controller.ts`, `vocab.service.ts`, `vocab.repository.ts`
  - `backend/src/modules/assessment/assessment-admin.controller.ts`, `assessment-admin.service.ts`, `assessment-admin.repository.ts`
  - `backend/src/modules/admin/dto/admin-backup.dto.ts`, `admin-activity-log.dto.ts`, `index.ts`
  - `backend/src/modules/admin/admin.controller.ts`, `admin.service.ts`, `admin.repository.ts`, `admin.mapper.ts`
  - `backend/src/modules/learning/learning.controller.ts`
  - `backend/test/assessment-leaderboard.e2e-spec.ts`
  - `backend/test/leftovers-admin-backup.e2e-spec.ts`
  - `src/lib/api/assessment.ts`, `src/lib/api/assessment.test.ts`
  - `src/lib/api/admin.ts`, `src/lib/api/admin.test.ts`
  - `src/lib/api/vocab.ts`, `src/lib/api/vocab.test.ts`
  - `src/lib/api/learning.ts`, `src/lib/api/learning.test.ts`
  - `src/pages/DashboardPage.tsx`
  - `src/pages/Profile.tsx`
  - `src/pages/MyCoursesPage.tsx`
  - `src/components/landing/HeroSection.tsx`
  - `src/components/admin/AdminLessonVocab.tsx`
  - `src/pages/admin/AdminBackup.tsx`
  - `src/pages/admin/AdminSettings.tsx`
  - `src/pages/admin/AdminGamesConfig.tsx`
  - `src/components/game/WordShooter/WordShooterLobby.tsx`
  - `src/components/game/WordShooter/gameSound.ts`
- Output lệnh kiểm tra:
```bash
$ npm --prefix backend run lint
> eslint "{src,test}/**/*.ts"
(clean, 0 errors)

$ npm --prefix backend run build
> nest build
(clean, exit 0)

$ npm --prefix backend run test
Test Suites: 26 passed, 26 total
Tests:       346 passed, 346 total
Snapshots:   0 total
Time:        2.642 s

$ npm --prefix backend run test:e2e -- assessment-leaderboard.e2e-spec.ts leftovers-admin-backup.e2e-spec.ts assessment-bulk-import.e2e-spec.ts catalog-course-import.e2e-spec.ts
PASS test/assessment-bulk-import.e2e-spec.ts
PASS test/catalog-course-import.e2e-spec.ts
PASS test/leftovers-admin-backup.e2e-spec.ts
PASS test/assessment-leaderboard.e2e-spec.ts
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        5.408 s

$ npm test -- src/lib/api/assessment.test.ts src/lib/api/admin.test.ts src/lib/api/vocab.test.ts src/lib/api/learning.test.ts src/lib/api/catalog.test.ts
Test Files  5 passed (5)
Tests  162 passed (162)
Duration  1.76s

$ npx tsc --noEmit -p tsconfig.app.json 2>&1 | Select-String "error TS" | Select-String "src/lib/api|DashboardPage|Profile|MyCoursesPage|HeroSection|AdminBackup|AdminLessonVocab|AdminSettings|WordShooterLobby"
(clean, rỗng)

$ npx eslint src/lib/api/assessment.ts src/lib/api/admin.ts src/lib/api/vocab.ts src/lib/api/catalog.ts
(clean, 0 errors)

$ node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```
- Chỗ chưa chắc: Không có.

---

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

---

## 9. Review (Claude điền)
- Kết quả:
- Lý do:
