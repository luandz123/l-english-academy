# T-029: Popup luyện tập trong LearnPage (#20, #22f)

> **Người làm**: Antigravity · **Module**: `LearningModule` · **Nhánh**: `task/T-029-learn-practice-popup` (tách từ `origin/refactor/nestjs-backend`)
> **Phụ thuộc**: — · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md`, `docs/HLD.md`, `docs/OPEN_QUESTIONS.md` (#20, #22f). Gặp gì không rõ: **dừng và ghi vào mục "Câu hỏi"**, không tự đoán.

## 1. Mục tiêu
Thay thế truy vấn trực tiếp `supabase.from("questions").select("*, answers(*)")` trong popup luyện tập của `LearnPage.tsx:198` bằng endpoint backend NestJS `GET /api/v1/learning/lessons/:lessonId/practices/:practiceId/questions`. Đảm bảo câu hỏi kèm `is_correct` chỉ trả về khi người dùng có quyền học bài học đó (`canStudyLesson`); popup practice phải thuộc đúng bài học; trả 403 nếu không có quyền và 400 nếu practice không thuộc bài.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/modules/learning/dto/practice.dto.ts` — thêm `PracticeQuestionDto`, `PracticeAnswerDto`
- `backend/src/modules/learning/dto/index.ts` — export các DTO mới
- `backend/src/modules/learning/learning.repository.ts` — thêm `findQuestionsWithAnswers(quizId: number)`
- `backend/src/modules/learning/learning.mapper.ts` — thêm `toPracticeQuestionDto`
- `backend/src/modules/learning/learning.service.ts` — thêm `getPracticeQuestions(lessonId, practiceId, user)`
- `backend/src/modules/learning/learning.controller.ts` — thêm endpoint `GET lessons/:lessonId/practices/:practiceId/questions`
- `backend/src/modules/learning/learning.service.spec.ts` — unit tests cho `getPracticeQuestions`
- `backend/test/learning-access.e2e-spec.ts` — e2e tests kiểm tra phân quyền (200, 403 LESSON_LOCKED, 400 PRACTICE_NOT_IN_LESSON, 404 PRACTICE_NOT_FOUND, 404 LESSON_NOT_FOUND)
- `src/lib/api/learning.ts` — thêm hàm `listPracticeQuestions(lessonId, practiceId)`
- `src/lib/api/learning.test.ts` — unit tests cho `listPracticeQuestions`
- `src/pages/LearnPage.tsx` — chuyển `openPractice` sang gọi `listPracticeQuestions`, xóa import `supabase`
- `docs/tasks/T-029-learn-practice-popup.md` — spec task này
- `docs/tasks/QUEUE.md` — cập nhật trạng thái

**Cấm sửa**
- JSX, `className`, chuỗi hiển thị, `queryKey`, tên state trong mọi file `.tsx`
- Không sửa layout, CSS hoặc logic chấm điểm popup ở giao diện

## 3. Hành vi cũ cần giữ (nguồn sự thật)
| Chỗ dùng cũ | Truy vấn Supabase | Kết quả component mong đợi |
|---|---|---|
| `LearnPage.tsx:198` | `supabase.from("questions").select("*, answers(*)").eq("quiz_id", practice.quiz_id).order("display_order")` | Mảng các câu hỏi, mỗi câu hỏi kèm mảng `answers` sắp xếp theo `display_order asc`, có trường `is_correct` để popup JSX chấm điểm |
| `LearnPage.tsx:104` | `learn-quiz-results` (đã chuyển ở T-011) | Kiểm tra lại: đã dùng `listMyQuizResults()`, không còn Supabase |

