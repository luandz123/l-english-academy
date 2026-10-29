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
- [x] 7 route đúng mục 4; e2e `it.each` mọi route × 3 vai
- [x] E2E: GET admin trả cả module/bài ẩn kèm `lessons`, `quizzes` đúng thứ tự; tạo module → `display_order` max+1; body có `display_order` → 400; `module-order` đảo 3 module đúng, id lạ → 400 không đổi gì; `free-module` → đúng 1 module free; xóa module → bài + quiz của nó mất; PATCH ẩn module → curriculum học viên (T-005) không còn module đó
- [x] Unit service: các nhánh 404/400, tính `display_order`
- [x] Swagger đủ `@ApiOperation`, response type, `@ApiForbiddenResponse`

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md`.

## 7. Kết quả (người làm điền)
- **DTO & Mapper (`backend/src/modules/catalog/dto/admin-module.dto.ts`, `catalog.mapper.ts`)**: Thêm `ModuleDto`, `AdminModuleLessonDto`, `AdminModuleQuizDto`, `AdminModuleDto`, `SaveModuleDto`, `PatchModuleDto`, `ReorderModulesDto`, `SetFreeModuleDto` và các phương thức map sang snake_case.
- **Repository (`backend/src/modules/catalog/catalog.repository.ts`)**: Thêm `courseExists`, `findAdminModulesByCourse` (join chỉ đọc `lessons` và `quizzes` để tránh N+1), `findModuleById`, `nextModuleDisplayOrder`, `createModule`, `updateModule`, `deleteModule`, `findModuleIdsByCourse`, `reorderModules` (`$transaction`), `setFreeModuleForCourse` (`$transaction`).
- **Service & Controller (`catalog-admin.service.ts`, `catalog-admin.controller.ts`, `catalog.module.ts`)**: Thêm 7 endpoint dưới `/api/v1/catalog/admin` bảo vệ bởi `JwtAuthGuard` + `RolesGuard` (`@Roles(AppRole.admin)`), tự tính `display_order` ở server và kiểm tra đầy đủ các mã lỗi `COURSE_NOT_FOUND`, `MODULE_NOT_FOUND`, `MODULE_ORDER_INVALID`, `MODULE_NOT_IN_COURSE`, `VALIDATION_FAILED`.
- **Test**: Thêm unit test `backend/src/modules/catalog/catalog-admin.service.spec.ts` và e2e test `backend/test/catalog-admin.e2e-spec.ts`.

### Output nguyên văn các lệnh ở mục 6

```text
 Container l-english-academy-postgres-1  Running

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts (10.823 s)
PASS src/modules/learning/learning.mapper.spec.ts (10.838 s)
PASS src/common/filters/all-exceptions.filter.spec.ts (11.231 s)
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts (12.936 s)
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts (13.025 s)
PASS src/modules/catalog/catalog-admin.service.spec.ts (13.622 s)
PASS src/modules/payments/payments.service.spec.ts (13.936 s)
PASS src/modules/learning/learning-quiz-access.spec.ts (13.968 s)
PASS src/modules/catalog/catalog.service.spec.ts (14.182 s)
PASS src/modules/assessment/assessment.service.spec.ts (14.213 s)
PASS src/modules/learning/learning-admin.service.spec.ts (14.449 s)
PASS src/modules/learning/learning.service.spec.ts (14.604 s)

