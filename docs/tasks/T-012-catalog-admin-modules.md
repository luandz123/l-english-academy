# T-012: CatalogModule — admin quản lý chương (modules) (backend)

> **Người làm**: Antigravity · **Module**: Catalog · **Nhánh**: `task/T-012-catalog-admin-modules` (tách từ `refactor/nestjs-backend` mới nhất)
> **Phụ thuộc**: không · **Ước lượng**: 3 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` (làm theo cùng mẫu: controller admin riêng, guard cấp class, transaction), code `backend/src/modules/catalog/`, file này.

## 1. Mục tiêu
Endpoint admin thay lệnh **ghi** Supabase vào `modules` ở `ModuleManager.tsx`, và endpoint **đọc** cây chương cho admin thay `AdminCourseDetail.tsx:159-165`. Chỉ backend; frontend là T-013.

## 2. Phạm vi
**Được sửa/tạo** (chỉ `backend/src/modules/catalog/` và test): `catalog-admin.controller.ts`, `catalog-admin.service.ts` (mới); `catalog.repository.ts`, `catalog.mapper.ts` (thêm method); `catalog.module.ts`; `dto/`; `catalog-admin.service.spec.ts` (mới); `backend/test/catalog-admin.e2e-spec.ts` (mới).
**Cấm**: frontend; module khác (`auth` chỉ dùng guard đã export); `schema.prisma`, migration; route catalog cũ.

## 3. Hành vi cũ (nguồn sự thật)
| PARITY | Chỗ cũ | Lệnh Supabase |
|---|---|---|
| ADM-010 | `AdminCourseDetail.tsx:159-165` | `modules.select("*, lessons(*), quizzes(*)").eq("course_id", id).order("display_order")` |
| ADM-010 | `ModuleManager.tsx:79-95` | `modules.update({ is_free: !cũ })` |
| ADM-010 | `ModuleManager.tsx:160-170` | `modules.update({ is_published: cũ === false })` |
| ADM-010 | `ModuleManager.tsx:245-260` | kéo thả: lặp `modules.update({ display_order: i })` |
| ADM-010 | `ModuleManager.tsx:262-290` | "cấu hình 1 chạm": client chọn module Part 1 (theo tiêu đề) rồi lặp `update({ is_free: m.id === part1.id })` cho mọi module của khóa |
| ADM-010 | `ModuleManager.tsx:297-320` | lưu: sửa `{ title, description, is_free }`; tạo `{ course_id, title, description, is_free, display_order: max+1 hoặc 0 }` |
| ADM-010 | `ModuleManager.tsx:331-337` | `modules.delete()` theo `id` |

RLS → test e2e (3 vai: không token 401, học viên 403, admin 2xx): `Admins manage modules` (ALL). Đọc admin (mục 4) trả cả module/bài ẩn nên cũng chỉ admin.

## 4. Đặc tả
Route dưới `/api/v1/catalog/admin`, controller gắn `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(AppRole.admin)` cấp class, `@ApiTags('catalog-admin')`, `@ApiBearerAuth()`, `ParseIntPipe`.

| Method | Route | Body | Trả về |
|---|---|---|---|
| GET | `/courses/:courseId/modules` | — | `AdminModuleDto[]` |
| POST | `/courses/:courseId/modules` | `SaveModuleDto` | 201 `ModuleDto` |
| PUT | `/modules/:id` | `SaveModuleDto` | `ModuleDto` |
| PATCH | `/modules/:id` | `{ is_free?: boolean, is_published?: boolean }` (≥ 1) | `ModuleDto` |
| DELETE | `/modules/:id` | — | 204 |
| PUT | `/courses/:courseId/module-order` | `{ module_ids: number[] }` | 204 |
| PUT | `/courses/:courseId/free-module` | `{ module_id: number }` | 204 |

- `SaveModuleDto`: `title` (`@IsString`), `description` (`@IsOptional @IsString`, cho phép `null`), `is_free` (`@IsBoolean`). **Không** nhận `display_order`, `course_id`.
- `ModuleDto`: đủ cột `modules` snake_case. `AdminModuleDto` = `ModuleDto` + `lessons: LessonRow[]` (đủ cột `lessons`, URL đầy đủ) + `quizzes: QuizRow[]` (đủ cột `quizzes`). Lessons/quizzes sắp `display_order`, `id`; modules sắp `display_order`, `id`. Join chỉ đọc vào bảng của Learning/Assessment trong `CatalogRepository` (ghi chú lý do). Khóa không tồn tại → `[]`.
- **Server tính** `display_order` module mới = max trong khóa + 1 (rỗng → 0).
- `module-order`: một `$transaction`; id trùng hoặc không thuộc khóa → 400 `MODULE_ORDER_INVALID`, không ghi.
- `free-module`: một `$transaction` đặt `is_free = (id === module_id)` cho **mọi** module của khóa. `module_id` không thuộc khóa → 400 `MODULE_NOT_IN_COURSE`. Việc chọn module nào là Part 1 vẫn ở client (logic giao diện, không đổi).
- 404: khóa không tồn tại khi POST/`module-order`/`free-module` → `COURSE_NOT_FOUND`; PUT/PATCH module không tồn tại → `MODULE_NOT_FOUND`. DELETE không tồn tại → 204. PATCH body rỗng → 400 `VALIDATION_FAILED`.
- Xóa module: FK cascade xóa bài và quiz của module (như DB cũ) — ghi rõ trong Swagger `description`.

## 5. Tiêu chí nghiệm thu
- [ ] 7 route đúng mục 4; e2e `it.each` mọi route × 3 vai
- [ ] E2E: GET admin trả cả module/bài ẩn kèm `lessons`, `quizzes` đúng thứ tự; tạo module → `display_order` max+1; body có `display_order` → 400; `module-order` đảo 3 module đúng, id lạ → 400 không đổi gì; `free-module` → đúng 1 module free; xóa module → bài + quiz của nó mất; PATCH ẩn module → curriculum học viên (T-005) không còn module đó
- [ ] Unit service: các nhánh 404/400, tính `display_order`
- [ ] Swagger đủ `@ApiOperation`, response type, `@ApiForbiddenResponse`

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md`.

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
