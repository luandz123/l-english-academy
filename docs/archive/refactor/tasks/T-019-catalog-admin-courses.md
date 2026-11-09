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
- [x] E2E `it.each` mọi route × 3 vai (401/403/2xx)
- [x] E2E: GET admin trả cả khóa/danh mục ẩn, đúng thứ tự; tạo khóa `is_free: true, price: 500000` → lưu `price 0`; PATCH `is_free: true` → `price 0`; `category_id` lạ → 404; PATCH body rỗng → 400; học viên tạo khóa → 403
- [x] Adapter test đúng method/URL/body, lỗi không ném
- [x] `grep -nE 'from\("(courses|course_categories)"\)' src/pages/admin/AdminCategories.tsx src/pages/admin/AdminCourses.tsx src/pages/admin/AdminCourseNew.tsx src/pages/admin/AdminCourseDetail.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(courses|course_categories)"\)' src/pages/admin/AdminCategories.tsx src/pages/admin/AdminCourses.tsx src/pages/admin/AdminCourseNew.tsx src/pages/admin/AdminCourseDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
```text
$ docker compose up -d postgres
 Container l-english-academy-postgres-1  Running

$ cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts (5.866 s)
PASS src/modules/learning/learning-admin.service.spec.ts (5.922 s)
PASS src/modules/learning/learning.service.spec.ts (5.96 s)

Test Suites: 21 passed, 21 total
Tests:       204 passed, 204 total
Snapshots:   0 total
Time:        8.083 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (34.347 s)
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts

Test Suites: 15 passed, 15 total
Tests:       203 passed, 203 total
Snapshots:   0 total
Time:        73.162 s
Ran all test suites.

> backend@0.0.1 build
> nest build

$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 9ms
 ✓ src/lib/api/admin.test.ts (3 tests) 49ms
 ✓ src/lib/api/client.test.ts (4 tests) 199ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 320ms
 ✓ src/lib/api/auth.test.ts (9 tests) 332ms
 ✓ src/lib/api/payments.test.ts (8 tests) 330ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 341ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 408ms
 ✓ src/lib/api/learning.test.ts (45 tests) 149ms
 ✓ src/test/part2Audio.test.ts (3 tests) 513ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 18ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 14ms

 Test Files  12 passed (12)
      Tests  139 passed (139)
   Start at  00:54:15
   Duration  53.09s (transform 5.84s, setup 62.62s, collect 16.94s, tests 2.68s, environment 279.80s, prepare 5.41s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 43.76s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ grep -nE 'from\("(courses|course_categories)"\)' src/pages/admin/AdminCategories.tsx src/pages/admin/AdminCourses.tsx src/pages/admin/AdminCourseNew.tsx src/pages/admin/AdminCourseDetail.tsx
(empty - exit code 1)

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
594b403 feat(catalog): add admin courses and categories API and migrate client callers
e27faa5 docs: record T-016 review PASS, update queue and ADM-015
355029e merge: T-016 admin enrollments list via API (review PASS)
 .../modules/catalog/catalog-admin.controller.ts    | 137 ++++++++
 .../modules/catalog/catalog-admin.service.spec.ts  | 177 ++++++++++
 .../src/modules/catalog/catalog-admin.service.ts   | 210 +++++++++++
 backend/src/modules/catalog/catalog.repository.ts  |  61 ++++
 .../src/modules/catalog/dto/admin-course.dto.ts    | 109 ++++++
 backend/src/modules/catalog/dto/index.ts           |   1 +
 backend/test/catalog-admin-courses.e2e-spec.ts     | 385 +++++++++++++++++++++
 src/lib/api/catalog.test.ts                        | 171 +++++++++
 src/lib/api/catalog.ts                             | 111 ++++++
 src/pages/admin/AdminCategories.tsx                |  64 ++--
 src/pages/admin/AdminCourseDetail.tsx              |  15 +-
 src/pages/admin/AdminCourseNew.tsx                 |  11 +-
 src/pages/admin/AdminCourses.tsx                   |  24 +-
 13 files changed, 1420 insertions(+), 56 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
- **Hành vi xóa danh mục đang có khóa**:
  Kiểm tra migration `supabase/migrations/20260521_add_course_categories.sql` (dòng 21):
  `ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES public.course_categories(id) ON DELETE SET NULL;`
  FK trong database có ràng buộc `ON DELETE SET NULL`. Do đó khi xóa danh mục thì PostgreSQL tự động gán `category_id = NULL` cho các khóa học thuộc danh mục đó và việc xóa danh mục trả về `204 No Content` bình thường.
- **`AdminCategories.tsx` - `toggleStatusMutation`**:
  Chuyển sang gọi `updateCategory(id, { name: cat.name, slug: cat.slug, icon: cat.icon || "BookOpen", display_order: cat.display_order ?? 0, is_active })` sử dụng endpoint `PUT /catalog/admin/categories/:id` đã định nghĩa.

## 9. Review (Claude điền)
**PASS** (Claude, 2026-10-29) — merge vào `refactor/nestjs-backend`. Review trên `e5e45f5`.
- 9 route đúng mục 4; server ép `price = 0` khi `is_free` ở cả tạo, sửa và PATCH (có e2e). 4 trang chỉ đổi nguồn dữ liệu; `getCourse` không lọc khóa ẩn nên admin vẫn sửa được khóa ẩn.
- Spec bỏ sót nút bật/tắt danh mục (`toggleStatusMutation`); Antigravity tự chuyển sang `PUT` với giá trị đang có trong cache — chấp nhận (cùng màn hình đã tải danh sách). `AdminCourseNew` lọc `is_active` ở client thay vì server — cùng kết quả.
- Gộp với T-018 không xung đột. Sau gộp: lint/typecheck sạch, unit 210/210, e2e 214/214, vitest 143/143, `check-ui-diff` OK, build OK.
