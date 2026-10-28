# Hàng đợi task cho Antigravity

Claude viết spec và cập nhật cột **Trạng thái**. Antigravity làm lần lượt từ trên xuống, **không chờ review**.

## Luật
1. Trước **mỗi** task: `git fetch && git checkout refactor/nestjs-backend && git pull`, rồi đọc lại file này.
2. Có dòng **🔁 TRẢ LẠI** → làm dòng đó trước: checkout lại nhánh của nó, `git merge origin/refactor/nestjs-backend`, sửa theo mục Review trong spec, push lại.
3. Nếu không: lấy dòng **⏳ chờ** đầu tiên mà mọi task ở cột *Phụ thuộc* đều **✅ merged**. Không có dòng nào đủ điều kiện → dừng và báo "hết việc".
4. Mỗi task: `git checkout -b <nhánh>` từ `refactor/nestjs-backend` vừa pull → làm đúng spec → chạy lệnh mục 6 **sau commit cuối** → dán output **nguyên văn** vào mục 7 → commit → `git push -u origin <nhánh>`.
5. Không tự sửa cột Trạng thái, `PARITY.md`, `PROGRESS.md`. Không merge vào `refactor/nestjs-backend`. Bị chặn → ghi mục 8 của spec, push, chuyển task kế.
6. Không đụng module **Payments**, **Gamification** (Claude đang làm).

## Trạng thái
Ký hiệu: ⏳ chờ · 🔨 đang làm · 🔍 chờ review · 🔁 TRẢ LẠI · ✅ merged

| Task | Spec | Nhánh | Phụ thuộc | Trạng thái |
|---|---|---|---|---|
| T-010 | [ghi danh admin](T-010-admin-student-enrollments.md) | `task/T-010-admin-student-enrollments` | — | 🔨 đang làm |
| T-011 | [kết quả quiz](T-011-quiz-results-lists.md) | `task/T-011-quiz-results-lists` | — | ⏳ chờ |
| T-012 | [admin chương (backend)](T-012-catalog-admin-modules.md) | `task/T-012-catalog-admin-modules` | — | ⏳ chờ |
| T-014 | [ghi chú học viên](T-014-admin-student-notes.md) | `task/T-014-admin-student-notes` | T-010 | ⏳ chờ |
| T-013 | [admin khóa học (frontend)](T-013-admin-course-frontend.md) | `task/T-013-admin-course-frontend` | T-012 | ⏳ chờ |
