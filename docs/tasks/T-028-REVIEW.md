# Review T-028 (Claude, 2026-10-29) — 🔁 TRẢ LẠI

Review trên `b325571`. Phần tốt: mỗi import một `$transaction`, guard admin cấp class, `ArrayMaxSize`/`MaxLength`, media vẫn upload ở client trước khi gửi JSON, xóa đề + quiz trong transaction. Lỗi chính: **quy tắc ghi dữ liệu ở server không khớp code cũ** (luật 3: không đổi hành vi). Có 3 luồng cũ khác nhau đã bị gộp/sửa quy tắc. Sửa theo đúng code cũ ở `08b21aa` (đọc lại file cũ, đừng suy):

## 1. Import trọn bộ (`AdminFullTestManager.tsx` cũ, nhánh "Bộ Đề") → `package-import`
- **Khóa học: tìm theo `title = course_title`, có thì dùng lại**, không có thì tạo với đúng các trường cũ: `subtitle: "Bộ đề thi thử TOEIC sát đề thi thật 2026"`, `course_type: "fulltest"`, `is_active: true`, `price: 0`, `duration_months: 12`, `instructor: "Cô Mai Phương"`. Hiện frontend chỉ gửi `course_title` → server luôn tạo khóa mới → import lại sẽ nhân đôi khóa học và đề, không ghi đè. Bỏ `create_new_course`/`course_id` (code cũ không có).
- Câu hỏi: `question_text = q.question_text || ""`, passage chỉ từ `q.passage_text` (prefix `[PASSAGE]…[ENDPASSAGE]`), không thêm alias `text`/`passage`.
- Đáp án: chỉ dạng object như cũ: `answer_text || text || ""`, `!!is_correct || !!correct`, `explanation: ans.explanation || null` (**không** lấy `q.explanation`), `display_order ?? aIdx`. Bỏ nhánh đáp án dạng chuỗi.
- **Không** cập nhật `full_tests.total_questions` (code cũ chỉ cập nhật `quizzes.total_questions` = số câu đếm trong DB).

## 2. Hai luồng import câu vào một đề đang dùng chung `import-questions` với quy tắc lai → tách 2 endpoint
**(a) `CourseFullTestManager.tsx` cũ** → giữ `POST …/full-tests/:testId/import-questions`:
- Chỉ tạo 7 section khi đề **chưa có section nào** (cũ: `!sections || sections.length === 0`), không bù từng part thiếu.
- `part = part_number || part || suy theo display_order (≤6→1 … ≤146→6, còn lại 7) || 5`.
- `question_text = question_text || text || ""`; **`passage_text` lưu vào cột `passage_text`** (`passage_text || passage || null`), **không** prefix `[PASSAGE]`; **không** gán `question_type` (để mặc định DB); `translation = item.translation || null`; `group_id` giữ nguyên giá trị.
- Đáp án: chuỗi → text, `is_correct = correct_answer === aIdx || correct === aIdx`, `explanation = item.explanation || null`; object → `answer_text || text || ""`, `is_correct = !!is_correct` (không `correct`), `explanation = ans.explanation || item.explanation || null`; `display_order = aIdx`.
- `quizzes.total_questions = số câu của part đó trong JSON` (cũ: `partQuestions.length`, không đếm DB); `full_tests.total_questions = số câu đã import`.

**(b) `AdminFullTestManager.tsx` cũ, nhánh import vào đề đã chọn** → endpoint mới, ví dụ `POST …/full-tests/:testId/append-questions`:
- Đề không có section → 400 `FULLTEST_SECTIONS_NOT_FOUND` (cũ: throw "Không thể tìm thấy các Sections…"), không tự tạo.
- `part = part || part_number || 5` (không suy theo display_order); prefix `[PASSAGE]`; `question_type = part${n}`; `display_order = q.display_order || currentStep`; `translation || translation_text`.
- Đáp án như mục 1. `quizzes.total_questions` = đếm DB. Không cập nhật `full_tests.total_questions`. Cập nhật `audio_url` của đề nếu có.

## 3. Import khóa từ JSON (`AdminCourseJsonImport.tsx`) — gần đúng, sửa 2 chỗ
- `question_type = PART_TYPE_MAP[q.part] ?? "multiple_choice"` (cũ: thiếu `part` → `"multiple_choice"`, không phải `part5`).
- Đáp án `display_order = a.display_order ?? 0` (cũ mặc định 0, không phải `aIdx`); `explanation ?? null`, `is_correct ?? false`.

## Test bắt buộc
- Unit test mỗi luồng với **một mẫu JSON từ code cũ** → khẳng định từng trường ghi ra (question_type, passage, display_order, is_correct, explanation, total_questions).
- e2e: package import 2 lần cùng `course_title` → **một** khóa, đề bị ghi đè (số câu không nhân đôi). `append-questions` vào đề không section → 400, không ghi gì.

Sau khi sửa: chạy lại toàn bộ lệnh kiểm tra (kể cả `tsc` cho adapter + 3 trang), dán output nguyên văn **sau commit cuối**, push lại `task/T-028-bulk-import`, đổi QUEUE về 🔍.
