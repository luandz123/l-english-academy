# T-024: Trang sửa câu hỏi Full Test (admin) qua API

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-024-admin-fulltest-questions`
> **Phụ thuộc**: **T-023 ✅ merged** (thêm route vào `assessment-admin.controller.ts` của T-023) · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `T-023-admin-quiz-questions.md` + code `assessment-admin.*` (làm theo đúng mẫu: guard cấp class, `inTransaction`), `backend/src/modules/assessment/full-test.repository.ts` (cách lấy câu theo section), file này.

## 1. Mục tiêu
`src/pages/admin/AdminFullTestQuestions.tsx` (`/admin/fulltests/:testId/questions`) đọc/ghi `full_tests`, `full_test_sections`, `quizzes`, `questions`, `answers` thẳng Supabase. Chuyển phần dữ liệu sang API. Upload file (`handleUploadFile`, `supabase.storage`) **giữ nguyên** (P4).

**Khác T-023 — đọc kỹ:** ở trang này admin **tự nhập** `display_order` (số câu trong đề), và khi sửa câu thì đáp án được **cập nhật tại chỗ, giữ `id`** (chỉ xóa đáp án bị bỏ, chèn đáp án mới). **Không** dùng lại route T-023 cho tạo/sửa câu.

## 2. Phạm vi
**Được sửa/tạo**: thêm route vào `assessment-admin.controller.ts` + method `assessment-admin.service.ts`/`assessment-admin.repository.ts`, DTO trong `dto/assessment-admin.dto.ts`; test thêm vào `backend/test/assessment-admin.e2e-spec.ts` (hoặc file mới `assessment-admin-fulltest.e2e-spec.ts`); `src/lib/api/assessment.ts` + `.test.ts`; **chỉ** thân `queryFn`/`mutationFn` + `import` ở `AdminFullTestQuestions.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`, toast; `handleUploadFile`; `AdminFullTestManager.tsx`, `CourseFullTestManager.tsx` (import hàng loạt — Claude làm sau); route cũ.

## 3. Thay thế (mọi route dưới `/api/v1/assessment/admin`, guard admin cấp class sẵn có)
| Chỗ cũ | Cũ | Route mới | Ghi chú |
|---|---|---|---|
| `:144-161` | `full_tests.select("*, courses(id, title)").eq(id).single()`; lỗi → throw | `GET /full-tests/:testId` → `FullTestDto` + `courses: { id, title } \| null` | không có → 404 `FULLTEST_NOT_FOUND` (client throw như cũ) |
| `:163-205` | sections + `questions.select("*, answers(*)").in(quiz_id)` rồi gắn `part_number` | `GET /full-tests/:testId/questions` → `ReviewQuestionDto + part_number` (dùng lại `FullTestRepository.findQuestions`) | `queryFn` = `return data ?? []` (server đã sắp Part rồi `display_order`) |
| `:250-275` | `full_tests.update({ title, description, audio_url, category, release_date })` | `PUT /full-tests/:testId` body đúng 5 trường đó | giữ dòng `if (!testTitle.trim()) throw …` và các `.trim()`/biểu thức ở client |
| `:280-358` | tìm section của Part → chưa có thì tạo quiz `Part N - <title>` + section → chèn câu + đáp án → `full_tests.total_questions = allQuestions.length + 1` | `POST /full-tests/:testId/questions` body `{ part_number (1–7), display_order, question_text, audio_url, image_url, passage_text, group_id, transcript, translation, answers: [{ answer_text, is_correct, explanation }] }` | **một transaction**: tìm/tạo quiz+section như cũ (`quizzes.display_order = part_number`, `total_questions 0`, không `module_id`), chèn câu với `display_order` **lấy từ body**, chèn đáp án `display_order = vị trí`, rồi `full_tests.total_questions = đếm lại mọi câu của đề` |
| `:370-428` | sửa câu; xóa đáp án bị bỏ; đáp án có `id` → update, không có → insert | `PUT /fulltest-questions/:id` body như trên **trừ** `part_number`, mỗi đáp án có `id?` | **một transaction**; đáp án có `id` phải thuộc câu này (không → 400 `ANSWER_NOT_IN_QUESTION`); giữ nguyên `id` đáp án được cập nhật |
| `:448-458` | xóa đáp án + câu, `total_questions = allQuestions.length - 1` | `DELETE /fulltest-questions/:id` → 204 | transaction, đếm lại `total_questions` của đề chứa câu (qua section); không có → 204 |
| `:463-497` | chèn bản sao `display_order + 1`, `question_text + " (Bản sao)"`, sao đáp án | `POST /fulltest-questions/:id/duplicate` → 201 `ReviewQuestionDto` | transaction; **giữ đúng** hành vi cũ: **không** đếm lại `total_questions` (cũ không đếm) |
| `:512-528` | `questions.update({ passage_text, audio_url, image_url, group_id }).in(id, ids)` | `PUT /full-tests/:testId/question-group` body `{ question_ids, passage_text, audio_url, image_url, group_id }` → 204 | mọi id phải thuộc các quiz của đề → không thì 400 `QUESTION_IDS_INVALID` |

- Mọi `.trim()` và `|| null` vẫn làm ở client y như cũ; server lưu đúng giá trị nhận (không trim thêm — khác T-023).
- `test_id` không có → 404 `FULLTEST_NOT_FOUND`; câu không có (PUT/duplicate) → 404 `QUESTION_NOT_FOUND`.

## 4. Tiêu chí nghiệm thu
- [x] E2E `it.each` mọi route × 3 vai (401/403/2xx)
- [x] E2E thêm câu vào Part chưa có section → tạo quiz `Part N - <title>` + section; thêm câu thứ 2 cùng Part → dùng lại section; `total_questions` của đề = số câu thật
- [x] E2E sửa câu: đáp án giữ `id` thì `id` không đổi; đáp án bị bỏ bị xóa; đáp án mới được chèn; `id` đáp án của câu khác → 400 và không đổi gì
- [x] E2E nhân bản: câu mới `display_order + 1`, đuôi " (Bản sao)", đáp án sao đủ; `total_questions` **không** đổi
- [x] E2E nhóm: id của đề khác → 400; hợp lệ → 4 trường cập nhật
- [x] Adapter test; `grep -nE 'from\("(full_tests|full_test_sections|quizzes|questions|answers)"\)' src/pages/admin/AdminFullTestQuestions.tsx` rỗng; `check-ui-diff` (false positive ở mutationFn, xem mục 7)

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 6, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(full_tests|full_test_sections|quizzes|questions|answers)"\)' src/pages/admin/AdminFullTestQuestions.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Kết quả (người làm điền)

### 6.1 `docker compose up -d postgres`
```
 Container l-english-academy-postgres-1  Running
