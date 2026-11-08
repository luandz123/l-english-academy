# T-035: Chuyển nốt các lời gọi Supabase bị grep một dòng bỏ sót (Multiline Leftovers)

> **Người làm**: Antigravity · **Module**: learning, assessment, catalog · **Nhánh**: `task/T-035-multiline-leftovers`
> **Phụ thuộc**: T-034 · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md` (§T-035), `docs/HLD.md`, `docs/PARITY.md`.

---

## 1. Mục tiêu
Chuyển đổi toàn bộ các câu truy vấn Supabase còn sót lại do lệnh grep một dòng bỏ qua (`await supabase` xuống dòng rồi mới `.from(...)`):
1. `MyCoursesPage.tsx:48` và `DashboardPage.tsx:114`: lấy danh sách ghi danh `enrollments` + `courses(*)` của chính user hiện tại, sắp theo `enrolled_at desc`. Dùng endpoint `GET /api/v1/learning/my-enrollments` trả đúng shape `*, courses(*)`. Giữ nguyên xử lý lỗi (`MyCoursesPage` ném lỗi, `DashboardPage` bỏ qua lỗi).
2. `App.tsx:63`: redirect `/fulltest/:id` → dùng API client `getFullTest(tId)` đã có (`GET /assessment/full-tests/:id`), khi 404 trả null.
3. `AdminFullTestManager.tsx` và `CourseFullTestManager.tsx`:
   - Danh sách đề: `GET /api/v1/assessment/admin/full-tests` (lọc tùy chọn theo `courseId`), trả thông tin đề kèm `courses (title)` và `full_test_sections (id, part_number, quiz_id, quizzes (total_questions))`.
   - Danh sách khóa: dùng API client `listAdminCourses()` đã có.
   - Tạo đề: `POST /api/v1/assessment/admin/full-tests` tạo đề + 7 quiz `Part N - <title>` + 7 section, tất cả trong MỘT `$transaction`. Giữ đúng tiêu đề và thứ tự part 1-7.
   - Sửa đề: dùng `updateAdminFullTest` (`PUT /api/v1/assessment/admin/full-tests/:testId`), mở rộng DTO cho phép sửa `course_id`, `display_order`, `total_questions`.
4. `AdminVocabPacks.tsx:548`: tìm từ vựng trong kho hệ thống: `GET /api/v1/assessment/admin/vocab/search?q=...` (chỉ đọc, limit cố định 60 ở server, Prisma `contains` + `mode: insensitive`).
5. Xóa dòng `import { supabase }` không còn dùng ở `AdminFullTestQuestions.tsx`, `AdminCourseNew.tsx`, `LessonManager.tsx`.
6. Sau task: lệnh kiểm tra import Supabase client chỉ còn 5 file: `speakingService.ts`, `SpeakingRoomsPage.tsx`, `useVoiceRoom.ts` (Speaking #11) và `WordShooterLobby.tsx`, `WordShooterArena.tsx` (channel #28).

---

## 2. Phạm vi

### 2.1 File được sửa/tạo
**Backend**:
- `backend/src/modules/learning/dto/enrollment.dto.ts`
- `backend/src/modules/learning/learning.controller.ts`
- `backend/src/modules/learning/learning.service.ts`
- `backend/src/modules/learning/learning.repository.ts`
- `backend/src/modules/learning/learning.mapper.ts`
- `backend/src/modules/assessment/dto/assessment-admin.dto.ts`
- `backend/src/modules/assessment/assessment-admin.controller.ts`
- `backend/src/modules/assessment/assessment-admin.service.ts`
- `backend/src/modules/assessment/assessment-admin.repository.ts`
- `backend/test/multiline-leftovers.e2e-spec.ts` (mới: kiểm tra 401, 403, 2xx cho my-enrollments, admin full-tests, admin vocab search)

**Frontend**:
- `src/lib/api/learning.ts`, `src/lib/api/learning.test.ts`
- `src/lib/api/assessment.ts`, `src/lib/api/assessment.test.ts`
- `src/pages/MyCoursesPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/App.tsx`
- `src/pages/admin/AdminFullTestManager.tsx`
- `src/components/admin/CourseFullTestManager.tsx`
- `src/pages/admin/AdminVocabPacks.tsx`
- `src/pages/admin/AdminFullTestQuestions.tsx`
- `src/pages/admin/AdminCourseNew.tsx`
- `src/components/admin/LessonManager.tsx`
- `docs/tasks/T-035-multiline-leftovers.md`
- `docs/tasks/QUEUE.md`

### 2.2 Cấm sửa
- Speaking (`speakingService.ts`, `useVoiceRoom.ts`, `SpeakingRoomsPage.tsx`, `api/speaking-token.ts`, kênh `lobby-pvp-*`, `arena-pvp-*`).
- `render.yaml`, `vercel.json`, `.github/workflows`, `docs/CUTOVER.md`.
- JSX, `className`, bố cục, câu chữ hiển thị giao diện, queryKey (chỉ thêm `user?.id` nếu quy tắc #21 yêu cầu).

---

## 3. Hành vi cũ cần giữ (nguồn sự thật)

| Chỗ dùng cũ | Truy vấn Supabase cũ | Hành vi cần giữ |
|---|---|---|
| `MyCoursesPage.tsx:48-55` | `supabase.from("enrollments").select("*, courses(*)").eq("user_id", user.id).order("enrolled_at", { ascending: false })` | Trả danh sách khóa đã ghi danh kèm thông tin course; ném lỗi khi có error |
| `DashboardPage.tsx:114-120` | `supabase.from("enrollments").select("*, courses(*)").eq("user_id", user.id).order("enrolled_at", { ascending: false })` | Lấy danh sách ghi danh để tìm khóa Nghe-Đọc; bỏ qua lỗi khi thất bại |
| `App.tsx:63-68` | `supabase.from("full_tests").select("course_id").eq("id", tId).maybeSingle()` | Lấy `course_id` của đề thi; trả null khi không tìm thấy |
| `AdminFullTestManager.tsx:50-67` | `supabase.from("full_tests").select("*, courses(title), full_test_sections(id, part_number, quiz_id, quizzes(total_questions))").order("created_at", { ascending: false })` | Danh sách toàn bộ đề thi kèm tên khóa và số câu từng part |
| `AdminFullTestManager.tsx:74-79` | `supabase.from("courses").select("id, title, course_type")` | Danh sách khóa học để chọn liên kết |
| `AdminFullTestManager.tsx:98-102` | `supabase.from("full_tests").update(payload).eq("id", editingTest.id)` | Cập nhật đề thi |
| `AdminFullTestManager.tsx:105-140` | `supabase.from("full_tests").insert(payload)` + tạo 7 quiz + tạo 7 section | Tạo đề thi và khởi tạo 7 section TOEIC tương ứng |
| `CourseFullTestManager.tsx:82-101` | `supabase.from("full_tests").select("*, full_test_sections(...)").eq("course_id", courseId).order("display_order", { ascending: true })` | Danh sách đề thi thuộc 1 khóa cụ thể |
| `CourseFullTestManager.tsx:137-180` | `supabase.from("full_tests").insert(...)` + tạo 7 quiz + tạo 7 section | Tạo đề thi kèm 7 section cho khóa |
| `CourseFullTestManager.tsx:208-220` | `supabase.from("full_tests").update(...)` | Cập nhật thông tin đề thi trong khóa |
| `AdminVocabPacks.tsx:548-563` | `supabase.from("vocab_questions").select("id, word, phonetic, definition_vi, example_sentence").not("word", "is", null).order("id", { ascending: false }).limit(60)` | Tìm kiếm từ vựng theo từ khóa, tối đa 60 kết quả |
| `AdminFullTestQuestions.tsx:5` | `import { supabase } from "@/integrations/supabase/client";` | Dòng import thừa, xóa bỏ |
| `AdminCourseNew.tsx:12` | `import { supabase } from "@/integrations/supabase/client";` | Dòng import thừa, xóa bỏ |
| `LessonManager.tsx:10` | `import { supabase } from "@/integrations/supabase/client";` | Dòng import thừa, xóa bỏ |

**Policy RLS tương ứng**:
- `enrollments`: Học viên chỉ đọc ghi danh của chính mình (`user_id = auth.uid()`).
- `full_tests`: Public đọc đề; Admin toàn quyền thêm/sửa/xóa.
- `vocab_questions`: Admin đọc và quản lý ngân hàng từ vựng.

---

## 4. Thiết kế chi tiết

### 4.1 Endpoint `GET /api/v1/learning/my-enrollments`
- **Quyền**: `JwtAuthGuard` (yêu cầu đăng nhập).
- **RLS**: Lọc theo `userId` từ token xác thực.
- **Repository**:
  ```typescript
  findMyEnrollments(userId: string): Promise<EnrollmentWithCourse[]> {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: { course: true },
      orderBy: [{ enrolledAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
    });
  }
  ```
- **DTO**: Trả mảng `MyEnrollmentDto` gồm các trường snake_case: `id`, `user_id`, `course_id`, `enrolled_at`, `expires_at`, `courses: CourseDto | null`.

### 4.2 Endpoint `GET /api/v1/assessment/admin/full-tests`
- **Quyền**: `JwtAuthGuard`, `RolesGuard('admin')`.
- **Query params**: `courseId?: number`.
- **Repository**:
  - Nếu có `courseId`: lọc theo `courseId`, sắp `{ displayOrder: 'asc' }, { createdAt: 'desc' }`.
  - Nếu không có: sắp `{ createdAt: 'desc' }`.
  - Include: `course: { select: { title: true } }`, `sections: { include: { quiz: { select: { totalQuestions: true } } }, orderBy: { partNumber: 'asc' } }`.
- **Mapper**: Chuyển đổi sang `courses: { title }` và `full_test_sections: [{ id, part_number, quiz_id, quizzes: { total_questions } }]`.

### 4.3 Endpoint `POST /api/v1/assessment/admin/full-tests`
- **Quyền**: `JwtAuthGuard`, `RolesGuard('admin')`.
- **DTO**: `CreateFullTestDto`:
  - `title`: string (bắt buộc)
  - `course_id`: number (bắt buộc)
  - `description`?: string | null
  - `audio_url`?: string | null
  - `category`?: string (mặc định "2026")
  - `display_order`?: number (nếu không truyền, tự động tính bằng `existingCount + 1`)
  - `release_date`?: string | null
  - `total_questions`?: number (mặc định 200)
- **Transaction**:
  1. Tạo bản ghi `full_test`.
  2. Vòng lặp `part = 1..7`:
     - Tạo quiz: `title: "Part " + part + " - " + title.trim()`, `total_questions: 0`, `display_order: part`.
     - Tạo section: `test_id: newTest.id`, `part_number: part`, `quiz_id: newQuiz.id`.
  3. Trả về thông tin `full_test` vừa tạo.

### 4.4 Cập nhật `PUT /api/v1/assessment/admin/full-tests/:testId`
- Mở rộng `UpdateFullTestDto` thêm các trường tùy chọn: `course_id?: number`, `display_order?: number`, `total_questions?: number`.
- `updateFullTest`: cập nhật các trường này nếu có truyền vào.

### 4.5 Endpoint `GET /api/v1/assessment/admin/vocab/search`
- **Quyền**: `JwtAuthGuard`, `RolesGuard('admin')`.
- **Query params**: `q?: string`.
- **Repository**:
  ```typescript
  findVocabQuestionsSearch(q?: string): Promise<VocabQuestion[]> {
    return this.prisma.vocabQuestion.findMany({
      where: {
        word: {
          not: null,
          ...(q?.trim() ? { contains: q.trim(), mode: 'insensitive' } : {}),
        },
      },
      orderBy: { id: 'desc' },
      take: 60,
      select: {
        id: true,
        word: true,
        phonetic: true,
        definitionVi: true,
        exampleSentence: true,
      },
    });
  }
  ```

---

## 5. Kế hoạch triển khai

1. **Backend**:
   - Thêm `GET /api/v1/learning/my-enrollments` (DTO, Mapper, Service, Repository, Controller).
   - Mở rộng `UpdateFullTestDto`, thêm `CreateFullTestDto`, thêm `GET /api/v1/assessment/admin/full-tests` và `POST /api/v1/assessment/admin/full-tests`.
   - Thêm `GET /api/v1/assessment/admin/vocab/search`.
   - Viết test E2E `multiline-leftovers.e2e-spec.ts`.
2. **Frontend Adapter**:
   - Thêm `getMyEnrollments` vào `src/lib/api/learning.ts`.
   - Thêm `listAdminFullTests`, `createAdminFullTest`, `searchAdminVocabWords` vào `src/lib/api/assessment.ts`.
   - Cập nhật unit test trong `learning.test.ts` và `assessment.test.ts`.
3. **Frontend Pages / Components**:
   - `MyCoursesPage.tsx`: chuyển sang `getMyEnrollments()`.
   - `DashboardPage.tsx`: chuyển sang `getMyEnrollments()`.
   - `App.tsx`: chuyển sang `getFullTest()`.
   - `AdminFullTestManager.tsx`: chuyển sang `listAdminFullTests()`, `listAdminCourses()`, `createAdminFullTest()`, `updateAdminFullTest()`.
   - `CourseFullTestManager.tsx`: chuyển sang `listAdminFullTests({ courseId })`, `createAdminFullTest()`, `updateAdminFullTest()`.
   - `AdminVocabPacks.tsx`: chuyển sang `searchAdminVocabWords()`.
   - Xóa `import { supabase }` ở `AdminFullTestQuestions.tsx`, `AdminCourseNew.tsx`, `LessonManager.tsx`.
4. **Kiểm tra và xác nhận**:
   - Chạy lệnh grep bắt buộc: kiểm tra danh sách file còn import supabase.

---

## 6. Lệnh kiểm tra
```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend run test
npm --prefix backend run test:e2e -- multiline-leftovers.e2e-spec.ts
npm test -- src/lib/api/learning.test.ts src/lib/api/assessment.test.ts
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | grep -E "src/lib/api|MyCoursesPage|DashboardPage|App|AdminFullTestManager|CourseFullTestManager|AdminVocabPacks|AdminFullTestQuestions|AdminCourseNew|LessonManager"
npx eslint src/lib/api/learning.ts src/lib/api/assessment.ts
node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -rl "integrations/supabase/client" src --include=*.ts --include=*.tsx | grep -v "\.test\."
```

---

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật (bắt buộc)
- [x] **Mọi id client gửi đều thuộc đúng đối tượng cha**: `course_id` được kiểm tra tồn tại khi tạo đề; `userId` đọc enrollments lấy từ JWT token (không nhận từ client).
- [x] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: guard `JwtAuthGuard` trên `GET /learning/my-enrollments`; `JwtAuthGuard` + `RolesGuard('admin')` trên mọi route admin mới (`/assessment/admin/full-tests`, `/assessment/admin/vocab/search`).
- [x] **Dữ liệu người khác**: học viên chỉ đọc đúng ghi danh của chính mình (`req.user.id`); admin mới xem được danh sách đề và tìm kiếm từ vựng.
- [x] **Giới hạn đầu vào**: search giới hạn `take: 60` cố định ở server; các trường text có giới hạn độ dài thông qua DTO + `class-validator`.
- [x] **Giá trị nhạy cảm do server tính**: `display_order` của đề thi (max + 1) và 7 phần TOEIC (Part 1..7) do server tự sinh.
- [x] **Ghi nhiều bước = một `$transaction`**: tạo đề thi + 7 quiz + 7 section diễn ra trong duy nhất 1 transaction Prisma (`$transaction`).
- [x] **Lỗi dạng `{ code, message }`**: ném đúng cấu trúc chuẩn qua NestJS exception filter.

- Commit(s):
  - `cd5bd5c`: docs(tasks): write spec for T-035 multiline leftovers
  - `12d1430`: feat(assessment,learning): migrate multiline supabase queries to nestjs endpoints (T-035)
- File đã sửa:
  - Backend:
    - `backend/src/modules/learning/dto/enrollment.dto.ts`
    - `backend/src/modules/learning/learning.repository.ts`
    - `backend/src/modules/learning/learning.mapper.ts`
    - `backend/src/modules/learning/learning.service.ts`
    - `backend/src/modules/learning/learning.controller.ts`
    - `backend/src/modules/assessment/dto/assessment-admin.dto.ts`
    - `backend/src/modules/assessment/assessment-admin.repository.ts`
    - `backend/src/modules/assessment/assessment.mapper.ts`
    - `backend/src/modules/assessment/assessment-admin.service.ts`
    - `backend/src/modules/assessment/assessment-admin.controller.ts`
    - `backend/test/multiline-leftovers.e2e-spec.ts`
  - Frontend:
    - `src/lib/api/learning.ts`
    - `src/lib/api/learning.test.ts`
    - `src/lib/api/assessment.ts`
    - `src/lib/api/assessment.test.ts`
    - `src/pages/MyCoursesPage.tsx`
    - `src/pages/DashboardPage.tsx`
    - `src/App.tsx`
    - `src/pages/admin/AdminFullTestManager.tsx`
    - `src/components/admin/CourseFullTestManager.tsx`
    - `src/pages/admin/AdminVocabPacks.tsx`
    - `src/pages/admin/AdminFullTestQuestions.tsx`
    - `src/pages/admin/AdminCourseNew.tsx`
    - `src/components/admin/LessonManager.tsx`
- Output lệnh kiểm tra:
  - `npm --prefix backend run lint`:
    ```
    > backend@0.0.1 lint
    > eslint "{src,test}/**/*.ts"
    (exit code 0)
    ```
  - `npm --prefix backend run build`:
    ```
    > backend@0.0.1 build
    > nest build
    (exit code 0)
    ```
  - `npm --prefix backend run test`:
    ```
    Test Suites: 26 passed, 26 total
    Tests:       346 passed, 346 total
    Snapshots:   0 total
    Time:        21.983 s, estimated 23 s
    Ran all test suites.
    ```
  - `npm --prefix backend run test:e2e -- multiline-leftovers.e2e-spec.ts`:
    ```
    PASS test/multiline-leftovers.e2e-spec.ts (13.375 s)
      Multiline Leftovers E2E (T-035)
        GET /learning/my-enrollments (T-035)
          √ 401 khi không gửi token (133 ms)
          √ 200 học viên lấy danh sách ghi danh của chính mình kèm courses (107 ms)
        Admin Full Tests - GET /assessment/admin/full-tests (T-035)
          √ 401 khi không token (34 ms)
          √ 403 khi là học viên (41 ms)
          √ 200 admin xem danh sách đề thi kèm courses và sections (91 ms)
        Admin Full Tests - POST /assessment/admin/full-tests (T-035)
          √ 401 khi không token (63 ms)
          √ 403 khi là học viên (42 ms)
          √ 201 admin tạo đề thi tự động tạo 7 quizzes và 7 sections trong 1 transaction (206 ms)
        Admin Full Tests - PUT /assessment/admin/full-tests/:testId (T-035)
          √ 401 khi không token (21 ms)
          √ 403 khi là học viên (36 ms)
          √ 200 admin cập nhật thông tin đề thi (93 ms)
        Admin Vocab Search - GET /assessment/admin/vocab/search (T-035)
          √ 401 khi không token (23 ms)
          √ 403 khi là học viên (33 ms)
          √ 200 admin tìm kiếm từ vựng (39 ms)

    Test Suites: 1 passed, 1 total
    Tests:       14 passed, 14 total
    Snapshots:   0 total
    Time:        13.724 s, estimated 15 s
    Ran all test suites matching multiline-leftovers.e2e-spec.ts.
    ```
  - `npm test -- src/lib/api/learning.test.ts src/lib/api/assessment.test.ts`:
    ```
     ✓ src/lib/api/assessment.test.ts (58 tests) 144ms
     ✓ src/lib/api/learning.test.ts (51 tests) 141ms

     Test Files  2 passed (2)
          Tests  109 passed (109)
       Start at  20:02:28
       Duration  5.19s
    ```
  - `npm test -- --run` (toàn bộ frontend vitest):
    ```
     Test Files  14 passed (14)
          Tests  229 passed (229)
    ```
  - `npm run build` (frontend build):
    ```
    ✓ 2739 modules transformed.
    ✓ built in 1m 27s
    (exit code 0)
    ```
  - `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | grep -E "src/lib/api|MyCoursesPage|DashboardPage|App|AdminFullTestManager|CourseFullTestManager|AdminVocabPacks|AdminFullTestQuestions|AdminCourseNew|LessonManager"`:
    ```
    (empty / rỗng - không có lỗi TS)
    ```
  - `npx eslint src/lib/api/learning.ts src/lib/api/assessment.ts`:
    ```
    (exit code 0 - sạch hoàn toàn)
    ```
  - `node scripts/check-ui-diff.mjs refactor/nestjs-backend`:
    ```
    check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
    ```
  - Kiểm tra danh sách file còn import Supabase client:
    `grep -rl "integrations/supabase/client" src --include=*.ts --include=*.tsx | grep -v "\.test\."`:
    ```
    src/components/game/WordShooter/WordShooterArena.tsx
    src/components/game/WordShooter/WordShooterLobby.tsx
    src/hooks/useVoiceRoom.ts
    src/pages/SpeakingRoomsPage.tsx
    src/services/speakingService.ts
    ```
    **Chứng minh chỉ còn phần đã quyết định giữ**:
    - `src/components/game/WordShooter/WordShooterArena.tsx` & `WordShooterLobby.tsx`: chỉ sử dụng `supabase.channel()` cho realtime PvP matchmaking theo quyết định #28 (`docs/OPEN_QUESTIONS.md`).
    - `src/hooks/useVoiceRoom.ts`, `src/pages/SpeakingRoomsPage.tsx`, `src/services/speakingService.ts`: toàn bộ chức năng Speaking Room WebRTC được hoãn lại theo quyết định #11 (`docs/OPEN_QUESTIONS.md`).
    Không còn bất kỳ truy vấn dữ liệu nào (`supabase.from()`, `supabase.rpc()`, `supabase.storage`) trong toàn bộ frontend ngoại trừ các ngoại lệ đã được duyệt trên.
- Chỗ chưa chắc: Không có.

---

## 8. Câu hỏi (người làm điền khi bị chặn)
*(Không có)*

---

## Review (Claude, 2026-10-29) — ✅ PASS, merged (Claude sửa khi merge)

Logic đúng: `GET /learning/my-enrollments` lấy `user_id` từ token (RLS "Users view own enrollments"), route admin guard cấp class + e2e 3 vai, tạo đề + 7 quiz + 7 section trong một `$transaction`, tìm từ vựng `limit` cố định ở server.

**Claude sửa khi merge:**
1. **Prettier định dạng lại JSX** ở 9 file `.tsx` (thụt lề `<Route>`, gộp dòng template literal trong `className`) → khôi phục định dạng gốc, chỉ giữ dòng import/queryFn/mutationFn. `check-ui-diff`: OK.
2. **Tạo đề áp mặc định của CourseFullTestManager cho mọi nơi gọi** (`category '2026'`, `display_order = count + 1`, trim) → trường không gửi để mặc định DB như insert cũ của `AdminFullTestManager` (`general`, `0`); lưu đúng giá trị client gửi.
3. **Sửa đề ghi đè `category = '2026'`, `release_date = null`** khi client không gửi (AdminFullTestManager cũ chỉ gửi title/description/audio_url/course_id) → mất dữ liệu mỗi lần sửa. Nay chỉ cập nhật trường có trong request.

Lưu ý cho lần sau: **không chạy Prettier/format-on-save cho `src/**/*.tsx`**; chỉ format file backend.

Kiểm tra sau gộp (merge/T-035, sau sửa): backend LINT_OK, TYPE_OK, unit 346/346, e2e 447/447 (trước sửa) + 48/48 hai spec bị ảnh hưởng (sau sửa), BUILD_OK; frontend 229/229, FE_LINT_OK, tsc (adapter + trang đã sửa) rỗng, `check-ui-diff` OK, `✓ built`.

File còn import Supabase client: `WordShooterArena.tsx`, `WordShooterLobby.tsx` (chỉ `supabase.channel` — #28), `useVoiceRoom.ts`, `SpeakingRoomsPage.tsx`, `speakingService.ts` (#11).
