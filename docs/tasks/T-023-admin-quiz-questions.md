# T-023: Admin quản lý quiz, câu hỏi, đáp án qua API (backend + frontend)

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-023-admin-quiz-questions`
> **Phụ thuộc**: **T-022 ✅ merged** · **Ước lượng**: 3,5 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` (mẫu admin + transaction), code `backend/src/modules/assessment/` (thêm **file riêng** `assessment-admin.controller.ts`, `assessment-admin.service.ts`, `assessment-admin.repository.ts`; dùng lại `AssessmentMapper.toReviewQuestionDto`, `toQuizDto`), file này.

## 1. Mục tiêu
`QuizManager.tsx` (câu hỏi/đáp án) và phần quiz độc lập trong `LessonManager.tsx` ghi thẳng Supabase. Chuyển phần **dữ liệu** sang API. Upload file (`supabase.storage`, `autoImportMedia`) **giữ nguyên** (P4 Media): nó chỉ trả về một URL chuỗi, URL đó được lưu qua API như mọi trường khác.

## 2. Phạm vi
**Được sửa/tạo**: các file mới ở mục trên + `dto/assessment-admin.dto.ts`, đăng ký trong `assessment.module.ts`; `backend/test/assessment-admin.e2e-spec.ts`; `src/lib/api/assessment.ts` + `.test.ts` (thêm hàm); **chỉ** thân `queryFn`/`mutationFn`, vòng lặp/biểu thức gọi dữ liệu và `import` ở `QuizManager.tsx`, `LessonManager.tsx`.
**Giữ Supabase (ngoài phạm vi)**: `supabase.storage…` và `autoImportMedia` (`QuizManager.tsx:205-240, 305-325, 540-560`), `admin-materials-all` (`:156`), `lesson-id-from-quiz` (`:531`), phần từ vựng (`:610-640`).
**Cấm**: JSX, câu chữ, `queryKey`, `onSuccess`/`onError`, `setQueryData`; route cũ; module khác (ngoại lệ ở 4.3).

## 3. Thay thế
| PARITY | Chỗ cũ | Thay bằng |
|---|---|---|
| ADM-011 | `QuizManager.tsx:129-135` `questions.select("*, answers(*)")` | `listAdminQuizQuestions(quizId)` → giữ đoạn sort `answers` |
| ADM-011 | `QuizManager.tsx:138-144` `quizzes.select("*").single()` | `getQuiz(quizId)` (đã có) |
| ADM-011 | `QuizManager.tsx:147-152` `courses.select("*").single()` | `getCourse(courseId)` (`catalog.ts`, đã có) |
| ADM-011 | `QuizManager.tsx:296-299` vòng lặp `display_order` | `await reorderQuizQuestions(quizId, reordered.map((q: any) => q.id))` (giữ `setQueryData` lạc quan) |
| ADM-011 | `QuizManager.tsx:398-442` sửa/tạo câu + xóa/chèn đáp án + đếm `total_questions` | `updateQuizQuestion(editingQ.id, body)` / `createQuizQuestion(quizId, body)`; **giữ** 2 dòng `autoImportMedia` phía trên; bỏ vòng tính `display_order`, bỏ lệnh đếm |
| ADM-011 | `QuizManager.tsx:458-462` xóa 1 câu | `deleteQuizQuestion(id)` |
| ADM-011 | `QuizManager.tsx:475-479` xóa nhiều câu | `deleteQuizQuestions(quizId, ids)` |
| ADM-011 | `QuizManager.tsx:497-501` lưu audio quiz | `const { error } = await patchQuiz(quizId, { audio_url: wizardAudioUrl \|\| null }); if (error) throw error;` |
| ADM-011 | `QuizManager.tsx:516-520` vòng lặp gán ảnh | `await setQuizQuestionImages(quizId, questions.map((q: any) => ({ question_id: q.id, image_url: wizardImageAssignments[q.id] \|\| null })))` |
| ADM-010 | `LessonManager.tsx:296-313` lưu quiz độc lập | `updateModuleQuiz(editingQuiz.id, body)` / `createModuleQuiz(moduleId, body)`, `body = { title, total_questions, time_limit_seconds }` (giữ biểu thức tính như cũ) — **bỏ** `module_id`, `display_order` |
| ADM-010 | `LessonManager.tsx:323-326` xóa quiz | `deleteModuleQuiz(id)` |
| ADM-010 | `LessonManager.tsx:570-578` "Tạo quiz cho bài học" | `const { error } = await createLessonQuiz(lessonId); if (error) throw error;` |

