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
- [ ] Endpoint `GET /api/v1/learning/lessons/:lessonId/practices/:practiceId/questions` trả về danh sách câu hỏi kèm `answers` với `is_correct`.
- [ ] Trả về 403 `LESSON_LOCKED` khi user không có quyền học bài.
- [ ] Trả về 400 `PRACTICE_NOT_IN_LESSON` khi practice thuộc bài học khác.
- [ ] Trả về 404 `LESSON_NOT_FOUND` hoặc `PRACTICE_NOT_FOUND` khi không tìm thấy.
- [ ] `LearnPage.tsx` không còn lệnh gọi `supabase.from("questions")` nào, không còn import `supabase`.
- [ ] Unit test và e2e test pass 100%.
- [ ] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` sạch sẽ.

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
- File đã sửa:
- Output lệnh kiểm tra:
- Chỗ chưa chắc: Không có

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
- Kết quả:
- Lý do:
