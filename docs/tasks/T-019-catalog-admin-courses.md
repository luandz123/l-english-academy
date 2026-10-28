# T-019: Admin quản lý khóa học và danh mục qua API (backend + frontend)

> **Người làm**: Antigravity · **Module**: Catalog · **Nhánh**: `task/T-019-catalog-admin-courses`
> **Phụ thuộc**: không · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `T-012-catalog-admin-modules.md` + code `backend/src/modules/catalog/catalog-admin.*` (làm **theo đúng mẫu**, thêm route vào `catalog-admin.controller.ts`), `src/lib/api/catalog.ts`, file này.

## 1. Mục tiêu
4 trang admin đọc/ghi `courses`, `course_categories` thẳng Supabase. Chuyển sang API.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/catalog/**` (thêm method/route/DTO, không đổi route cũ), `backend/test/catalog-admin-courses.e2e-spec.ts`; `src/lib/api/catalog.ts` + `.test.ts` (thêm hàm); **chỉ** thân `queryFn`/`mutationFn` + `import` ở các chỗ mục 3.
**Cấm**: JSX, câu chữ, `queryKey`, `onSuccess`/`onError`; upload ảnh bìa (`storage`, P4); các query khác trong `AdminCourseDetail.tsx` (full tests, enrollments, materials).

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Thay bằng |
|---|---|---|---|
| ADM-007 | `AdminCategories.tsx:115-125` | `course_categories.select("*").order(display_order).order(id)` | `listAdminCategories()`; lỗi → `throw` |
| ADM-007 | `AdminCategories.tsx:129-135` | `courses.select("id, category_id, is_active")` | `listAdminCourses()` (dư cột không sao — `getCategoryCourseStats` chỉ đọc 2 cột) |
| ADM-007 | `AdminCategories.tsx:141-160` | sửa `{ name, slug, icon \|\| "BookOpen", display_order ?? 0, is_active ?? true }`; tạo như vậy với `display_order ?? (categories.length + 1)` | `updateCategory(id, body)` / `createCategory(body)` — **giữ** biểu thức mặc định ở client (đây là giá trị giao diện, không phải quyền/giá) |
| ADM-007 | `AdminCategories.tsx:186` | `delete` theo `id` | `deleteCategory(id)` |
| ADM-008 | `AdminCourses.tsx:47-58` | `courses.select("*").order(display_order asc).order(id desc)` | `listAdminCourses()` |
| ADM-008 | `AdminCourses.tsx:60-70`, `AdminCourseNew.tsx:35-45`, `AdminCourseDetail.tsx:80-85` | `course_categories.select("*").order(display_order)` | `listAdminCategories()` |
| ADM-008 | `AdminCourses.tsx:78` / `:93` / `:108` | xóa; `update({ is_active })`; `update({ is_free })` | `deleteCourse(id)`; `patchCourse(id, { is_active })`; `patchCourse(id, { is_free })` |
| ADM-009 | `AdminCourseNew.tsx:83-97` | `insert({ title, subtitle, description, course_type, category_id, instructor, price: is_free ? 0 : price, is_free, duration_months, is_active, display_order, thumbnail_url })` | `createCourse(body)`; giữ dòng `if (!form.category_id) throw …` |
| ADM-009 | `AdminCourseDetail.tsx:58-62` | `courses.select("*").eq("id", id).maybeSingle()` | `getCourse(id)` (đã có từ T-002) |
| ADM-009 | `AdminCourseDetail.tsx:131-148` | `update({ …như trên })` | `updateCourse(id, body)` |

## 4. Đặc tả (thêm vào controller `catalog/admin` sẵn có — guard admin cấp class)
| Method | Route | Body | Trả về |
|---|---|---|---|
| GET | `/courses` | — | `CourseDto[]` (mọi khóa, kể cả ẩn) order `display_order` asc, `id` desc |
| POST | `/courses` | `SaveCourseDto` | 201 `CourseDto` |
| PUT | `/courses/:id` | `SaveCourseDto` | `CourseDto` |
| PATCH | `/courses/:id` | `{ is_active?: boolean, is_free?: boolean }` (≥ 1) | `CourseDto` |
| DELETE | `/courses/:id` | — | 204 |
| GET | `/categories` | — | `CategoryDto[]` (kể cả ẩn) order `display_order`, `id` |
| POST | `/categories` | `SaveCategoryDto` | 201 `CategoryDto` |
| PUT | `/categories/:id` | `SaveCategoryDto` | `CategoryDto` |
| DELETE | `/categories/:id` | — | 204 |

- `CourseDto`/`CategoryDto`: dùng lại DTO + mapper của T-001 (cùng shape `getCourse`/`listCategories`).
- `SaveCourseDto`: `title` (string), `subtitle?`, `description?`, `instructor?`, `thumbnail_url?` (string|null), `course_type` (`@IsIn(COURSE_TYPES)` sẵn có), `category_id` (int|null), `price` (int ≥ 0), `is_free`, `is_active` (bool), `duration_months` (int ≥ 0|null), `display_order` (int).
- **Server ép giá**: `is_free = true` → lưu `price = 0` bất kể client gửi gì (giữ đúng `price: is_free ? 0 : price`, luật 5). `PATCH { is_free: true }` cũng đặt `price = 0`.
- `SaveCategoryDto`: `name`, `slug` (string), `icon` (string), `display_order` (int), `is_active` (bool).
- 404: PUT/PATCH khóa/danh mục không tồn tại → `COURSE_NOT_FOUND` / `CATEGORY_NOT_FOUND`; `category_id` không tồn tại → 404 `CATEGORY_NOT_FOUND`. DELETE không tồn tại → 204. `slug` trùng → bắt `P2002` → 409 `CATEGORY_SLUG_EXISTS` (nếu có unique; không có thì bỏ qua).
- Xóa khóa: FK cascade như DB cũ (modules, lessons, enrollments, full tests…) — ghi rõ trong Swagger `description`. Xóa danh mục đang có khóa: theo FK hiện có (kiểm schema, ghi vào mục 8 hành vi thực tế).

## 5. Tiêu chí nghiệm thu
- [ ] E2E `it.each` mọi route × 3 vai (401/403/2xx)
- [ ] E2E: GET admin trả cả khóa/danh mục ẩn, đúng thứ tự; tạo khóa `is_free: true, price: 500000` → lưu `price 0`; PATCH `is_free: true` → `price 0`; `category_id` lạ → 404; PATCH body rỗng → 400; học viên tạo khóa → 403
- [ ] Adapter test đúng method/URL/body, lỗi không ném
- [ ] `grep -nE 'from\("(courses|course_categories)"\)' src/pages/admin/AdminCategories.tsx src/pages/admin/AdminCourses.tsx src/pages/admin/AdminCourseNew.tsx src/pages/admin/AdminCourseDetail.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(courses|course_categories)"\)' src/pages/admin/AdminCategories.tsx src/pages/admin/AdminCourses.tsx src/pages/admin/AdminCourseNew.tsx src/pages/admin/AdminCourseDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
