# T-021: Trang Từ vựng và Flashcard qua API

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-021-vocab-pages`
> **Phụ thuộc**: không · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/assessment/` (thêm **file riêng** `vocab.controller.ts`, `vocab.service.ts`, `vocab.repository.ts`, `vocab.mapper.ts` — không sửa file quiz/full test), file này. Spec này có **chuỗi dò 4 bước**: làm đúng từng bước, đừng rút gọn.

## 1. Mục tiêu
`VocabPage.tsx` và `VocabLessonPage.tsx` đọc `vocab_categories`, `vocab_quizzes`, `vocab_questions`, `lessons` thẳng Supabase. RLS cũ: cả 3 bảng vocab **đọc công khai** (`Vocab … viewable USING (true)`) → endpoint công khai, không cần token, không thêm kiểm quyền (luật 3).

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/assessment/vocab.*.ts` + `dto/vocab.dto.ts` (mới), `assessment.module.ts` (chỉ đăng ký controller/provider mới), `backend/test/assessment-vocab.e2e-spec.ts` (mới); `src/lib/api/vocab.ts` + `.test.ts` (mới); **chỉ** thân `queryFn` + `import` ở 2 trang.
**Cấm**: JSX, câu chữ, `queryKey`, logic flashcard/chấm chính tả ở client; `DictationPage.tsx`; admin vocab; module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ASM-018 | `VocabPage.tsx:24-34` | `vocab_categories.select("*").eq(course_id, cid).order(display_order)`; lỗi → throw | `listVocabCategories(cid)` |
| ASM-018 | `VocabPage.tsx:36-47` | `vocab_quizzes.select("*").eq(category_id).order(display_order)` | `listVocabQuizzes(categoryId)` |
| ASM-018 | `VocabPage.tsx:49-60` | `vocab_questions.select("*").eq(vocab_quiz_id).order(display_order)` | `listVocabWords(vocabQuizId)` |
| ASM-019 | `VocabLessonPage.tsx:42-96` | chuỗi dò 4 bước (mục 4.2) rồi lấy từ | `getLessonVocabWords(lessonId, filteredQuestionIds)` → `return data ?? []` |
| ASM-019 | `VocabLessonPage.tsx:99-106` | `lessons.select("quiz_id").eq(id, lessonId).single()` rồi `setQuizId` | `getLessonQuizId(lessonId)` → giữ `if (lesson?.quiz_id) setQuizId(...)`; `return lesson` |

Thân `queryFn` giữ nguyên cách xử lý lỗi cũ: 3 query ở `VocabPage` có `if (error) throw error`; 2 query ở `VocabLessonPage` không ném.

## 4. Đặc tả (tất cả dưới `/api/v1/assessment/vocab`, không guard)
### 4.1 Danh sách
| Route | Trả về (snake_case đủ cột như `select("*")`) |
|---|---|
| `GET /courses/:courseId/categories` | `VocabCategoryDto[]` order `display_order`, `id` |
| `GET /categories/:categoryId/quizzes` | `VocabQuizDto[]` order `display_order`, `id` |
| `GET /quizzes/:vocabQuizId/words` | `VocabWordDto[]` order `display_order`, `id` |

`VocabWordDto`: `id, vocab_quiz_id, word, phonetic, definition_en, definition_vi, example_sentence, image_url, audio_male_url, audio_female_url, wrong_answer_1, wrong_answer_2, wrong_answer_3, display_order, question_id`.

### 4.2 `GET /lessons/:ref/words?question_ids=1,2,3` — chuỗi dò **đúng thứ tự cũ** (`ref` = `lessonId` trên URL)
1. `vocab_quizzes` có `lesson_id = ref` → dùng quiz đó.
2. Không có → `vocab_quizzes` có `id = ref`.
3. Không có → bài học `lessons` có `quiz_id = ref` → `vocab_quizzes` có `lesson_id = <id bài đó>`.
4. Vẫn không có quiz → nếu `question_ids` có giá trị: trả `vocab_questions` có `question_id IN (question_ids)` order `display_order`; nếu không: `[]`.
5. Có quiz → `vocab_questions` có `vocab_quiz_id = quiz.id` (và `question_id IN (question_ids)` nếu có) order `display_order`, `id`.

**Quy tắc `.maybeSingle()`**: ở bước 1, 2, 3 (cả 2 lần tra trong bước 3), nếu có **từ 2 dòng khớp trở lên** thì coi như **không tìm thấy** và đi tiếp bước sau (PostgREST cũ trả lỗi → `data = null`). Viết unit test riêng cho quy tắc này.
`question_ids`: danh sách số nguyên cách nhau bởi dấu phẩy, tối đa 500; sai định dạng → 400 `VALIDATION_FAILED`; bỏ trống = không lọc.

### 4.3 `GET /lessons/:lessonId/quiz-id` → `{ lesson: { quiz_id: number | null } | null }`
Bài học không tồn tại → `{ lesson: null }` (cũ `.single()` lỗi → `data = null`). Đọc bảng `lessons` của Learning **chỉ để đọc** trong `VocabRepository` (ghi chú lý do), giống bước 3 ở 4.2.

## 5. Tiêu chí nghiệm thu
- [x] E2E seed đủ 4 nhánh của 4.2: (1) quiz gắn `lesson_id`; (2) không có (1) nhưng có quiz `id = ref`; (3) chỉ khớp qua `lessons.quiz_id`; (4) không quiz + có `question_ids` → lọc theo `question_id`; (4b) không quiz, không `question_ids` → `[]`; có quiz + `question_ids` → lọc đúng
- [x] Unit: 2 quiz cùng `lesson_id = ref` → bỏ qua bước 1, sang bước 2
- [x] E2E: 3 route danh sách đúng thứ tự, khóa/danh mục khác không lẫn; `quiz-id` bài không tồn tại → `{ lesson: null }`; `question_ids=abc` → 400; không cần token
- [x] Adapter test; `grep -n "supabase" src/pages/VocabPage.tsx src/pages/VocabLessonPage.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n "supabase" src/pages/VocabPage.tsx src/pages/VocabLessonPage.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