Test Suites: 20 passed, 20 total
Tests:       184 passed, 184 total
Snapshots:   0 total
Time:        18.185 s, estimated 20 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:15824) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/assessment-full-test.e2e-spec.ts (8.774 s)
PASS test/catalog-admin.e2e-spec.ts
PASS test/payments.e2e-spec.ts
[Nest] 15824  - 10/28/2026, 10:33:28 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
    at Object.googleNotConfigured (C:\Users\lenovo\l-english-academy\backend\src\modules\auth\auth-errors.ts:62:5)
    at GoogleAuthGuard.canActivate (C:\Users\lenovo\l-english-academy\backend\src\modules\auth\google\google-auth.guard.ts:41:24)
    at GuardsConsumer.tryActivate (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\guards\guards-consumer.js:15:34)
    at canActivateFn (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\router\router-execution-context.js:175:59)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\router\router-execution-context.js:61:37
    at C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\router\router-proxy.js:9:23
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:117:3)
    at handle (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:295:15
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:582:12)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:151:14)
    at handler (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\middleware-module.js:191:24)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:117:3)
    at handle (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:295:15
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:600:14)
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:610:14)
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:664:3)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:151:14)
    at AsyncLocalStorage.run (node:internal/async_local_storage/async_hooks:91:14)
    at bindLoggerMiddleware (C:\Users\lenovo\l-english-academy\backend\node_modules\nestjs-pino\src\LoggerModule.ts:276:13)
    at Object.use (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\utils.js:121:24)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\router\router-proxy.js:9:23
    at handler (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\middleware-module.js:194:20)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:117:3)
    at handle (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:295:15
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:600:14)
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:610:14)
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:664:3)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:151:14)
    at handler (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\middleware-module.js:191:24)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:117:3)
    at handle (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:295:15
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:600:14)
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:610:14)
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:664:3)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:151:14)
    at loggingMiddleware (C:\Users\lenovo\l-english-academy\backend\node_modules\pino-http\logger.js:206:7)
    at result (C:\Users\lenovo\l-english-academy\backend\node_modules\pino-http\logger.js:90:12)
    at Object.use (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\utils.js:121:24)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\router\router-proxy.js:9:23
    at handler (C:\Users\lenovo\l-english-academy\backend\node_modules\@nestjs\core\middleware\middleware-module.js:194:20)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\route.js:117:3)
    at handle (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:295:15
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:600:14)
    at param (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:610:14)
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:664:3)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at read (C:\Users\lenovo\l-english-academy\backend\node_modules\body-parser\lib\read.js:59:5)
    at urlencodedParser (C:\Users\lenovo\l-english-academy\backend\node_modules\body-parser\lib\types\urlencoded.js:51:5)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at trimPrefix (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:342:13)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:297:9
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:582:12)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at read (C:\Users\lenovo\l-english-academy\backend\node_modules\body-parser\lib\read.js:59:5)
    at jsonParser (C:\Users\lenovo\l-english-academy\backend\node_modules\body-parser\lib\types\json.js:60:5)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at trimPrefix (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:342:13)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:297:9
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:582:12)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at cors (C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:188:7)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:224:17
    at originCallback (C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:214:15)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:219:13
    at optionsCallback (C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:199:9)
    at corsMiddleware (C:\Users\lenovo\l-english-academy\backend\node_modules\cors\lib\index.js:204:7)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at trimPrefix (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:342:13)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:297:9
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:582:12)
    at next (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:291:5)
    at cookieParser (C:\Users\lenovo\l-english-academy\backend\node_modules\cookie-parser\index.js:57:14)
    at Layer.handleRequest (C:\Users\lenovo\l-english-academy\backend\node_modules\router\lib\layer.js:152:17)
    at trimPrefix (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:342:13)
    at C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:297:9
    at processParams (C:\Users\lenovo\l-english-academy\backend\node_modules\router\index.js:582:12)
PASS test/auth.e2e-spec.ts (14.347 s)
PASS test/learning-admin.e2e-spec.ts (5.938 s)
PASS test/assessment-quiz.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts (5.397 s)
PASS test/learning-access.e2e-spec.ts (5.008 s)
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 10 passed, 10 total
Tests:       159 passed, 159 total
Snapshots:   0 total
Time:        57.442 s, estimated 65 s
Ran all test suites.

> backend@0.0.1 build
> nest build

c44f6ad feat(catalog): add admin module management endpoints (T-012)
f437eff ci: skip Vercel deploys that do not change the frontend
af4797c feat(assessment): server-side Full Test grading with ETS conversion (P3)
 .../modules/catalog/catalog-admin.controller.ts    | 161 +++++++++
 .../modules/catalog/catalog-admin.service.spec.ts  | 198 +++++++++++
 .../src/modules/catalog/catalog-admin.service.ts   | 148 ++++++++
 backend/src/modules/catalog/catalog.mapper.ts      |  69 +++-
 backend/src/modules/catalog/catalog.module.ts      |  13 +-
 backend/src/modules/catalog/catalog.repository.ts  | 126 ++++++-
 .../src/modules/catalog/dto/admin-module.dto.ts    | 154 +++++++++
 backend/src/modules/catalog/dto/index.ts           |   1 +
 backend/test/catalog-admin.e2e-spec.ts             | 374 +++++++++++++++++++++
 docs/tasks/T-012-catalog-admin-modules.md          |  13 +-
 10 files changed, 1248 insertions(+), 9 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
**PASS** (Claude, 2026-10-28) — merge vào `refactor/nestjs-backend`. Review trên `b57c0d1`.
- 7 route đúng mục 4, guard admin cấp class; `display_order` server tính; `module-order` và `free-module` trong transaction, kiểm id thuộc khóa; join chỉ đọc có ghi chú. Output nguyên văn đủ.
- Chạy lại sau gộp: lint/typecheck sạch, unit 185/185, e2e 164/164, build OK.
- Ghi nhận (không chặn): `CatalogModule` giờ import `AuthModule` để dùng guard — đúng cách, không vòng import.
