# T-028: Import hàng loạt (Full Test + khóa học từ JSON)

> **Người làm**: Antigravity · **Module**: `AssessmentModule` & `CatalogModule` · **Nhánh**: `task/T-028-bulk-import` (tách từ `origin/refactor/nestjs-backend`)
> **Phụ thuộc**: T-026 (đã merged) · **Ước lượng**: 4 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md`, `docs/HLD.md`. Gặp gì không rõ: **dừng và ghi vào mục "Câu hỏi"**, không tự đoán.

## 1. Mục tiêu
Thay thế toàn bộ logic import hàng loạt JSON trên client (bắn hàng trăm request rời rạc, không an toàn và dễ để lại bản ghi rác dở dang khi gặp lỗi) bằng các endpoint backend admin thực thi trong **MỘT `$transaction`** duy nhất. Đồng thời chuyển thao tác xóa đề / xóa quiz ở `AdminFullTestManager.tsx` và `CourseFullTestManager.tsx` sang API backend.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/assessment/dto/bulk-import.dto.ts` — DTOs cho import Full Test (single & package) và bulk delete full tests
- `backend/src/modules/assessment/assessment-admin.controller.ts` — thêm routes: `POST full-tests/:testId/import-questions`, `POST full-tests/package-import`, `DELETE full-tests/:id`, `POST full-tests/bulk-delete`
- `backend/src/modules/assessment/assessment-admin.service.ts` — logic transaction import full tests và xóa đề/quizzes
- `backend/src/modules/assessment/assessment-admin.repository.ts` — truy vấn Prisma cho full tests, sections, quizzes, questions, answers
- `backend/src/modules/assessment/assessment-admin.service.spec.ts` — unit tests cho các method mới
- `backend/test/assessment-bulk-import.e2e-spec.ts` — e2e test 3 vai (401/403/201/200/204), parent-child validation và rollback transaction khi lỗi
- `backend/src/modules/catalog/dto/course-json-import.dto.ts` — DTO cho import Module + Quizzes + Lessons + Questions từ JSON vào khóa học
- `backend/src/modules/catalog/catalog-admin.controller.ts` — thêm route: `POST courses/:courseId/import-json`
- `backend/src/modules/catalog/catalog-admin.service.ts` — logic transaction import course JSON
- `backend/src/modules/catalog/catalog.repository.ts` — truy vấn module/lesson/quiz/question/answer trong transaction
- `backend/src/modules/catalog/catalog-admin.service.spec.ts` — unit test cho course json import
- `backend/test/catalog-course-import.e2e-spec.ts` — e2e test cho course JSON import và rollback khi lỗi
- `src/lib/api/assessment.ts` — thêm API client cho import full test, delete full test, bulk delete full tests
- `src/lib/api/assessment.test.ts` — unit test cho các hàm API client mới
- `src/lib/api/catalog.ts` — thêm API client cho import course JSON
- `src/lib/api/catalog.test.ts` — unit test cho hàm API client mới
- `src/pages/admin/AdminFullTestManager.tsx` — chuyển delete, bulk delete và 2 luồng import sang API
- `src/components/admin/CourseFullTestManager.tsx` — chuyển delete và import JSON sang API
- `src/pages/admin/AdminCourseJsonImport.tsx` — chuyển import JSON và lấy danh sách courses sang API
- `docs/tasks/T-028-bulk-import.md` — spec task này
- `docs/tasks/QUEUE.md` — cập nhật trạng thái

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị, `queryKey`, tên state trong mọi file `.tsx`
- Giữ nguyên luồng tải media tại client (file media tải lên trước qua `/media/upload`, JSON gửi lên backend chỉ chứa URL)

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase | Kết quả component mong đợi |
|---|---|---|
| `AdminFullTestManager.tsx:165-171` | `supabase.from("full_tests").delete().eq("id", testId)` + `supabase.from("quizzes").delete().in("id", quizIds)` | Xóa đề thi và các quiz thuộc sections của đề |
| `AdminFullTestManager.tsx:195-201` | `supabase.from("full_tests").delete().in("id", testIds)` + `supabase.from("quizzes").delete().in("id", quizIds)` | Xóa hàng loạt đề thi và các quiz liên quan |
| `AdminFullTestManager.tsx:323-546` | Đọc sections, xóa câu hỏi cũ nếu ghi đè hoặc tạo full_test + 7 sections + 7 quizzes, insert questions (chunk 20), insert answers (chunk 50), cập nhật quiz `total_questions` | Import trọn bộ đề Full Test từ JSON |
| `AdminFullTestManager.tsx:568-718` | Đọc sections của test đã chọn, insert questions + answers, cập nhật quiz `total_questions` & full_test `total_questions` | Import câu hỏi cho 1 đề Full Test |
| `CourseFullTestManager.tsx:246-252` | `supabase.from("full_tests").delete().eq("id", testId)` + `supabase.from("quizzes").delete().in("id", quizIds)` | Xóa đề thi trong màn hình khóa học |
| `CourseFullTestManager.tsx:335-430` | Lấy/tạo 7 sections cho đề thi, gom câu hỏi theo Part (1..7), insert questions, insert answers, cập nhật quiz & full_test totals | Import JSON câu hỏi cho 1 đề thi |
| `AdminCourseJsonImport.tsx:39-43` | `supabase.from("courses").select("id, title").order("title")` | Lấy danh sách khóa học target |
| `AdminCourseJsonImport.tsx:127-268` | Tìm max `display_order`, tạo module mới, tạo quiz + lesson (loại exam) cho từng exam, insert questions + answers, cập nhật quiz totals | Import Module + Exams từ file JSON `toeic_cap_toc_part_X.json` |