**Policy RLS tương ứng**:
- Bảng `questions`: `Questions viewable by all` (`USING (true)`)
- Bảng `answers`: `Answers viewable by all` (`USING (true)`)
Cũ: Supabase cho phép bất kỳ ai đọc mọi câu hỏi và đáp án đúng.
Mới: Backend kiểm soát quyền chặt chẽ:
1. `canStudyLesson`: chỉ trả câu hỏi kèm đáp án đúng (`is_correct`) khi user được phép học bài học (admin, khóa/chương/bài miễn phí, hoặc ghi danh còn hạn). Nếu không → 403 `LESSON_LOCKED`.
2. Kiểm tra quan hệ cha - con: `practiceId` phải thuộc `lessonId`. Nếu không → 400 `PRACTICE_NOT_IN_LESSON`.
3. Kiểm tra tồn tại: lesson không tồn tại → 404 `LESSON_NOT_FOUND`; practice không tồn tại → 404 `PRACTICE_NOT_FOUND`.
4. Nếu practice không gắn quiz (`quiz_id === null`) → trả `[]`.

## 4. Đặc tả
### 4.1 Endpoint
`GET /api/v1/learning/lessons/:lessonId/practices/:practiceId/questions`
- Guard: `@UseGuards(OptionalJwtAuthGuard)`
- Tham số: `lessonId` (number, URL), `practiceId` (number, URL)
- Xác thực & Phân quyền:
  - Nếu bài học không tồn tại → 404 `{ code: 'LESSON_NOT_FOUND', message: 'Bài học không tồn tại' }`
  - Nếu practice không tồn tại → 404 `{ code: 'PRACTICE_NOT_FOUND', message: 'Bài luyện tập không tồn tại' }`
  - Nếu `practice.lessonId !== lessonId` → 400 `{ code: 'PRACTICE_NOT_IN_LESSON', message: 'Bài luyện tập không thuộc bài học này' }`
  - Kiểm tra `canStudyLesson(ctx)`: nếu không được học → 403 `{ code: 'LESSON_LOCKED', message: 'Bạn chưa có quyền học bài này' }`
  - Nếu `practice.quizId === null` → trả về `[]`
  - Nếu có quiz: truy vấn câu hỏi của `quiz_id` kèm đáp án, sắp xếp câu theo `display_order asc, id asc`, đáp án theo `display_order asc, id asc`.

### 4.2 DTO
`PracticeAnswerDto`:
- `id`: number
- `question_id`: number | null
- `answer_text`: string | null
- `display_order`: number
- `is_correct`: boolean | null
- `explanation`: string | null

`PracticeQuestionDto`:
- `id`: number
- `quiz_id`: number | null
- `question_text`: string | null
- `question_type`: string | null
- `image_url`: string | null
- `audio_url`: string | null
- `display_order`: number
- `translation`: string | null
- `dictation_keywords`: string | null
- `explanation`: string | null
- `transcript`: string | null
- `knowledge_tag`: string | null
- `passage_text`: string | null
- `group_id`: string | null
- `answers`: PracticeAnswerDto[]

### 4.3 Client API Adapter
`src/lib/api/learning.ts`:
```ts
export async function listPracticeQuestions(
  lessonId: number,
  practiceId: number,
): Promise<{ data: PracticeQuestionDto[] | null; error: ApiError | null }>
```

