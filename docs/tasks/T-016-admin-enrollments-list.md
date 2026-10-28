# T-016: Danh sách ghi danh toàn hệ thống (admin) qua API

> **Người làm**: Antigravity · **Module**: Learning · **Nhánh**: `task/T-016-admin-enrollments-list`
> **Phụ thuộc**: **T-015 ✅ merged** (cùng sửa `AdminEnrollments.tsx`) · **Ước lượng**: 1 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` mục 4.3, file này.

## 1. Mục tiêu
Tab "Đăng ký khóa học" ở `/admin/enrollments` đọc mọi `enrollments` từ Supabase. Thêm 1 endpoint admin và chuyển query đó.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/learning/` (thêm route vào `learning-admin.controller.ts`, method service/repository/mapper, DTO), `backend/test/learning-admin.e2e-spec.ts` (thêm test), `src/lib/api/learning.ts` + `.test.ts` (thêm hàm), **chỉ** thân `queryFn` `admin-enrollments` + `import` ở `src/pages/admin/AdminEnrollments.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`; phần tính `remaining`/`status` trong `queryFn` (logic hiển thị — **giữ nguyên ở client**); module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-015 | `AdminEnrollments.tsx:63-100` | `enrollments.select("*, courses(title)").order(enrolled_at desc)` + `profiles.select("id, user_id, full_name").in(user_id)`; lỗi → `throw` | `const { data, error } = await listAllEnrollments(); if (error) throw error;` rồi **giữ nguyên** đoạn `map` tính `remaining`, `status`, nhưng `profiles` lấy sẵn từ server (bỏ truy vấn `profiles` thứ hai) |

## 4. Đặc tả
- `GET /api/v1/learning/admin/enrollments` (guard admin cấp class sẵn có) → `AdminEnrollmentListDto[]` order `enrolled_at` desc **nulls last**, `id` desc.
- `AdminEnrollmentListDto` = `AdminEnrollmentDto` (T-009, có `courses: { title } | null`) + `profiles: { id, user_id, full_name } | null` (join chỉ đọc `user → profile`).
- Trong `queryFn`: giữ `profiles` từ server thay cho `profiles?.find(...)` — đổi đúng biểu thức đó thành `e.profiles ?? null`; mọi dòng khác của `map` giữ nguyên.

## 5. Tiêu chí nghiệm thu
- [ ] E2E 3 vai; thứ tự; có `courses.title` và `profiles.full_name`; user không có profile → `profiles: null`
- [ ] `grep -n 'from("enrollments")\|from("profiles")' src/pages/admin/AdminEnrollments.tsx` rỗng (sau T-015 thì không còn `profiles` nào); `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("enrollments")\|from("profiles")' src/pages/admin/AdminEnrollments.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