**Policy RLS tương ứng**:
- `Full tests viewable by all` / `Admins manage full tests`
- `Sections viewable by all` / `Admins manage sections`
- `Quizzes viewable by all` / `Admins manage quizzes`
- `Questions/Answers viewable by all` / `Admins manage questions` / `Admins manage answers`
- `Modules viewable by all` / `Admins manage modules`
- `Lessons viewable by all` / `Admins manage lessons`
Tất cả các route admin được bảo vệ bằng `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')`.

## 4. Đặc tả
### 4.1 Endpoints
#### 4.1.1 Full Test Management & Bulk Import (`assessment-admin.controller.ts`)
- `DELETE /api/v1/assessment/admin/full-tests/:id`
  - Param: `id` (ParseIntPipe)
  - Tìm full_test; nếu không có → 404 `FULLTEST_NOT_FOUND`.
  - Trong **một `$transaction`**:
    - Tìm toàn bộ `quiz_id` trong `full_test_sections` của `test_id = id`.
    - Xóa `full_tests` where `id = id` (Prisma cascade xóa `full_test_sections`).
    - Nếu có `quiz_id`, xóa các `quizzes` tương ứng.
  - Trả về: 204 No Content.

- `POST /api/v1/assessment/admin/full-tests/bulk-delete`
  - Body: `BulkDeleteFullTestsDto` (`test_ids`: number[], `@ArrayNotEmpty()`, `@ArrayMaxSize(100)`)
  - Trong **một `$transaction`**:
    - Tìm toàn bộ `quiz_id` trong `full_test_sections` của `test_id in test_ids`.
    - Xóa `full_tests` where `id in test_ids`.
    - Xóa các `quizzes` tương ứng.
  - Trả về: `{ count: number }` (200 OK).

- `POST /api/v1/assessment/admin/full-tests/:testId/import-questions`
  - Param: `testId` (ParseIntPipe)
  - Body: `ImportFullTestQuestionsDto`
    - `questions`: QuestionItemDto[] (`@ArrayNotEmpty()`, `@ArrayMaxSize(1000)`)
  - Logic trong **một `$transaction`**:
    - Kiểm tra `full_tests` có `id = testId`, nếu không có → 404 `FULLTEST_NOT_FOUND`.
    - Kiểm tra các section hiện có của test. Nếu chưa đủ 7 sections (Part 1..7):
      - Tự động tạo quiz `title: "Part ${p} - ${test.title}"`, `display_order: p`, `total_questions: 0`.
      - Tạo section `part_number: p`, `quiz_id: quiz.id`, `test_id: testId`.
    - Phân loại câu hỏi theo Part 1..7:
      `part = q.part_number || q.part || (display_order <= 6 ? 1 : display_order <= 31 ? 2 : display_order <= 70 ? 3 : display_order <= 100 ? 4 : display_order <= 130 ? 5 : display_order <= 146 ? 6 : 7)`
    - Insert questions vào từng quiz theo part. Question text: nếu có `passage_text` thì ghép `[PASSAGE]${passage_text}[ENDPASSAGE]${question_text}`.
    - Insert answers cho từng question (`answer_text`, `is_correct`, `explanation`, `display_order`).
    - Cập nhật `total_questions` cho từng quiz và cho `full_test`.
  - Trả về: `{ test_id: number, imported_questions: number }` (201 Created).

- `POST /api/v1/assessment/admin/full-tests/package-import`
  - Body: `PackageImportFullTestsDto`
    - `course_id`: optional number
    - `create_new_course`: optional boolean (default false)
    - `course_title`: optional string (MaxLength 255)
    - `exams`: ExamPackageItemDto[] (`@ArrayNotEmpty()`, `@ArrayMaxSize(100)`)
  - Logic trong **một `$transaction`**:
    - Nếu `create_new_course` = true hoặc không có `course_id`:
      - Tạo khóa học mới: `title: course_title || "Bộ đề Full Test mới"`, `course_type: "fulltest"`, `is_published: true`, `instructor: "Cô Mai Phương"`, `duration_months: 12`.
      - `targetCourseId = newCourse.id`.
    - Ngược lại: kiểm tra khóa học `course_id` tồn tại, nếu không có → 404 `COURSE_NOT_FOUND`.
    - Lặp qua từng exam trong `exams`:
      - `examTitle = exam.exam_title || exam.title || "Đề thi số " + (idx + 1)`
      - Kiểm tra đề đã tồn tại trong khóa học chưa (`title = examTitle` và `course_id = targetCourseId`):
        - Nếu có: xóa các câu hỏi cũ trong các quiz của sections để overwrite.
        - Nếu chưa: tạo `full_test` mới, tạo 7 quizzes (`Part ${p} - ${examTitle}`), tạo 7 sections.
      - Nếu có `exam.audio_url`: cập nhật `audio_url` của `full_test`.
      - Insert questions và answers theo part 1..7.
      - Cập nhật số lượng câu hỏi cho các quiz và đề thi.
  - Trả về: `{ course_id: number, exams_imported: number }` (201 Created).