## 5. Tiêu chí nghiệm thu
- [x] Endpoint `GET /api/v1/learning/lessons/:lessonId/practices/:practiceId/questions` trả về danh sách câu hỏi kèm `answers` với `is_correct`.
- [x] Trả về 403 `LESSON_LOCKED` khi user không có quyền học bài.
- [x] Trả về 400 `PRACTICE_NOT_IN_LESSON` khi practice thuộc bài học khác.
- [x] Trả về 404 `LESSON_NOT_FOUND` hoặc `PRACTICE_NOT_FOUND` khi không tìm thấy.
- [x] `LearnPage.tsx` không còn lệnh gọi `supabase.from("questions")` nào, không còn import `supabase`.
- [x] Unit test và e2e test pass 100%.
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` sạch sẽ.

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs origin/refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật:
- [x] **Mọi id client gửi đều thuộc đúng đối tượng cha**: practice thuộc bài học (nếu không → 400 `PRACTICE_NOT_IN_LESSON`). Có e2e gửi practice của bài khác.
- [x] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: kiểm tra `canStudyLesson` trước khi trả câu hỏi và đáp án đúng. Có e2e kiểm tra 403 `LESSON_LOCKED` cho người không có quyền.
- [x] **Dữ liệu người khác**: user chỉ lấy từ token hoặc optional auth.
- [x] **Giới hạn đầu vào**: route nhận id dạng số nguyên (ParseIntPipe).
- [x] **Giá trị nhạy cảm do server tính**: đáp án `is_correct` chỉ gửi khi user đã có quyền học bài theo server check.
- [x] **Ghi nhiều bước = một `$transaction`**: route chỉ đọc, không ghi.
- [x] **Lỗi dạng `{ code, message }`**: trả đúng định dạng `{ code: 'LESSON_LOCKED', message: ... }`, `{ code: 'PRACTICE_NOT_IN_LESSON', message: ... }`.

- Commit(s):
  - `0f1d456`: docs(tasks): spec T-029
  - `2536bfe`: feat(learning): practice popup questions with lesson access check (T-029)
- File đã sửa:
  - `backend/src/modules/learning/dto/practice.dto.ts`
  - `backend/src/modules/learning/learning.repository.ts`
  - `backend/src/modules/learning/learning.mapper.ts`
  - `backend/src/modules/learning/learning.service.ts`
  - `backend/src/modules/learning/learning.controller.ts`
  - `backend/src/modules/learning/learning.service.spec.ts`
  - `backend/test/learning-access.e2e-spec.ts`
  - `src/lib/api/learning.ts`
  - `src/lib/api/learning.test.ts`
  - `src/pages/LearnPage.tsx`
  - `docs/tasks/T-029-learn-practice-popup.md`
  - `docs/tasks/QUEUE.md`
- Output lệnh kiểm tra:
```bash
# 1. Backend lint & typecheck
$ cd backend && npm run lint && npm run typecheck
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"
> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json
# OK - exit code 0

# 2. Backend unit tests
$ npm test
Test Suites: 25 passed, 25 total
Tests:       325 passed, 325 total
Snapshots:   0 total
Time:        2.609 s

# 3. Backend build
$ npm run build
> backend@0.0.1 build
> nest build
# OK - exit code 0

# 4. Backend e2e tests
$ npm run test:e2e
PASS test/auth.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts (24 passed)
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/assessment-admin.e2e-spec.ts
PASS test/media.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-admin-fulltest.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/assessment-vocab.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/dictation.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/health.e2e-spec.ts
Test Suites: 22 passed, 22 total
Tests:       361 passed, 361 total
Snapshots:   0 total
Time:        31.658 s

# 5. Frontend tests
$ npm test
Test Files  14 passed (14)
Tests       202 passed (202)
Time        9.59s

# 6. Frontend build
$ npm run build
✓ 2739 modules transformed.
dist/index.html 1.71 kB
dist/assets/LearnPage-D7Dnn8QU.js 40.82 kB
✓ built in 27.63s

# 7. UI Diff check
$ node scripts/check-ui-diff.mjs origin/refactor/nestjs-backend
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với origin/refactor/nestjs-backend).

# 8. Typecheck & ESLint
$ npx tsc --noEmit -p tsconfig.app.json 2>&1 | Select-String "error TS" | Select-String "src/lib/api|LearnPage"
# rỗng (exit code 1)
$ npx eslint src/lib/api/learning.ts
# rỗng (exit code 0)
```
- Chỗ chưa chắc: Không có

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
- Kết quả:
- Lý do:


---

## Review (Claude, 2026-10-29) — ✅ PASS, merged

- Practice phải thuộc bài (400), quyền theo `canStudyLesson` dùng chung `lessonAccessContext` (admin, bài/chương free, ghi danh còn hạn), 403 trước khi đọc câu hỏi. e2e đủ khách / học viên khác / hết hạn / enrolled / admin / bài free / 404.
- Thay đổi hành vi có chủ đích (#22f): code cũ đọc `questions + answers` không kiểm quyền; giờ người không có quyền nhận 403 → `data` null → popup rỗng như khi lỗi cũ.
- Kiểm tra sau gộp: backend unit 325/325, e2e 361/361, build OK; frontend 202/202, eslint adapter sạch, tsc (adapter + LearnPage) rỗng, `check-ui-diff` OK, `LearnPage.tsx` không còn `supabase`.
