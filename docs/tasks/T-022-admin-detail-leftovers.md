# T-022: Dọn truy vấn Supabase còn sót ở `AdminStudentDetail` và `AdminCourseDetail`

> **Người làm**: Antigravity · **Module**: Learning + Auth (ngoại lệ luật 6: dọn nốt 2 trang đã chuyển dở, mỗi module chỉ thêm 1 route) · **Nhánh**: `task/T-022-admin-detail-leftovers`
> **Phụ thuộc**: không · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `backend/src/modules/learning/learning-admin.*` (T-009/T-016), `backend/src/modules/auth/auth-admin.controller.ts` + `profiles.controller.ts`, `src/lib/api/{learning,auth,catalog,fullTest}.ts`, file này.

## 1. Mục tiêu
Hai trang admin còn 4 truy vấn Supabase. 2 truy vấn dùng lại endpoint đã có, 2 truy vấn cần thêm 1 route mỗi module.

## 2. Phạm vi
**Được sửa/tạo**: thêm 1 route vào `learning-admin.controller.ts` (+ service/repository/mapper/DTO), thêm 1 route vào `auth-admin.controller.ts` (+ service/repository; **dùng lại** mapper profile của `GET /profiles/me`), test e2e thêm vào `learning-admin.e2e-spec.ts` và `auth.e2e-spec.ts` (hoặc file mới); `src/lib/api/learning.ts`, `src/lib/api/auth.ts` + `.test.ts` (thêm hàm); **chỉ** thân `queryFn` + `import` ở 2 trang.
**Cấm**: JSX, câu chữ, `queryKey`; truy vấn `materials`/storage ở `AdminCourseDetail` (P4 Media); mọi route cũ; logic `availableCourses`.

## 3. Thay thế
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-009 | `AdminCourseDetail.tsx:50-59` | `full_tests.select("id, title").eq(course_id, id)`; lỗi → throw | `listCourseFullTests(id)` (T-017) → `if (error) throw error; return (data ?? []).map((t) => ({ id: t.id, title: t.title }));` |
| ADM-009 | `AdminCourseDetail.tsx:173-195` | `enrollments.select("*").eq(course_id).order(enrolled_at desc)` + gắn `profiles { user_id, full_name }`; lỗi bỏ qua | `listCourseEnrollments(id)` → `return data ?? []` |
| ADM-003 | `AdminStudentDetail.tsx:48-55` | `profiles.select("*").eq(user_id).maybeSingle()`; lỗi bỏ qua | `getStudentProfile(userId!)` → `return data` (null khi không có) |
| ADM-003 | `AdminStudentDetail.tsx:84-90` | `courses.select("id, title").order("title")` (mọi khóa, kể cả ẩn) | `listAdminCourses()` (T-019) → `return (data ?? []).map((c) => ({ id: c.id, title: c.title })).sort((a, b) => a.title.localeCompare(b.title, "vi"));` |

## 4. Đặc tả
- `GET /api/v1/learning/admin/courses/:courseId/enrollments` (guard admin cấp class sẵn có) → `EnrollmentDto` (T-005) + `profiles: { user_id, full_name } | null`, order `enrolled_at` desc **nulls last**, `id` desc. Khóa không có → `[]`.
- `GET /api/v1/auth/admin/users/:userId/profile` (guard admin cấp class sẵn có, `ParseUUIDPipe`) → `{ profile: ProfileDto | null }` — **cùng shape** `GET /profiles/me` (mọi cột `profiles`). Không có → `{ profile: null }`.
- RLS cũ: `Admins view all profiles`, `Admins manage enrollments` → e2e 3 vai (401/403/200) cho 2 route mới.

## 5. Tiêu chí nghiệm thu
- [ ] E2E 2 route × 3 vai; enrollments đúng thứ tự, có `profiles.full_name`, khóa khác không lẫn; profile của user không có profile → `{ profile: null }`
- [ ] Adapter test (`listCourseEnrollments`, `getStudentProfile`): đúng URL, bóc `.profile`, lỗi không ném
- [ ] `grep -nE 'from\("(profiles|courses|enrollments|full_tests)"\)' src/pages/admin/AdminStudentDetail.tsx src/pages/admin/AdminCourseDetail.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(profiles|courses|enrollments|full_tests)"\)' src/pages/admin/AdminStudentDetail.tsx src/pages/admin/AdminCourseDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