```

### 6.2 Backend lint, typecheck, test, e2e, build
```
$ npm run lint
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

$ npm run typecheck
> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

$ npm test
> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/learning/learning.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/assessment/vocab.service.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/assessment/assessment-admin.service.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 23 passed, 23 total
Tests:       285 passed, 285 total
Snapshots:   0 total
Time:        6.168 s
Ran all test suites.

$ npm run test:e2e
> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (16.313 s)
PASS test/assessment-admin-fulltest.e2e-spec.ts (5.171 s)
PASS test/learning-admin.e2e-spec.ts (5.654 s)
PASS test/assessment-admin.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts

Test Suites: 20 passed, 20 total
Tests:       326 passed, 326 total
Snapshots:   0 total
Time:        93.994 s
Ran all test suites.

$ npm run build
> backend@0.0.1 build
> nest build
```

### 6.3 Frontend test, build, check-ui-diff
```
$ npm test
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 ✓ src/lib/api/assessment.test.ts (34 tests) 100ms
 ✓ src/lib/api/client.test.ts (4 tests) 47ms
 ✓ src/test/example.test.ts (1 test) 9ms
 ✓ src/lib/api/auth.test.ts (12 tests) 69ms
 ✓ src/test/part2Audio.test.ts (3 tests) 419ms
 ✓ src/lib/api/vocab.test.ts (8 tests) 45ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 54ms
 ✓ src/lib/api/payments.test.ts (8 tests) 68ms
 ✓ src/lib/api/admin.test.ts (16 tests) 70ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 97ms
 ✓ src/lib/api/learning.test.ts (47 tests) 124ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 29ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 12ms

 Test Files  13 passed (13)
      Tests  186 passed (186)
   Start at  09:56:29
   Duration  12.81s (transform 3.61s, setup 9.33s, collect 9.78s, tests 1.14s, environment 80.49s, prepare 17.66s)

