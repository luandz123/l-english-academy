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
- [ ] E2E seed đủ 4 nhánh của 4.2: (1) quiz gắn `lesson_id`; (2) không có (1) nhưng có quiz `id = ref`; (3) chỉ khớp qua `lessons.quiz_id`; (4) không quiz + có `question_ids` → lọc theo `question_id`; (4b) không quiz, không `question_ids` → `[]`; có quiz + `question_ids` → lọc đúng
- [ ] Unit: 2 quiz cùng `lesson_id = ref` → bỏ qua bước 1, sang bước 2
- [ ] E2E: 3 route danh sách đúng thứ tự, khóa/danh mục khác không lẫn; `quiz-id` bài không tồn tại → `{ lesson: null }`; `question_ids=abc` → 400; không cần token
- [ ] Adapter test; `grep -n "supabase" src/pages/VocabPage.tsx src/pages/VocabLessonPage.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n "supabase" src/pages/VocabPage.tsx src/pages/VocabLessonPage.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
