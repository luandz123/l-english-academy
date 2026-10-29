# Hàng đợi task cho Antigravity

Claude viết spec và cập nhật cột **Trạng thái**. Antigravity làm lần lượt từ trên xuống, **không chờ review**.

## Luật
1. Trước **mỗi** task: `git fetch && git checkout refactor/nestjs-backend && git pull`, rồi đọc lại file này.
2. Có dòng **🔁 TRẢ LẠI** → làm dòng đó trước: checkout lại nhánh của nó, `git merge origin/refactor/nestjs-backend`, sửa theo mục Review trong spec, push lại.
3. Nếu không: lấy dòng **⏳ chờ** đầu tiên mà mọi task ở cột *Phụ thuộc* đều **✅ merged**. Không có dòng nào đủ điều kiện → dừng và báo "hết việc".
4. Mỗi task: `git checkout -b <nhánh>` từ `refactor/nestjs-backend` vừa pull → làm đúng spec → chạy lệnh mục 6 **sau commit cuối** → dán output **nguyên văn** vào mục 7 → commit → `git push -u origin <nhánh>`.
5. Không tự sửa cột Trạng thái, `PARITY.md`, `PROGRESS.md`. Không merge vào `refactor/nestjs-backend`. Bị chặn → ghi mục 8 của spec, push, chuyển task kế.
6. `FullTestExam.tsx`, `FullTestResult.tsx` chỉ Claude sửa. Payments chỉ làm đúng phạm vi T-015.

## Trạng thái
Ký hiệu: ⏳ chờ · 🔨 đang làm · 🔍 chờ review · 🔁 TRẢ LẠI · ✅ merged

| Task | Spec | Nhánh | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| T-010 | [ghi danh admin](T-010-admin-student-enrollments.md) | `task/T-010-admin-student-enrollments` | — | ✅ merged |
| T-011 | [kết quả quiz](T-011-quiz-results-lists.md) | `task/T-011-quiz-results-lists` | — | ✅ merged |
| T-012 | [admin chương (backend)](T-012-catalog-admin-modules.md) | `task/T-012-catalog-admin-modules` | — | ✅ merged |
| T-014 | [ghi chú học viên](T-014-admin-student-notes.md) | `task/T-014-admin-student-notes` | T-010 | ✅ merged |
| T-013 | [admin khóa học (frontend)](T-013-admin-course-frontend.md) | `task/T-013-admin-course-frontend` | T-012 | ✅ merged |
| T-015 | [admin duyệt đơn](T-015-payments-admin.md) | `task/T-015-payments-admin` | — | ✅ merged |
| T-016 | [admin danh sách ghi danh](T-016-admin-enrollments-list.md) | `task/T-016-admin-enrollments-list` | T-015 | ✅ merged |
| T-017 | [danh sách Full Test](T-017-full-test-lists.md) | `task/T-017-full-test-lists` | T-011 | ✅ merged |
| T-018 | [cài đặt nền tảng](T-018-platform-settings.md) | `task/T-018-platform-settings` | — | ✅ merged |
| T-019 | [admin khóa học + danh mục](T-019-catalog-admin-courses.md) | `task/T-019-catalog-admin-courses` | — | ✅ merged |
| T-020 | [admin thống kê + học viên](T-020-admin-stats.md) | `task/T-020-admin-stats` | T-018 | ✅ merged |
| T-021 | [từ vựng + flashcard](T-021-vocab-pages.md) | `task/T-021-vocab-pages` | — | ✅ merged |
| T-022 | [dọn 2 trang admin chi tiết](T-022-admin-detail-leftovers.md) | `task/T-022-admin-detail-leftovers` | — | ✅ merged |
| T-023 | [admin quiz + câu hỏi](T-023-admin-quiz-questions.md) | `task/T-023-admin-quiz-questions` | T-022 | ⏳ chờ |