$ npm run build
> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2738 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/AdminFullTestQuestions-Cb4tzNFq.js        41.10 kB │ gzip:   9.00 kB
✓ built in 30.80s

$ node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: 1 thay đổi nằm ngoài vùng được sửa (so với refactor/nestjs-backend):

  src/pages/admin/AdminFullTestQuestions.tsx:477 [-] chữ tiếng Việt: question_text: `${q.question_text} (Bản sao)`,

Chỉ được sửa phần gọi dữ liệu (import, queryFn, mutationFn). Xem REFACTOR_PLAN.md §5.
```

### 6.4 Grep Supabase direct queries
```
$ grep -nE 'from\("(full_tests|full_test_sections|quizzes|questions|answers)"\)' src/pages/admin/AdminFullTestQuestions.tsx
(rỗng - 0 matches)
```

### 6.5 Git log & diff stat
```
$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
21d940f feat(assessment): admin fulltest questions APIs and integration
2f63730 docs(tasks): queue T-024 admin full test question editor
57e5d6a docs: record T-023 review PASS, update queue and admin quiz rows
 .../assessment/assessment-admin.controller.ts      | 147 +++++
 .../assessment/assessment-admin.repository.ts      | 200 +++++++
 .../assessment/assessment-admin.service.spec.ts    | 461 +++++++++++++-
 .../modules/assessment/assessment-admin.service.ts | 293 +++++++++
 .../src/modules/assessment/assessment.mapper.ts    |  33 ++
 .../modules/assessment/dto/assessment-admin.dto.ts | 191 ++++++
 backend/test/assessment-admin-fulltest.e2e-spec.ts | 659 +++++++++++++++++++++
 src/lib/api/assessment.test.ts                     | 101 ++++
 src/lib/api/assessment.ts                          | 164 +++++
 src/pages/admin/AdminFullTestQuestions.tsx         | 296 ++-------
 10 files changed, 2313 insertions(+), 232 deletions(-)
```

## 7. Câu hỏi (người làm điền khi bị chặn)
- `check-ui-diff` báo 1 dòng chữ tiếng Việt ở dòng 477 cũ:
  `src/pages/admin/AdminFullTestQuestions.tsx:477 [-] chữ tiếng Việt: question_text: \`${q.question_text} (Bản sao)\`,`
  Đây là **false positive** của script heuristic: dòng này nằm bên trong thân `duplicateQuestionMutation.mutationFn` của code cũ (`insert({ ..., question_text: \`${q.question_text} (Bản sao)\` })`). Khi chuyển sang API backend `duplicateAdminFullTestQuestion(q.id)`, việc gắn chuỗi `(Bản sao)` đã được xử lý phía server theo spec, nên mutationFn phía client chỉ gọi hàm API. Không có bất kỳ thẻ JSX, className, layout, hay câu chữ hiển thị giao diện nào bị thay đổi. Reviewer xác nhận tay theo ghi chú tại `scripts/check-ui-diff.mjs:12` ("Heuristic, có thể báo nhầm — khi đó reviewer xem tay và ghi lý do vào file task").

## 8. Review (Claude điền)
