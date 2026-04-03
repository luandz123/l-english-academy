
## Kế hoạch triển khai Admin Course Content Management

### 1. Thay đổi Database
- **Thêm cột `lesson_type`** vào bảng `lessons`: `video` | `practice` | `exam`
- **Tạo bảng `lesson_practices`**: popup bài tập trong video
  - `lesson_id`, `quiz_id`, `trigger_at_seconds` (phút nào popup), `title`
- **Thêm cột vào `questions`**: hỗ trợ nhiều loại (Part 1: hình + audio, Part 2: audio only, Part 5: text only...)
  - Đã có `image_url`, `audio_url`, `question_type` → đủ dùng

### 2. Trang Admin Course Detail - Redesign
- **Tab Nội dung**: Quản lý Modules (Parts) → CRUD module
  - Trong mỗi module: CRUD lessons với chọn loại (video/practice/exam)
  - **Video lesson**: nhập video URL, đính tài liệu, cấu hình popup practice (chọn quiz + phút trigger)
  - **Practice/Exam lesson**: cấu hình số câu, thời gian, CRUD câu hỏi + đáp án
  - Câu hỏi: upload hình, audio, nhập text, 4 đáp án, chọn đáp án đúng, giải thích

### 3. Quản lý câu hỏi theo Part
- Part 1 (Photographs): hình + audio + 4 đáp án
- Part 2 (Q&A): audio + 3 đáp án  
- Part 3-4 (Conversations/Talks): audio + passage + nhiều câu hỏi
- Part 5-6 (Incomplete Sentences): text + 4 đáp án
- Part 7 (Reading): passage dài + nhiều câu hỏi

### 4. Import dữ liệu
- **Import CSV/Excel** cho câu hỏi hàng loạt (question_text, answers, correct, image_url, audio_url)
- **Import modules + lessons** từ file
- Template CSV download cho từng loại

### 5. Student side - Video với popup practice
- Khi xem video, đến phút X → tự động hiện panel bài tập bên cạnh
- Học sinh làm xong → tiếp tục video

### Thứ tự thực hiện
1. Migration DB (lesson_practices table, lesson_type column)
2. Admin Course Detail page (CRUD modules, lessons, questions)
3. Import data feature
4. Student LearnPage update (popup practice)
