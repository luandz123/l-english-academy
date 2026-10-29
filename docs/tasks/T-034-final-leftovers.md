# T-034: Dọn nốt các truy vấn Supabase ngoài T-033 (ImportDialog, QuizManager, DashboardPage)

> **Người làm**: Antigravity · **Module**: assessment, learning · **Nhánh**: `task/T-034-final-leftovers` (tách từ `origin/task/T-033-leftovers`)
> **Phụ thuộc**: T-033 · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `docs/tasks/BRIEFS.md`, `docs/HLD.md`, `docs/PARITY.md`.

---

## 1. Mục tiêu
Chuyển đổi toàn bộ các câu truy vấn Supabase còn sót lại ở phía frontend (ngoài Speaking đã hoãn theo quyết định #11) sang backend NestJS API có xác thực, phân quyền và transaction:
- Gộp toàn bộ luồng import câu hỏi + đáp án + từ vựng + cập nhật 2 bộ đếm `total_questions` ở `ImportDialog.tsx` thành MỘT endpoint `POST /api/v1/assessment/admin/quizzes/:quizId/import-questions` trong MỘT `$transaction`. Server đếm số lượng thật, client không gửi `total_questions` hay `display_order`.
- Thay các câu truy vấn Supabase trực tiếp ở `QuizManager.tsx:518` và `QuizManager.tsx:597-599` bằng các API endpoint đã có sẵn (`getDictationLesson`, `getAdminLessonVocabQuiz`, `getAdminLessonVocabWords`), không tạo trùng endpoint.
- Thay câu truy vấn Supabase `modules.select("id, title, lessons(id, title)")` ở `DashboardPage.tsx:150` bằng API client `getCurriculum(ngheDocCourseId)`.
- Ghi nhận hành vi hiển thị webhook SePay ở `AdminSettings.tsx` vào mục Câu hỏi (không tự đổi URL hiển thị).
- Sau task này, trong toàn bộ thư mục `src` chỉ còn duy nhất `speakingService.ts` có truy vấn Supabase (đã hoãn theo #11).

---

## 2. Phạm vi

### 2.1 File được sửa/tạo
**Backend**:
- `backend/src/modules/assessment/dto/import-quiz-questions.dto.ts` (mới)
- `backend/src/modules/assessment/dto/index.ts`
- `backend/src/modules/assessment/assessment-admin.controller.ts`
- `backend/src/modules/assessment/assessment-admin.service.ts`
- `backend/src/modules/assessment/assessment-admin.repository.ts`
- `backend/test/quiz-import-questions.e2e-spec.ts` (mới)

**Frontend**:
- `src/lib/api/assessment.ts`, `src/lib/api/assessment.test.ts`
- `src/components/admin/ImportDialog.tsx`
- `src/components/admin/QuizManager.tsx`
- `src/pages/DashboardPage.tsx`
- `docs/tasks/T-034-final-leftovers.md`
- `docs/tasks/QUEUE.md`

### 2.2 Cấm sửa
- Speaking (`speakingService.ts`, `useVoiceRoom.ts`, `SpeakingRoomsPage.tsx`, `api/speaking-token.ts`, kênh `lobby-pvp-*`, `arena-pvp-*`).
- `render.yaml`, `vercel.json`, `.github/workflows`, `docs/CUTOVER.md`.
- JSX, `className`, bố cục, câu chữ hiển thị giao diện, queryKey (giữ nguyên).
- Không tự đổi URL webhook ở `AdminSettings.tsx`.

---

## 3. Hành vi cũ cần giữ (nguồn sự thật)

| Chỗ dùng cũ | Truy vấn Supabase cũ | Kết quả mong đợi |
|---|---|---|
| `ImportDialog.tsx:128` | `supabase.from("vocab_questions").insert(vocabEntries)` | Tạo vocab nếu có `vocabText` |
| `ImportDialog.tsx:328-332` | `supabase.from("questions").insert(questionsPayload).select("id")` | Tạo questions |
| `ImportDialog.tsx:349` | `supabase.from("answers").insert(allAnswers)` | Tạo answers |
| `ImportDialog.tsx:366` | `supabase.from("quizzes").update({ total_questions: count }).eq("id", quizId)` | Đếm câu hỏi cập nhật vào quiz |
| `ImportDialog.tsx:379` | `supabase.from("vocab_quizzes").update({ total_questions: vCount }).eq("id", vq.id)` | Đếm từ vựng cập nhật vào vocab_quiz |
| `QuizManager.tsx:518` | `supabase.from("lessons").select("id").eq("quiz_id", quizId).single()` | Lấy lessonId theo quizId |
| `QuizManager.tsx:597-599` | `supabase.from("vocab_quizzes").select("id").eq("lesson_id", effectiveLessonId)` + `supabase.from("vocab_questions").select("*").eq("vocab_quiz_id", vQuiz.id)` | Lấy từ vựng gắn với câu hỏi trong bài |
| `DashboardPage.tsx:150` | `supabase.from("modules").select("id, title, lessons(id, title)").eq("course_id", ngheDocCourseId)` | Danh sách modules và lessons của khóa |

**Policy RLS tương ứng** (phải có test):
- `questions`, `answers`, `quizzes`, `vocab_quizzes`, `vocab_questions`: quyền quản trị viên Admin.
- Backend guard: `JwtAuthGuard` + `RolesGuard` (`@Roles('admin')`). Có test 401 khi không có token và 403 khi là học viên.

---

## 4. Đặc tả API mới

### 4.1 Endpoint Import câu hỏi + từ vựng cho Quiz
- `POST /api/v1/assessment/admin/quizzes/:quizId/import-questions`
  - Guard: `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(AppRole.admin)`.
  - Params: `quizId` (number, `ParseIntPipe`).
  - DTO: `ImportQuizQuestionsDto`:
    - `questions`: mảng tối đa 200 câu (`ArrayMaxSize(200)`). Mỗi câu gồm:
      - `question_text`: string (tối đa 2000 ký tự)
      - `question_type`: string (part1, part2, part3, part4, part6, part7, multiple_choice)
      - `translation`: string | null
      - `dictation_keywords`: string | null
      - `audio_url`: string | null
      - `image_url`: string | null
      - `answers`: mảng các lựa chọn đáp án (`text`, `is_correct`, `explanation`)
      - `vocab_text`: chuỗi từ vựng dạng `word|def|phonetic|example; ...` | null
    - `effective_lesson_id`: number | null (tùy chọn)
    - `quiz_title`: string | null (tùy chọn, dùng để đặt tiêu đề `Từ vựng - ${quiz_title}` nếu cần tạo `vocab_quizzes`)
  - Logic server thực thi trong MỘT `$transaction`:
    1. Kiểm tra `quizId` có tồn tại, nếu không ném 404 `{ code: 'QUIZ_NOT_FOUND', message: '...' }`.
    2. Nếu có `effective_lesson_id`, kiểm tra bài học có tồn tại, nếu không ném 404 `{ code: 'LESSON_NOT_FOUND', message: '...' }`.
    3. Tính toán `display_order` xuất phát từ `max(display_order) + 1` hiện có trong quiz (client không gửi `display_order`).
    4. Thêm các câu hỏi vào bảng `questions` và đáp án tương ứng vào bảng `answers` với `display_order = idx`.
    5. Nếu có `effective_lesson_id` và các câu có `vocab_text`:
       - Tách chuỗi từ vựng theo quy tắc cũ: tách `;` thành các từ, mỗi từ tách `|` thành `[word, def, phonetic, example]`.
       - Tìm hoặc tạo `vocab_quizzes` gắn với `lesson_id = effective_lesson_id` với tiêu đề `Từ vựng - ${quiz_title || quiz.title || 'Bài học'}`.
       - Thêm các bản ghi vào `vocab_questions` gắn với `question_id` tương ứng, `display_order = vIdx`.
    6. Đếm số lượng thực tế:
       - `total_questions` của quiz = `count(questions)` trong quiz -> cập nhật `quizzes.total_questions`.
       - `total_questions` của vocab_quiz = `count(vocab_questions)` trong vocab quiz -> cập nhật `vocab_quizzes.total_questions`.
    7. Trả về: `{ success: true, count: number }`.

### 4.2 Tái sử dụng các endpoint hiện có
- `QuizManager.tsx:518`: Dùng `getDictationLesson(quizId)` (`GET /assessment/dictation/quizzes/:quizId/lesson`).
- `QuizManager.tsx:597-599`: Dùng `getAdminLessonVocabQuiz(effectiveLessonId)` (`GET /assessment/admin/vocab/lessons/:lessonId/quiz`) và `getAdminLessonVocabWords(vQuiz.id)` (`GET /assessment/admin/vocab/quizzes/:quizId/words`).
- `DashboardPage.tsx:150`: Dùng `getCurriculum(ngheDocCourseId)` (`GET /learning/courses/:courseId/curriculum`).

---

## 5. Tiêu chí nghiệm thu
- [ ] Endpoint `POST /api/v1/assessment/admin/quizzes/:quizId/import-questions` chạy hoàn toàn trong một transaction.
- [ ] Server tự đếm `total_questions` cho quiz và vocab quiz, tự tính `display_order`.
- [ ] Giữ đúng quy tắc tách chuỗi từ vựng cũ (`word|def|phonetic|example; ...`).
- [ ] `QuizManager.tsx` và `DashboardPage.tsx` dùng lại các endpoint đã có, không tạo trùng.
- [ ] Sau task: `grep -rn "supabase\.\(from\|rpc\|storage\)" src` chỉ còn `speakingService.ts`.
- [ ] E2E 3 vai: 401 khi không có token, 403 khi là học viên, 201 cho admin.
- [ ] `npm --prefix backend run lint && npm --prefix backend run build && npm --prefix backend run test` pass.
- [ ] `npm test` frontend pass.
- [ ] `npx tsc --noEmit -p tsconfig.app.json` không có lỗi ở các file sửa.
- [ ] `npx eslint` sạch.
- [ ] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` không lệch UI.

---

## 6. Lệnh kiểm tra (dán output thật vào mục 7)
```bash
npm --prefix backend run lint
npm --prefix backend run build
npm --prefix backend run test
npm --prefix backend run test:e2e -- quiz-import-questions.e2e-spec.ts
npm test -- src/lib/api/assessment.test.ts
npx tsc --noEmit -p tsconfig.app.json 2>&1 | Select-String "error TS" | Select-String "src/lib/api|ImportDialog|QuizManager|DashboardPage"
npx eslint src/lib/api/assessment.ts
node scripts/check-ui-diff.mjs refactor/nestjs-backend
```

---

## 7. Kết quả (người làm điền)
### Checklist tự rà bảo mật (bắt buộc)
- [ ] **Mọi id client gửi đều thuộc đúng đối tượng cha**: `quizId`, `effective_lesson_id` kiểm tra tồn tại trong DB trước khi ghi.
- [ ] **Mọi route đọc/ghi dữ liệu có quyền đều kiểm quyền**: guard admin `JwtAuthGuard` + `RolesGuard(admin)` trên endpoint import.
- [ ] **Dữ liệu người khác**: route admin quản trị câu hỏi theo quiz; không lộ dữ liệu người khác.
- [ ] **Giới hạn đầu vào**: `ArrayMaxSize(200)`, `MaxLength` cho mọi trường text trong DTO.
- [ ] **Giá trị nhạy cảm do server tính**: `display_order`, `total_questions` của quiz và vocab quiz đều do server đếm và tính toán.
- [ ] **Ghi nhiều bước = một `$transaction`**: tạo câu hỏi, đáp án, từ vựng và cập nhật 2 bộ đếm diễn ra trong duy nhất 1 transaction.
- [ ] **Lỗi dạng `{ code, message }`**: ném đúng cấu trúc chuẩn.

- Commit(s):
- File đã sửa:
- Output lệnh kiểm tra:
- Chỗ chưa chắc:

---

## 8. Câu hỏi (người làm điền khi bị chặn)
1. `AdminSettings.tsx:78,93`: Đường dẫn webhook SePay đang hiển thị `/api/payment-webhook` (Vercel function cũ) và gọi thử qua `fetch("/api/payment-webhook")`. Webhook mới của backend NestJS là `POST /api/v1/payments/webhooks/sepay`. Theo chỉ dẫn trong BRIEFS.md, việc đổi chuỗi đường dẫn là đổi dữ liệu hiển thị cấu hình cho admin nên giữ nguyên chuỗi cũ và ghi nhận lại vào đây.
2. `DashboardPage.tsx:308`: Dòng `queryKey: ["dashboard-study-leaderboard", user?.id]` là ngoại lệ hợp lệ theo quy tắc #21 để invalidate cache theo từng user.

---

## 9. Review (Claude điền)
- Kết quả:
- Lý do:
