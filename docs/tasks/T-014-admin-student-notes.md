# T-014: AdminModule — ghi chú học viên (backend + frontend)

> **Người làm**: Antigravity · **Module**: Admin (module 7, tạo mới) · **Nhánh**: `task/T-014-admin-student-notes`
> **Phụ thuộc**: **T-010 đã ✅ merged** trong `QUEUE.md` (cùng sửa `AdminStudentDetail.tsx`) · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` (mẫu guard admin), file này.

## 1. Mục tiêu
Tạo `AdminModule` (`backend/src/modules/admin/`) với 2 endpoint ghi chú học viên, chuyển 2 chỗ ở `AdminStudentDetail.tsx`.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/admin/**` (mới: module, controller, service, repository, mapper, dto, spec); `backend/src/app.module.ts` (chỉ thêm `AdminModule` vào `imports`); `backend/test/admin-notes.e2e-spec.ts`; `src/lib/api/admin.ts` + `.test.ts` (mới); **chỉ** thân `queryFn` `admin-student-notes`, thân `mutationFn` `addNoteMutation` và `import` trong `src/pages/admin/AdminStudentDetail.tsx`.
**Cấm**: JSX, `className`, câu chữ, `queryKey`, `onSuccess`; các query khác của trang; module khác.

## 3. Hành vi cũ
| PARITY | Chỗ cũ | Lệnh Supabase |
|---|---|---|
| ADM-004 | `AdminStudentDetail.tsx:72-83` | `admin_student_notes.select("*").eq("student_id", userId).order("created_at", desc)` |
| ADM-004 | `AdminStudentDetail.tsx:95-107` | `insert({ student_id, admin_id: user.id, content: noteText })`; lỗi → `throw` (không có `onError` → không toast) |

RLS `Admins manage student notes` (ALL) → e2e 3 vai (401/403/2xx). Giao diện chỉ đọc + thêm → **chỉ làm 2 thao tác này** (luật 3).

## 4. Đặc tả
Route dưới `/api/v1/admin`, guard `JwtAuthGuard` + `RolesGuard` + `@Roles(AppRole.admin)` cấp class, `@ApiTags('admin')`, `ParseUUIDPipe` cho `userId`.
| Method | Route | Body | Trả về |
|---|---|---|---|
| GET | `/users/:userId/notes` | — | `AdminNoteDto[]` order `created_at` desc, `id` desc |
| POST | `/users/:userId/notes` | `{ content: string }` (`@IsString`) | 201 `AdminNoteDto` |

- `AdminNoteDto`: `id, admin_id, student_id, content, created_at` (ISO). `admin_id` **lấy từ token**, client không gửi (body có `admin_id` → 400).
- Nội dung: lưu nguyên văn như cũ (cũ không trim, giao diện chặn rỗng) — **không** thêm trim/kiểm rỗng ngoài `@IsString`.
- Học viên không tồn tại → bắt Prisma `P2003` → 404 `USER_NOT_FOUND`.

## 5. Tiêu chí nghiệm thu
- [ ] 2 route + e2e 3 vai; `admin_id` = admin gọi API; body có `admin_id` → 400; thứ tự mới nhất trước; user lạ → 404
- [ ] Adapter `listStudentNotes(userId)`, `addStudentNote(userId, content)` đúng URL/body, lỗi không ném; thân `mutationFn` mới: `const { error } = await addStudentNote(userId!, noteText); if (error) throw error;`
- [ ] `grep -n 'admin_student_notes' src/pages/admin/AdminStudentDetail.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'admin_student_notes' src/pages/admin/AdminStudentDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md`.

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