`body` câu hỏi = `{ question_text, translation, dictation_keywords, image_url, audio_url, question_type, answers: [{ answer_text, is_correct, explanation }] }` — client vẫn lọc `answerFields.filter(a => a.text.trim())` như cũ.

## 4. Đặc tả — `/api/v1/assessment/admin`, guard `JwtAuthGuard` + `RolesGuard` + `@Roles(AppRole.admin)` cấp class

### 4.1 Câu hỏi
| Method | Route | Body | Trả về |
|---|---|---|---|
| GET | `/quizzes/:quizId/questions` | — | `ReviewQuestionDto[]` (đủ `is_correct`, lời giải) order `display_order`, `id` |
| POST | `/quizzes/:quizId/questions` | `SaveQuestionDto` | 201 `ReviewQuestionDto` |
| PUT | `/questions/:id` | `SaveQuestionDto` | `ReviewQuestionDto` |
| DELETE | `/questions/:id` | — | 204 |
| POST | `/quizzes/:quizId/questions/bulk-delete` | `{ question_ids: number[] }` | 204 |
| PUT | `/quizzes/:quizId/question-order` | `{ question_ids: number[] }` | 204 |
| PUT | `/quizzes/:quizId/question-images` | `{ items: [{ question_id, image_url: string \| null }] }` | 204 |
| PATCH | `/quizzes/:quizId` | `{ audio_url: string \| null }` | `QuizDto` |

- Mỗi thao tác ghi = **một `$transaction`**. Tạo/sửa câu: ghi câu → (sửa: xóa hết đáp án cũ) → chèn đáp án `display_order = vị trí` → **đếm lại** `quizzes.total_questions = số câu của quiz`. Xóa 1/nhiều: xóa câu (đáp án cascade theo FK) → đếm lại.
- **Server tính** `display_order` câu mới = max trong quiz + 1 (rỗng → 0). Bỏ qua đáp án có `answer_text` rỗng sau trim (lớp bảo vệ thứ hai).
- `bulk-delete`, `question-order`, `question-images`: mọi id phải thuộc `quizId`; id trùng hoặc lạ → 400 `QUESTION_IDS_INVALID`, không ghi gì.
- 404: quiz không có → `QUIZ_NOT_FOUND`; câu không có (PUT) → `QUESTION_NOT_FOUND`; DELETE không có → 204.

### 4.2 Quiz độc lập trong module
| Method | Route | Body | Trả về |
|---|---|---|---|
| POST | `/modules/:moduleId/quizzes` | `{ title, total_questions (int ≥ 0), time_limit_seconds (int ≥ 0 \| null) }` | 201 `QuizDto` |
| PUT | `/quizzes/:id` | như trên | `QuizDto` |
| DELETE | `/quizzes/:id` | — | 204 |

- **Server tính** `display_order` quiz mới = số quiz hiện có của module (như `quizzes.length` cũ); sửa giữ nguyên. Ở đây `total_questions` là số admin tự nhập cho quiz độc lập (như cũ), không đếm lại.
- Module không có → 404 `MODULE_NOT_FOUND`. Xóa quiz: FK cascade/SET NULL như DB cũ — ghi rõ trong Swagger.

### 4.3 `POST /lessons/:lessonId/quiz` → 201 `QuizDto` (ngoại lệ: ghi `lessons.quiz_id` của Learning)
Một `$transaction`: đọc bài (không có → 404 `LESSON_NOT_FOUND`; bài không có module → 400 `LESSON_HAS_NO_MODULE`) → tạo quiz `{ title: "Quiz - " + lesson.title, total_questions: 0, module_id: lesson.module_id, display_order: số quiz của module }` → `lessons.quiz_id = quiz.id`. Bài đã có `quiz_id` → 409 `LESSON_ALREADY_HAS_QUIZ` (nút chỉ hiện khi chưa có — đây là chốt chặn thêm). Comment `// TODO(Learning): chuyển qua LearningService khi có API nhận transaction`.