#### 4.1.2 Course JSON Import (`catalog-admin.controller.ts`)
- `POST /api/v1/catalog/admin/courses/:courseId/import-json`
  - Param: `courseId` (ParseIntPipe)
  - Body: `CourseJsonImportDto`
    - `course_title`: optional string (MaxLength 255)
    - `exams`: CourseJsonExamDto[] (`@ArrayNotEmpty()`, `@ArrayMaxSize(100)`)
  - Logic trong **một `$transaction`**:
    - Kiểm tra khóa học `courseId` tồn tại, nếu không → 404 `COURSE_NOT_FOUND`.
    - Tính `display_order` tiếp theo cho module: `max(display_order) + 1` (hoặc 0 nếu chưa có module nào).
    - Tạo `Module`: `course_id: courseId`, `title: course_title || "Part mới"`, `display_order: nextOrder`.
    - Lặp qua từng exam trong `exams` (index `ei`):
      - `examTitle = exam.exam_title || "Đề " + (ei + 1)`
      - `examAudioUrl = exam.audio_url || exam.questions.find(q => q.audio_url)?.audio_url || null`
      - Tạo `Quiz`: `module_id: module.id`, `title: examTitle`, `total_questions: exam.questions.length`, `display_order: ei`, `audio_url: examAudioUrl`.
      - Tạo `Lesson`: `module_id: module.id`, `title: examTitle`, `lesson_type: "exam"`, `quiz_id: quiz.id`, `display_order: ei`.
      - Lặp qua từng question trong `exam.questions` (index `qi`):
        - `part = q.part || 5`
        - `qType = PART_TYPE_MAP[part] || "part" + part`
        - `questionText = (q.passage_text && (part === 6 || part === 7)) ? "[PASSAGE]" + q.passage_text + "[ENDPASSAGE]" + (q.question_text || "") : (q.question_text || "")`
        - Tạo `Question`: `quiz_id: quiz.id`, `question_text: questionText`, `question_type: qType`, `display_order: qi`, `translation: q.translation || null`, `audio_url: q.audio_url || null`, `image_url: q.image_url || null`, `transcript: q.transcript || null`, `group_id: q.group_id ? String(q.group_id) : null`.
        - Tạo `Answers`: `answer_text: a.answer_text || ""`, `is_correct: !!a.is_correct`, `explanation: a.explanation || null`, `display_order: a.display_order ?? aIdx`.
      - Cập nhật Quiz `total_questions = questions.length`.
  - Trả về: `{ module_id: number, exams_count: number, total_questions: number }` (201 Created).

### 4.2 DTOs & Validation
- Giới hạn mảng: `@ArrayMaxSize(100)` cho danh sách exams, `@ArrayMaxSize(1000)` cho questions, `@ArrayMaxSize(10)` cho answers mỗi câu.
- Giới hạn chuỗi: `@MaxLength(255)` cho tiêu đề, `@MaxLength(1000)` cho URLs, `@MaxLength(10000)` cho passage_text/question_text/explanation.
- `class-validator` với `forbidNonWhitelisted: true`.

