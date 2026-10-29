# T-025: Luyện nghe chép chính tả (Dictation) qua API

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-025-dictation` (tách từ `refactor/nestjs-backend`)
> **Phụ thuộc**: Không (đã có T-022, T-023, T-024) · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md` mục T-025, `docs/OPEN_QUESTIONS.md` #26, file này. Gặp gì không rõ: **dừng và ghi vào mục "Câu hỏi"**, không tự đoán.

## 1. Mục tiêu
`src/pages/DictationPage.tsx` (`/dictation/:quizId`) đọc/ghi trực tiếp các bảng `quizzes`, `questions`, `answers`, `lessons`, `vocab_questions`, `user_quiz_results`, `user_answers` qua Supabase. Chuyển toàn bộ các truy vấn này sang backend NestJS. Client giữ thuật toán so khớp chữ gõ và tô chữ sai bằng `transcript`/`dictation_keywords`, điểm số và trạng thái hoàn thành do server tính toán và lưu trong transaction (quyết định #26a).

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/assessment/dictation.controller.ts` (mới): Controller cho nhóm route dictation
- `backend/src/modules/assessment/dictation.service.ts` (mới): Nghiệp vụ dictation, kiểm tra quyền `canTakeQuiz`, tính điểm trong transaction
- `backend/src/modules/assessment/dictation.repository.ts` (mới): Truy vấn Prisma các bảng liên quan dictation
- `backend/src/modules/assessment/dictation.mapper.ts` (mới): Mapper chuyển Prisma model sang DTO
- `backend/src/modules/assessment/dto/dictation.dto.ts` (mới): Các DTO cho dictation
- `backend/src/modules/assessment/assessment.module.ts`: Đăng ký controller, service, repository dictation
- `backend/src/modules/assessment/dictation.service.spec.ts` (mới): Unit test nghiệp vụ dictation
- `backend/test/dictation.e2e-spec.ts` (mới): Test e2e phân quyền và các kịch bản dictation
- `src/lib/api/assessment.ts`: Thêm các hàm gọi API dictation
- `src/lib/api/assessment.test.ts`: Unit test cho client API dictation
- `src/pages/DictationPage.tsx`: Thay các khối gọi Supabase bằng API client (chỉ sửa thân `queryFn`/`mutationFn`/`handleSubmitQuiz` và import)

**Cấm sửa**
- JSX, `className`, CSS, câu chữ hiển thị, `queryKey`, layout (AGENTS.md luật 1)
- Không đổi cơ chế `localStorage` (`dictation_done_*`), âm thanh `playSound`, thuật toán tính LCS / keyword stats
- Các file ngoài phạm vi trên

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase | Kết quả component mong đợi | Cách xử lý lỗi cũ |
|---|---|---|---|
| `DictationPage.tsx:897-935` | `quizzes.select("*").eq("id", quizId).single()` và `questions.select("id, question_text, audio_url, translation, explanation, dictation_keywords, display_order, passage_text, transcript, image_url, answers(...)").eq("quiz_id", quizId).order("display_order")` | `{ quiz, questions: sortedQuestions }` kèm answers sắp theo `display_order` | `if (qErr) throw qErr; if (questErr) throw questErr;` |
| `DictationPage.tsx:942-948` | `lessons.select("id").eq("quiz_id", quizId).maybeSingle()` | `{ id: number } \| null` | Bỏ qua lỗi, trả `data` |
| `DictationPage.tsx:961-970` | `vocab_questions.select("*").in("question_id", questionIds)` | Danh sách từ vựng `VocabWordDto[]` | `console.warn(error); return [];` |
| `DictationPage.tsx:980-1005` | `user_quiz_results.select("*").eq("quiz_id", quizId).eq("user_id", user.id).order("created_at", desc).limit(1).maybeSingle()`; nếu chưa có: `insert({ quiz_id, user_id, score: 0, total_questions, correct_answers: 0 }).select().single()` | Bản ghi `user_quiz_results` mới nhất | `if (findErr) throw findErr; if (createErr) throw createErr;` |
| `DictationPage.tsx:1018-1037` | `user_quiz_results.select("id").eq("quiz_id", quizId).eq("user_id", user.id)`; rồi `user_answers.select("id, question_id, is_correct, result_id").in("result_id", resultIds).eq("is_correct", true)` | Danh sách `{ id, question_id, is_correct, result_id }` | `if (error) throw error;` |
| `DictationPage.tsx:1146-1205` (`completeQuestionMutation`) | Tìm/tạo `user_quiz_results`; upsert `user_answers` với `is_correct: true`; update `user_quiz_results` với `correct_answers = score = allDoneCount`, `total_questions = questions.length` | Ghi DB, cập nhật lạc quan cache | `console.warn("Error persisting answer:", err)` |
| `DictationPage.tsx:1236-1250` (`resetAnswerMutation`) | Tìm mọi `resultIds` của quiz; `user_answers.update({ is_correct: false }).in("result_id", resultIds).eq("question_id", questionId)` | Cập nhật `is_correct: false` | `toast({ title: "Lỗi làm lại", description: err.message, variant: "destructive" })` |
| `DictationPage.tsx:1269-1286` (`resetAllMutation`) | Tìm mọi `resultIds` của quiz; `user_answers.update({ is_correct: false }).in("result_id", resultIds)`; `user_quiz_results.update({ correct_answers: 0, score: 0 }).in("id", resultIds)` | Reset toàn bộ câu và điểm | `toast({ title: "Lỗi reset", description: err.message, variant: "destructive" })` |
| `DictationPage.tsx:1596-1620` (`handleSubmitQuiz`) | Duyệt qua các câu hoàn thành trong phiên: upsert `user_answers.is_correct = true`; update `user_quiz_results` với `correct_answers = totalDone, score = totalDone` | Đồng bộ toàn bộ câu làm được lên server | `console.warn("Could not sync all answers to DB:", e)` |

**Policy RLS tương ứng** (phải có test):
1. `quizzes`: `SELECT USING (true)` (công khai, nhưng kiểm quyền làm bài qua `LearningService.canTakeQuiz`)
2. `questions`: `SELECT USING (true)`
3. `answers`: `SELECT USING (true)`
4. `lessons`: `SELECT USING (true)`
5. `vocab_questions`: `SELECT USING (true)`
6. `user_quiz_results`:
   - "Users view own results": `auth.uid() = user_id`
   - "Users insert own results": `auth.uid() = user_id`
   - "Admins view all results": `has_role(auth.uid(), 'admin')`
7. `user_answers`:
   - "Users view own answers": `EXISTS (SELECT 1 FROM user_quiz_results r WHERE r.id = result_id AND r.user_id = auth.uid())`
   - "Users insert own answers": `EXISTS (SELECT 1 FROM user_quiz_results r WHERE r.id = result_id AND r.user_id = auth.uid())`
   - "Admins view all answers": `has_role(auth.uid(), 'admin')`

## 4. Đặc tả
Tất cả endpoint đặt dưới `/api/v1/assessment/dictation`:

### 4.1 `GET /quizzes/:quizId`
- **Mục đích**: Lấy thông tin quiz và danh sách câu hỏi kèm transcript, translation, dictation_keywords, passage_text, image_url và answers (đầy đủ is_correct, display_order) để client render giao diện và so khớp chính tả.
- **Quyền**: `OptionalJwtAuthGuard`. Kiểm tra quyền bằng `LearningService.canTakeQuiz(quizId, user)`.
  - Không có quyền → 403 `QUIZ_LOCKED`.
  - Quiz không tồn tại → 404 `QUIZ_NOT_FOUND`.
- **Trả về**: `DictationQuizDetailDto`:
  ```json
  {
    "quiz": { "id": 1, "title": "Part 1 Quiz", "audio_url": "...", ... },
    "questions": [
      {
        "id": 10,
        "question_text": "...",
        "audio_url": "...",
        "translation": "...",
        "explanation": "...",
        "dictation_keywords": "...",
        "display_order": 0,
        "passage_text": "...",
        "transcript": "...",
        "image_url": "...",
        "answers": [
          { "id": 100, "answer_text": "...", "is_correct": true, "display_order": 0 }
        ]
      }
    ]
  }
  ```

### 4.2 `GET /quizzes/:quizId/lesson`
- **Mục đích**: Tìm bài học (`lessons`) gắn với quiz này (`quiz_id = quizId`).
- **Quyền**: Công khai.
- **Trả về**: `{ "id": 123 }` hoặc `null` nếu không có.

### 4.3 `GET /quizzes/:quizId/vocab`
- **Mục đích**: Lấy các từ vựng gắn với các câu hỏi trong quiz (`vocab_questions.question_id IN (...)`).
- **Quyền**: Công khai.
- **Trả về**: `VocabWordDto[]` (mảng từ vựng, rỗng nếu không có).

### 4.4 `GET /quizzes/:quizId/result`
- **Mục đích**: Lấy hoặc tự động khởi tạo kết quả `user_quiz_results` mới nhất của user cho quiz này.
- **Quyền**: `JwtAuthGuard`.
- **Logic**: Tìm kết quả mới nhất của `(user.id, quizId)` (sắp `created_at desc`). Nếu chưa có: tạo mới với `score: 0, correct_answers: 0, total_questions: count(questions)`.
- **Trả về**: `UserQuizResultDto`.

### 4.5 `GET /quizzes/:quizId/answers`
- **Mục đích**: Lấy danh sách các câu hỏi đã hoàn thành (`is_correct: true`) của user cho quiz này qua mọi lần làm.
- **Quyền**: `JwtAuthGuard`.
- **Logic**: Lấy mọi `result_id` của user cho quiz này; lấy các dòng `user_answers` có `result_id IN (resultIds)` và `is_correct = true`.
- **Trả về**: `DictationUserAnswerDto[]` (`[{ "id": 1, "question_id": 10, "is_correct": true, "result_id": 5 }]`).

### 4.6 `PUT /quizzes/:quizId/questions/:questionId/done`
- **Mục đích**: Đánh dấu hoàn thành một câu hỏi cho user hiện tại. Điểm số do server đếm và cập nhật.
- **Quyền**: `JwtAuthGuard`.
- **Logic** (chạy trong `$transaction`):
  1. Tìm hoặc tạo `user_quiz_results` mới nhất cho `(user.id, quizId)`.
  2. Upsert `user_answers` cho `(result_id, question_id)` với `is_correct = true`.
  3. Đếm số câu hỏi duy nhất của quiz mà user đã hoàn thành (`is_correct = true`).
  4. Cập nhật `user_quiz_results`: `score = allDoneCount, correct_answers = allDoneCount, total_questions = count(questions)`.
- **Trả về**: `DictationProgressResponseDto` (`{ "score": 3, "correct_answers": 3, "total_questions": 10 }`).

### 4.7 `DELETE /quizzes/:quizId/questions/:questionId/done`
- **Mục đích**: Hủy đánh dấu hoàn thành một câu hỏi (làm lại câu).
- **Quyền**: `JwtAuthGuard`.
- **Logic** (chạy trong `$transaction`):
  1. Lấy mọi `result_id` của user cho quiz này.
  2. Update `user_answers` set `is_correct = false` where `result_id IN (resultIds)` and `question_id = questionId`.
  3. Cập nhật lại `score` và `correct_answers` cho kết quả mới nhất.
- **Trả về**: `DictationProgressResponseDto`.

### 4.8 `POST /quizzes/:quizId/sync`
- **Mục đích**: Đồng bộ danh sách các câu đã hoàn thành trong session khi nộp bài (`handleSubmitQuiz`).
- **Quyền**: `JwtAuthGuard`.
- **Body**: `{ "question_ids": [10, 11, 12] }`.
- **Logic** (chạy trong `$transaction`):
  1. Tìm hoặc tạo `user_quiz_results` mới nhất.
  2. Với mỗi `question_id` trong danh sách: upsert `user_answers` với `is_correct = true`.
  3. Đếm lại tổng số câu hoàn thành của quiz và update `user_quiz_results`.
- **Trả về**: `DictationProgressResponseDto`.

### 4.9 `POST /quizzes/:quizId/reset`
- **Mục đích**: Reset toàn bộ tiến trình luyện tập của user cho quiz này.
- **Quyền**: `JwtAuthGuard`.
- **Logic** (chạy trong `$transaction`):
  1. Lấy mọi `result_id` của user cho quiz này.
  2. Set `is_correct = false` cho mọi `user_answers` thuộc các `resultIds`.
  3. Set `score = 0, correct_answers = 0` cho mọi `user_quiz_results` thuộc các `resultIds`.
- **Trả về**: `DictationProgressResponseDto` (`{ "score": 0, "correct_answers": 0, "total_questions": N }`).

## 5. Tiêu chí nghiệm thu
- [x] E2E phân quyền cho mọi route dictation: 401 khi chưa đăng nhập (đối với các route yêu cầu JWT), 403 khi quiz bị khóa (`QUIZ_LOCKED`), 2xx khi hợp lệ
- [x] E2E luồng làm bài dictation:
  - Lấy đề dictation trả đủ `transcript`, `dictation_keywords`, `passage_text`, `translation`, `answers` (có `is_correct`)
  - Đánh dấu hoàn thành câu: `user_answers.is_correct = true`, `score` và `correct_answers` tăng tương ứng
  - Hủy đánh dấu câu: `user_answers.is_correct = false`, `score` giảm
  - Đồng bộ danh sách câu khi nộp: toàn bộ câu được đánh dấu và tính điểm chuẩn xác
  - Reset toàn bộ: mọi kết quả và đáp án về 0/false
- [x] Unit tests service & adapter test đầy đủ
- [x] `grep -n "supabase" src/pages/DictationPage.tsx` **rỗng** (chỉ còn import nếu có hoặc hoàn toàn không còn)
- [x] Không đổi bất kỳ thẻ JSX, className, bố cục hay câu chữ giao diện nào; `check-ui-diff` OK
- [x] Backend lint, typecheck, unit test, e2e test, build pass 100%
- [x] Frontend vitest test, build pass 100%

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n "supabase" src/pages/DictationPage.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
- Commit(s):
  - `5329aef docs(tasks): spec T-025 dictation`
  - `7015232 feat(assessment): dictation APIs and frontend integration (T-025)`
  - `21668b6 docs(assessment): update verification results for T-025`
  - `ec72fdf fix(assessment): validate question_id, enforce quiz access, and standardize errors (T-025 review)`
  - `c10776b style(assessment): format assertQuizAccessible`
- File đã sửa:
  - `backend/src/modules/assessment/assessment.module.ts`
  - `backend/src/modules/assessment/dictation.controller.ts`
  - `backend/src/modules/assessment/dictation.mapper.ts`
  - `backend/src/modules/assessment/dictation.repository.ts`
  - `backend/src/modules/assessment/dictation.service.spec.ts`
  - `backend/src/modules/assessment/dictation.service.ts`
  - `backend/src/modules/assessment/dto/dictation.dto.ts`
  - `backend/src/modules/assessment/dto/index.ts`
  - `backend/test/dictation.e2e-spec.ts`
  - `docs/tasks/T-025-dictation.md`
  - `src/lib/api/assessment.test.ts`
  - `src/lib/api/assessment.ts`
  - `src/pages/DictationPage.tsx`
- Output lệnh kiểm tra:
```
$ docker compose up -d postgres
 Container l-english-academy-postgres-1  Running

$ npm --prefix backend run lint && npm --prefix backend run typecheck
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

$ npm --prefix backend test
> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/assessment/vocab.service.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/assessment/assessment-admin.service.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts
PASS src/modules/assessment/dictation.service.spec.ts

Test Suites: 24 passed, 24 total
Tests:       305 passed, 305 total
Snapshots:   0 total
Time:        2.802 s
Ran all test suites.

$ npm --prefix backend run test:e2e
> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (19.388 s)
PASS test/dictation.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts (5.274 s)
PASS test/assessment-admin.e2e-spec.ts
PASS test/assessment-admin-fulltest.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 21 passed, 21 total
Tests:       342 passed, 342 total
Snapshots:   0 total
Time:        100.702 s
Ran all test suites.

$ npm --prefix backend run build
> backend@0.0.1 build
> nest build

$ npm test
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 ✓ src/test/example.test.ts (1 test) 17ms
 ✓ src/lib/api/client.test.ts (4 tests) 67ms
 ✓ src/lib/api/vocab.test.ts (8 tests) 297ms
 ✓ src/lib/api/admin.test.ts (16 tests) 266ms
 ✓ src/lib/api/payments.test.ts (8 tests) 283ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 182ms
 ✓ src/lib/api/assessment.test.ts (43 tests) 416ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 362ms
 ✓ src/lib/api/auth.test.ts (12 tests) 242ms
 ✓ src/test/part2Audio.test.ts (3 tests) 478ms
 ✓ src/lib/api/learning.test.ts (47 tests) 265ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 41ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 30ms

 Test Files  13 passed (13)
      Tests  195 passed (195)
   Duration  11.73s

$ npm run build
> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2738 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 32.21s

$ node scripts/check-ui-diff.mjs refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ git grep -n "supabase" src/pages/DictationPage.tsx
(Exit code 1 - No matches found)

$ git log --oneline -5 && git diff --stat refactor/nestjs-backend
c10776b style(assessment): format assertQuizAccessible
ec72fdf fix(assessment): validate question_id, enforce quiz access, and standardize errors (T-025 review)
0364278 Merge remote-tracking branch 'origin/refactor/nestjs-backend' into task/T-025-dictation
ee72d4b docs: return T-025 for score and access fixes
21668b6 docs(assessment): update verification results for T-025
 .../src/modules/assessment/assessment.module.ts    |   8 +
 .../src/modules/assessment/dictation.controller.ts | 193 ++++++++
 backend/src/modules/assessment/dictation.mapper.ts |  31 ++
 .../src/modules/assessment/dictation.repository.ts | 198 +++++++++
 .../modules/assessment/dictation.service.spec.ts   | 387 ++++++++++++++++
 .../src/modules/assessment/dictation.service.ts    | 245 +++++++++++
 .../src/modules/assessment/dto/dictation.dto.ts    |  51 +++
 backend/src/modules/assessment/dto/index.ts        |   1 +
 backend/test/dictation.e2e-spec.ts                 | 486 +++++++++++++++++++++
 docs/tasks/T-025-dictation.md                      | 337 ++++++++++++++
 src/lib/api/assessment.test.ts                     |  98 +++++
 src/lib/api/assessment.ts                          | 124 ++++++
 src/pages/DictationPage.tsx                        | 237 ++--------
 13 files changed, 2193 insertions(+), 203 deletions(-)
```
- Chỗ chưa chắc: Không có

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)