## 5. Tiêu chí nghiệm thu
- [x] E2E `it.each` mọi route × 3 vai (401/403/2xx)
- [x] E2E câu hỏi: tạo câu → `display_order` max+1, đáp án đúng thứ tự, `total_questions` cập nhật; sửa câu → đáp án cũ bị thay hết; xóa 1 và xóa nhiều → `total_questions` giảm; `question-order`/`question-images`/`bulk-delete` với id của quiz khác → 400, không đổi gì; đáp án `answer_text: "   "` bị bỏ qua
- [x] E2E transaction: chèn đáp án lỗi (vd. ép lỗi trong unit test service với repo mock) → câu không được tạo
- [x] E2E quiz độc lập: tạo → `display_order` = số quiz cũ; body có `display_order`/`module_id` → 400; `lessons/:id/quiz` gán `quiz_id`, gọi lần 2 → 409
- [x] Adapter test; `grep -nE 'from\("(questions|answers|quizzes)"\)' src/components/admin/QuizManager.tsx src/components/admin/LessonManager.tsx` **rỗng**; `from("lessons")` trong `LessonManager.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(questions|answers|quizzes|lessons)"\)' src/components/admin/QuizManager.tsx src/components/admin/LessonManager.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

### 7.1 `docker compose up -d postgres`
```
 Container l-english-academy-postgres-1  Running
```

### 7.2 `cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build`
```
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/assessment/assessment-admin.service.spec.ts
PASS src/modules/assessment/vocab.service.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 23 passed, 23 total
Tests:       265 passed, 265 total
Snapshots:   0 total
Time:        2.67 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (7.277 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-admin.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 19 passed, 19 total
Tests:       292 passed, 292 total
Snapshots:   0 total
Time:        38.397 s, estimated 42 s
Ran all test suites.

> backend@0.0.1 build
> nest build
```

### 7.3 `cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend`
```
> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 23ms
 ✓ src/lib/api/client.test.ts (4 tests) 16ms
 ✓ src/lib/api/admin.test.ts (16 tests) 27ms
 ✓ src/lib/api/payments.test.ts (8 tests) 25ms
 ✓ src/lib/api/assessment.test.ts (26 tests) 26ms
 ✓ src/lib/api/vocab.test.ts (8 tests) 18ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 34ms
 ✓ src/lib/api/auth.test.ts (12 tests) 27ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 15ms
 ✓ src/lib/api/learning.test.ts (47 tests) 58ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 399ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 4ms

 Test Files  13 passed (13)
      Tests  178 passed (178)
   Start at  09:08:28
   Duration  5.38s (transform 1.32s, setup 3.39s, collect 4.16s, tests 678ms, environment 30.67s, prepare 3.07s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2738 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.81 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
...
✓ built in 12.59s

check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```

### 7.4 `grep -nE 'from\("(questions|answers|quizzes|lessons)"\)' src/components/admin/QuizManager.tsx src/components/admin/LessonManager.tsx`
```
src/components/admin/QuizManager.tsx:522:      const { data } = await supabase.from("lessons").select("id").eq("quiz_id", quizId).single();
```
*(Ghi chú: Dòng 522 `from("lessons")` trong `QuizManager.tsx` thuộc truy vấn `lesson-id-from-quiz`, được quy định rõ tại Mục 2 là ngoài phạm vi task T-023. Các bảng `questions`, `answers`, `quizzes` không còn xuất hiện trong cả 2 file; bảng `lessons` hoàn toàn không còn xuất hiện trong `LessonManager.tsx`)*.

### 7.5 `git log --oneline -3 && git diff --stat refactor/nestjs-backend`
```
891e2ae fix(assessment): format code and resolve typecheck in assessment-admin tests
af3a9d3 feat(assessment): admin quiz and question management APIs and integration
653af61 docs: record T-022 review PASS, update queue and ADM-003

 backend/src/modules/assessment/assessment-admin.controller.ts      | 258 ++++++++
 backend/src/modules/assessment/assessment-admin.repository.ts      | 230 +++++++
 backend/src/modules/assessment/assessment-admin.service.spec.ts    | 519 +++++++++++++++
 backend/src/modules/assessment/assessment-admin.service.ts         | 364 +++++++++++
 backend/src/modules/assessment/assessment.module.ts                |  12 +-
 backend/src/modules/assessment/dto/assessment-admin.dto.ts         | 130 ++++
 backend/src/modules/assessment/dto/index.ts                        |   1 +
 backend/test/assessment-admin.e2e-spec.ts                          | 726 +++++++++++++++++++++
 src/components/admin/LessonManager.tsx                             |  24 +-
 src/components/admin/QuizManager.tsx                               | 107 ++-
 src/lib/api/assessment.test.ts                                     | 152 +++++
 src/lib/api/assessment.ts                                          | 160 +++++
 12 files changed, 2610 insertions(+), 73 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
