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
- [ ] E2E `it.each` mọi route × 3 vai (401/403/2xx)
- [ ] E2E thêm câu vào Part chưa có section → tạo quiz `Part N - <title>` + section; thêm câu thứ 2 cùng Part → dùng lại section; `total_questions` của đề = số câu thật
- [ ] E2E sửa câu: đáp án giữ `id` thì `id` không đổi; đáp án bị bỏ bị xóa; đáp án mới được chèn; `id` đáp án của câu khác → 400 và không đổi gì
- [ ] E2E nhân bản: câu mới `display_order + 1`, đuôi " (Bản sao)", đáp án sao đủ; `total_questions` **không** đổi
- [ ] E2E nhóm: id của đề khác → 400; hợp lệ → 4 trường cập nhật
- [ ] Adapter test; `grep -nE 'from\("(full_tests|full_test_sections|quizzes|questions|answers)"\)' src/pages/admin/AdminFullTestQuestions.tsx` rỗng; `check-ui-diff` OK

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 6, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(full_tests|full_test_sections|quizzes|questions|answers)"\)' src/pages/admin/AdminFullTestQuestions.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Kết quả (người làm điền)

## 7. Câu hỏi (người làm điền khi bị chặn)

## 8. Review (Claude điền)