## 5. Tiêu chí nghiệm thu
- [x] Toàn bộ thao tác tạo bản ghi nằm trong MỘT `$transaction`. Lỗi giữa chừng tự rollback, không để lại bản ghi rác.
- [x] Có e2e test kiểm tra tính transaction rollback khi gặp lỗi giữa chừng.
- [x] Xóa đề thi đơn và xóa nhiều đề thi xóa sạch cả sections và quizzes liên kết trong transaction.
- [x] Quy ước đặt tên ("Part N - ...", "Đề N", `display_order`) được chép chính xác từ code client cũ sang server.
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK (không đổi giao diện).
- [x] `tsc` và `eslint` sạch.

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend run test
npm --prefix backend run test:e2e -- assessment-bulk-import.e2e-spec.ts
npm --prefix backend run test:e2e -- catalog-course-import.e2e-spec.ts
npm --prefix backend run build
npm test -- src/lib/api/assessment.test.ts
npm test -- src/lib/api/catalog.test.ts
npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error TS" | grep -E "src/lib/api|AdminFullTestManager|CourseFullTestManager|AdminCourseJsonImport"
npx eslint src/lib/api/assessment.ts src/lib/api/catalog.ts
node scripts/check-ui-diff.mjs refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật (bắt buộc)
- [x] **Mọi id client gửi đều thuộc đúng đối tượng cha**: `course_id`, `testId` kiểm tra tồn tại (404).
- [x] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('admin')` cho toàn bộ endpoint admin.
- [x] **Dữ liệu người khác**: Chỉ admin mới có quyền thực hiện import / bulk delete.
- [x] **Giới hạn đầu vào**: `ArrayMaxSize(100)` cho exams/test_ids, `ArrayMaxSize(1000)` cho questions, `ArrayMaxSize(10)` cho answers; `MaxLength` rõ ràng.
- [x] **Giá trị nhạy cảm do server tính**: `total_questions`, `display_order` tiếp theo của module, quan hệ khóa ngoại cha-con do server gán.
- [x] **Ghi nhiều bước = một `$transaction`**: Mỗi endpoint import thực thi toàn bộ trong `this.prisma.$transaction(...)`.
- [x] **Lỗi dạng `{ code, message }`**: ném đúng cấu trúc chuẩn.

- Commit(s):
  - Spec commit: `71db377` docs(tasks): spec T-028 bulk import and full test deletion
  - Code commit: (sẽ commit ngay sau khi cập nhật spec)
- File đã sửa:
  - `backend/src/modules/assessment/dto/bulk-import.dto.ts`
  - `backend/src/modules/assessment/dto/index.ts`
  - `backend/src/modules/assessment/assessment-admin.controller.ts`
  - `backend/src/modules/assessment/assessment-admin.service.ts`
  - `backend/src/modules/assessment/assessment-admin.repository.ts`
  - `backend/src/modules/assessment/assessment-admin.service.spec.ts`
  - `backend/src/modules/catalog/dto/course-json-import.dto.ts`
  - `backend/src/modules/catalog/dto/index.ts`
  - `backend/src/modules/catalog/catalog-admin.controller.ts`
  - `backend/src/modules/catalog/catalog-admin.service.ts`
  - `backend/src/modules/catalog/catalog.repository.ts`
  - `backend/src/modules/catalog/catalog-admin.service.spec.ts`
  - `backend/test/assessment-bulk-import.e2e-spec.ts`
  - `backend/test/catalog-course-import.e2e-spec.ts`
  - `src/lib/api/assessment.ts`
  - `src/lib/api/assessment.test.ts`
  - `src/lib/api/catalog.ts`
  - `src/lib/api/catalog.test.ts`
  - `src/pages/admin/AdminCourseJsonImport.tsx`
  - `src/components/admin/CourseFullTestManager.tsx`
  - `src/pages/admin/AdminFullTestManager.tsx`

- Output lệnh kiểm tra:
  - `npm --prefix backend run lint`:
    ```
    > backend@0.0.1 lint
    > eslint "{src,test}/**/*.ts"
    (Exit code 0, 0 errors, 0 warnings)
    ```
  - `npm --prefix backend run build`:
    ```
    > backend@0.0.1 build
    > nest build
    (Exit code 0)
    ```
  - `npm --prefix backend run test`:
    ```
    Test Suites: 25 passed, 25 total
    Tests:       333 passed, 333 total
    Snapshots:   0 total
    Time:        2.782 s
    ```
  - `npm --prefix backend run test:e2e -- assessment-bulk-import.e2e-spec.ts catalog-course-import.e2e-spec.ts`:
    ```
    PASS test/assessment-bulk-import.e2e-spec.ts (8.71 s)
    PASS test/catalog-course-import.e2e-spec.ts
    Test Suites: 2 passed, 2 total
    Tests:       11 passed, 11 total
    Snapshots:   0 total
    Time:        13.012 s
    ```
  - `npm test -- src/lib/api/assessment.test.ts src/lib/api/catalog.test.ts`:
    ```
    ✓ src/lib/api/catalog.test.ts (30 tests) 74ms
    ✓ src/lib/api/assessment.test.ts (47 tests) 90ms
    Test Files  2 passed (2)
    Tests  77 passed (77)
    ```
  - `npx tsc --noEmit -p tsconfig.app.json 2>&1 | Select-String "error TS" | Select-String "src/lib/api|AdminFullTestManager|CourseFullTestManager|AdminCourseJsonImport"`:
    (Rỗng - không có lỗi nào)
  - `npx eslint src/lib/api/assessment.ts src/lib/api/catalog.ts`:
    (Exit code 0, không có lỗi nào)
  - `node scripts/check-ui-diff.mjs refactor/nestjs-backend`:
    ```
    check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
    ```
- Chỗ chưa chắc: Không có.

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
- Kết quả:
- Lý do:
