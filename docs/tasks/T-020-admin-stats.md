# T-020: Dashboard, Báo cáo, Danh sách học viên (admin) qua API

> **Người làm**: Antigravity · **Module**: Admin · **Nhánh**: `task/T-020-admin-stats`
> **Phụ thuộc**: **T-018 ✅ merged** (cùng sửa `backend/src/modules/admin/`) · **Ước lượng**: 2,5 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/admin/` (T-014, T-018 — làm theo đúng mẫu), file này.

## 1. Mục tiêu
3 trang admin đọc thẳng Supabase (đếm, 5 bản ghi gần nhất, dữ liệu thô để client tự gộp). Thêm endpoint admin **trả dữ liệu thô đúng shape cũ** và chuyển truy vấn. **Giữ nguyên mọi phép gộp/tính toán ở client** (đếm theo khóa, tỉ lệ đúng, trạng thái học viên) — chỉ thay nguồn dữ liệu.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/admin/**` (thêm `admin-stats.controller.ts` hoặc thêm route vào controller admin; service/repository/mapper/DTO; spec), `backend/test/admin-stats.e2e-spec.ts`; `src/lib/api/admin.ts` + `.test.ts`; **chỉ** thân `queryFn` + `import` ở `src/pages/admin/AdminDashboard.tsx`, `AdminReports.tsx`, `AdminStudents.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`; các dòng tính toán sau khi có dữ liệu (`scoreMap`, `qMap`, `sorted`, `enrollMap`, `status`…) — giữ nguyên từng dòng; `createStudentMutation` của `AdminStudents` (đã chuyển ở P1); module khác.

## 3. Hành vi cũ → mới (tất cả route dưới `/api/v1/admin/stats`, guard admin cấp class)
| PARITY | Chỗ cũ | Cũ | Route mới → trả về |
|---|---|---|---|
| ADM-001 | `AdminDashboard.tsx:13-34` | 3 lệnh đếm: `profiles` (tất cả), `courses` `is_active = true`, `user_quiz_results` (tất cả) | `GET /counts` → `{ total_students, total_courses, total_quiz_attempts }`; 3 `queryFn` đọc đúng trường của mình, `?? 0` như cũ |
| ADM-001 | `AdminDashboard.tsx:36-57` | `enrollments.select("*, courses(title)").order(enrolled_at desc).limit(5)` + gắn `profiles { user_id, full_name }` | `GET /recent-enrollments` → mảng đã gắn sẵn `courses` và `profiles`; `queryFn` = `return data ?? []` |
| ADM-001 | `AdminDashboard.tsx:60-81` | `user_quiz_results.select("*, quizzes(title)").order(completed_at desc).limit(5)` + gắn `profiles` | `GET /recent-results` → như trên (`score` là number) |
| ADM-001 | `AdminDashboard.tsx:85-90` | `quizzes.select("id, title")` + `user_quiz_results.select("quiz_id, score")` | `GET /quiz-scores` → `{ quizzes: {id,title}[], results: {quiz_id,score}[] }`; `queryFn` lấy 2 mảng rồi **giữ nguyên** đoạn `if (!quizzes?.length) return []`… và `scoreMap` |
| ADM-018 | `AdminReports.tsx:12-20` | `courses.select("id, title").eq(is_active, true)` + `enrollments.select("course_id")` | `GET /course-enrollments` → `{ courses: {id,title}[], enrollments: {course_id}[] }`; giữ `countMap` |
| ADM-018 | `AdminReports.tsx:24-50` | `user_answers.select("question_id, is_correct")` → client chọn 5 câu khó nhất → `questions.select("id, question_text").in(id)` | `GET /answers` → `{question_id,is_correct}[]` và `GET /questions?ids=1,2,3` → `{id,question_text}[]` (tối đa 50 id); giữ nguyên `qMap`/`sorted`/thay `[PASSAGE]` |
| ADM-002 | `AdminStudents.tsx:55-75` | `profiles.select("*").order(created_at desc)` + `enrollments.select("user_id, expires_at")` | `GET /students` → `{ profiles: ProfileRow[], enrollments: {user_id,expires_at}[] }`; giữ `enrollMap`, `status` |

- `ProfileRow`: đủ cột `profiles` snake_case như `select("*")` (dùng lại mapper profile có sẵn ở module Auth nếu được export; nếu không, map đủ cột trong mapper Admin).
- Join/đọc bảng của module khác (Catalog, Learning, Assessment, Auth) **chỉ đọc**, trong `AdminRepository`, ghi chú lý do (thống kê toàn hệ thống). `score` numeric → number.
- Thứ tự như cũ; `limit(5)` ở server.

## 4. Tiêu chí nghiệm thu
- [ ] E2E: mọi route × 3 vai (401/403/200)
- [ ] E2E: `counts` đúng (seed 2 khóa active + 1 ẩn → `total_courses = 2`); `recent-*` tối đa 5, mới nhất trước, có `profiles.full_name`; `questions?ids=` chỉ trả id được hỏi, > 50 id → 400
- [ ] Adapter test; `grep -n "supabase" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminReports.tsx` rỗng; `AdminStudents.tsx` không còn `from("profiles")`/`from("enrollments")`; `check-ui-diff` OK
- [ ] `git diff` 3 trang: các dòng tính toán sau khi có dữ liệu **không đổi**

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 6, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n "supabase" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminStudents.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Kết quả (người làm điền)

## 7. Câu hỏi (người làm điền khi bị chặn)

## 8. Review (Claude điền)