### 7.1. Docker Postgres
```
 Container l-english-academy-postgres-1  Running
```

### 7.2. Backend lint, typecheck, test, test:e2e, build
```
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/assessment/vocab.service.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 21 passed, 21 total
Tests:       214 passed, 214 total
Snapshots:   0 total
Time:        4.502 s, estimated 5 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/health.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/auth.e2e-spec.ts (6.287 s)
PASS test/learning-access.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts

Test Suites: 17 passed, 17 total
Tests:       257 passed, 257 total
Snapshots:   0 total
Time:        62.479 s
Ran all test suites.

> backend@0.0.1 build
> nest build
```

### 7.3. Frontend test, build, check-ui-diff
```
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 71ms
 ✓ src/lib/api/client.test.ts (4 tests) 270ms
 ✓ src/lib/api/vocab.test.ts (8 tests) 352ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 267ms
 ✓ src/lib/api/admin.test.ts (7 tests) 239ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 538ms
 ✓ src/lib/api/payments.test.ts (8 tests) 603ms
 ✓ src/test/part2Audio.test.ts (3 tests) 711ms
 ✓ src/lib/api/auth.test.ts (9 tests) 559ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 837ms
 ✓ src/lib/api/learning.test.ts (45 tests) 760ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 69ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 25ms

 Test Files  13 passed (13)
      Tests  151 passed (151)
   Start at  01:29:12
   Duration  47.24s (transform 21.39s, setup 45.57s, collect 65.83s, tests 5.30s, environment 71.53s, prepare 6.57s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2738 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
...
✓ built in 1m 26s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```

### 7.4. Grep supabase in vocab pages
```
grep -n "supabase" src/pages/VocabPage.tsx src/pages/VocabLessonPage.tsx
(không có kết quả — mã thoát 1 — hoàn toàn sạch supabase)
```

### 7.5. Git log and git diff stat
```
4799d88 feat(assessment): add vocab and flashcard API and migrate page callers
bbd9327 docs(tasks): queue T-021 vocab pages
352c5f7 docs(parity): tick rows already done in code, mark security fixes by status

 backend/src/modules/assessment/assessment.module.ts |   9 +-
 backend/src/modules/assessment/dto/index.ts         |   1 +
 backend/src/modules/assessment/dto/vocab.dto.ts     | 113 +++++
 backend/src/modules/assessment/vocab.controller.ts  |  80 ++++
 backend/src/modules/assessment/vocab.mapper.ts      |  63 +++
 backend/src/modules/assessment/vocab.repository.ts  |  87 ++++
 backend/src/modules/assessment/vocab.service.spec.ts| 276 ++++++++++++
 backend/src/modules/assessment/vocab.service.ts     | 140 ++++++
 backend/test/assessment-vocab.e2e-spec.ts           | 475 ++++++++++++++++++++
 src/lib/api/vocab.test.ts                           | 135 ++++++
 src/lib/api/vocab.ts                                | 107 +++++
 src/pages/VocabLessonPage.tsx                       |  63 +--
 src/pages/VocabPage.tsx                             |  20 +-
 13 files changed, 1498 insertions(+), 71 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
