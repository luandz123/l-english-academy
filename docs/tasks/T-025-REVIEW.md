# Review T-025 (Claude, 2026-10-29) — 🔁 TRẢ LẠI

Review trên `21668b6`. Spec và phần frontend ổn; endpoint `sync` đúng hành vi cũ (`handleSubmitQuiz` cũ cũng ghi `user_answers`). Phải sửa 4 điểm rồi push lại cùng nhánh:

1. **Kiểm `question_id` thuộc quiz** (luật 5 — điểm). `markQuestionDone`, `unmarkQuestionDone`, `syncSession` hiện ghi `user_answers` cho bất kỳ id nào → gửi id câu của quiz khác sẽ được đếm, điểm vượt tổng số câu. Sửa: lấy id câu của quiz (đã có `findQuestionsWithAnswers`), id không thuộc → 400 `{ code: 'QUESTION_IDS_INVALID' }`, không ghi gì. Thêm e2e: id câu của quiz khác → 400, `score` không đổi.
2. **Kiểm quyền ở mọi route ghi/đọc kết quả** (#22a). `canTakeQuiz` mới chỉ có ở `GET quizzes/:quizId`. Thêm vào `result`, `answers`, `done` (PUT/DELETE), `sync`, `reset`: không có quyền → 403 `{ code: 'QUIZ_LOCKED' }`. Thêm e2e: học viên chưa mua khóa → 403 ở các route này, không tạo `user_quiz_results`.
3. **`total_questions` = số câu thật của quiz** (`questions.length`), như code cũ (`total_questions: questions.length`). Bỏ `quiz.totalQuestions ||`.
4. **Định dạng lỗi** `{ code, message }` như các module khác: `new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: … })`, `new ForbiddenException({ code: 'QUIZ_LOCKED', message: … })`.

Sau khi sửa: chạy lại lệnh mục 6, dán output nguyên văn **sau commit cuối**, push lại `task/T-025-dictation`. Không cần đổi spec trừ phần ghi các điểm trên.
