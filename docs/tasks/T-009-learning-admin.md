# T-009: LearningModule — admin quản lý bài học, popup luyện tập, ghi danh (backend)

> **Người làm**: Antigravity · **Module**: Learning · **Nhánh**: `task/T-009-learning-admin` (tách từ `refactor/nestjs-backend` **sau khi `git pull`**)
> **Phụ thuộc**: T-005..T-008 đã merge · **Ước lượng**: 4 giờ
> Đọc trước: `AGENTS.md`, `T-006-learning-user-data.md`, code `backend/src/modules/learning/` và `backend/src/modules/auth/auth-admin.controller.ts` (mẫu guard admin), file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-009-learning-admin
```

## 1. Mục tiêu
Thêm endpoint admin thay các lệnh **ghi** Supabase vào `lessons`, `lesson_practices`, `enrollments` ở trang admin. **Chỉ backend**; chuyển frontend là task sau (xem mục 9).

## 2. Phạm vi
**Được sửa/tạo** (chỉ trong `backend/src/modules/learning/` và test)
- `learning-admin.controller.ts` (mới), `learning-admin.service.ts` (mới) — tách khỏi controller/service học viên cho dễ đọc
- `learning.repository.ts`, `learning.mapper.ts` — **thêm** method, không đổi method cũ
- `learning.module.ts` — đăng ký controller/service mới
- `dto/` — DTO mới
- `learning-admin.service.spec.ts` (mới), `learning.mapper.spec.ts` — thêm test
- `backend/test/learning-admin.e2e-spec.ts` (mới)

**Cấm sửa**: frontend; module `auth`, `catalog` (chỉ **dùng** `CatalogService.findCourseById`, `JwtAuthGuard`, `RolesGuard`, `Roles` đã export); `schema.prisma`, migration; `lesson-access.ts`; endpoint của T-005/T-006.

**Ngoài phạm vi** (không làm, ghi rõ ở mục 7):
- `modules` (ModuleManager) — thuộc Catalog
- upload PDF/tài liệu (`storage`, bảng `materials`) — P4 Media
- tạo/sửa quiz độc lập, câu hỏi — P3 Assessment (trừ quiz rỗng tự tạo kèm bài, mục 4.1)
- đọc danh sách học viên của khóa (`AdminCourseDetail.tsx:167-187`, cần `profiles`) và thống kê ghi danh (`AdminStudents`, `AdminDashboard`, `AdminReports`) — P5 Admin

## 3. Hành vi cũ (nguồn sự thật)
| PARITY | Chỗ cũ | Lệnh Supabase |
|---|---|---|
| ADM-010 | `LessonManager.tsx:105` | `lessons.update({ is_free: !cũ })` theo `id` |
| ADM-010 | `LessonManager.tsx:125` | `lessons.update({ is_published: cũ === false })` theo `id` |
| ADM-010 | `LessonManager.tsx:200-215` | kéo thả: lặp `lessons.update({ display_order: i })` lần lượt từng bài |
| ADM-010 | `LessonManager.tsx:244-275` | lưu bài: nếu `lesson_type ∈ {exam, practice, dictation}` và bài chưa có `quiz_id` → `quizzes.insert({ title: "Quiz - " + title, total_questions: 0, module_id, display_order: max(quiz của module)+1 hoặc 0 })` rồi gán `quiz_id`; payload `{ title, lesson_type, video_url, pdf_url, duration_seconds, module_id, display_order }` (`video_url`/`pdf_url` chỉ giữ khi `lesson_type = "video"`, còn lại `null`; bài mới `display_order = max(bài của module)+1` hoặc 0; sửa thì giữ `display_order`) |
| ADM-010 | `LessonManager.tsx:286-290` | `lessons.delete()` theo `id` |
| LRN-006 (admin) | `LessonPracticeManager.tsx:49-77` | lưu: `{ lesson_id, quiz_id \| null, trigger_at_seconds = phút*60 + giây, title, display_order: sửa giữ cũ, mới = số practice hiện có }`; xóa theo `id`. **Lỗi bị bỏ qua** (luôn toast thành công) |
| ADM-005 | `AdminStudentDetail.tsx:50-56` | đọc `enrollments.select("*, courses(title)")` theo `user_id` |
| ADM-005 | `AdminStudentDetail.tsx:109-120` | mở khóa: `enrollments.insert({ user_id, course_id, expires_at })`, `expires_at = now + N ngày` (N ∈ 7, 30, 90, 180, 365) hoặc `null` (vĩnh viễn) — **client tự tính** |
| ADM-005 | `AdminStudentDetail.tsx:130-134` | `enrollments.delete()` theo `id` |

**Policy RLS → test e2e (mỗi dòng ≥ 1 test, với 3 vai: không token 401, học viên 403, admin 2xx)**
- `Admins manage lessons` (ALL, `has_role(admin)`)
- `Admins manage lesson practices` (ALL)
- `Admins manage enrollments` (ALL)
- `Users enroll themselves` (INSERT) — **không** mở endpoint (đã đóng ở T-005, D-02); e2e: học viên gọi POST ghi danh admin → 403

## 4. Đặc tả
Tất cả route dưới `/api/v1/learning/admin`, controller gắn `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(AppRole.admin)` ở **cấp class**, `@ApiTags('learning-admin')`, `@ApiBearerAuth()`. Id trong path dùng `ParseIntPipe` (riêng `userId` dùng `ParseUUIDPipe`).

### 4.1 Bài học
| Method | Route | Body | Trả về |
|---|---|---|---|
| POST | `/modules/:moduleId/lessons` | `SaveLessonDto` | 201 `LessonDto` (shape T-005, URL đầy đủ) |
| PUT | `/lessons/:id` | `SaveLessonDto` | `LessonDto` |
| PATCH | `/lessons/:id` | `{ is_free?: boolean, is_published?: boolean }` (≥ 1 trường) | `LessonDto` |
| DELETE | `/lessons/:id` | — | 204 |
| PUT | `/modules/:moduleId/lesson-order` | `{ lesson_ids: number[] }` | 204 |

`SaveLessonDto`: `title` (`@IsString`), `lesson_type` (`@IsIn(['video','practice','exam','dictation'])`), `video_url?`, `pdf_url?` (`@IsOptional @IsString`), `duration_seconds` (`@IsInt @Min(0)`). **Không** nhận `display_order`, `module_id`, `quiz_id`.

Quy tắc:
- **Server tính**: `display_order` bài mới = max trong module + 1 (module rỗng → 0); sửa thì giữ nguyên. `video_url`/`pdf_url` = giá trị gửi lên nếu `lesson_type = 'video'` và chuỗi khác rỗng, ngược lại `null`.
- Quiz tự tạo: `lesson_type ∈ {exam, practice, dictation}` và bài (mới, hoặc bài đang sửa) chưa có `quiz_id` → tạo quiz `{ title: "Quiz - " + title, totalQuestions: 0, moduleId, displayOrder: max quiz trong module + 1 hoặc 0 }` và gán `quiz_id`. Tạo quiz + ghi bài trong **một `$transaction`** (cũ không nguyên tử; đây là sửa có chủ đích, không đổi kết quả). Bảng `quizzes` thuộc Assessment (P3) — tạm ghi qua `LearningRepository`, comment `// TODO(P3): chuyển sang AssessmentService`.
- `moduleId` không tồn tại → 404 `MODULE_NOT_FOUND`. `PUT/PATCH` bài không tồn tại → 404 `LESSON_NOT_FOUND`. `DELETE` không tồn tại → vẫn 204 (cũ không báo lỗi).
- `PATCH` body rỗng → 400 `VALIDATION_FAILED`.
- `lesson-order`: một `$transaction` gán `display_order = vị trí trong mảng`. Mảng có id trùng, hoặc id không thuộc module → 400 `LESSON_ORDER_INVALID`, không ghi gì.
- Xóa bài: FK trong DB tự cascade (`lesson_practices`, tiến độ, yêu thích, ghi chú, `vocab_quizzes`) và `SET NULL` (`materials.lesson_id`); quiz tự tạo **không** bị xóa (giữ như cũ).

### 4.2 Popup luyện tập
| Method | Route | Body | Trả về |
|---|---|---|---|
| POST | `/lessons/:lessonId/practices` | `SavePracticeDto` | 201 `PracticeDto` (shape T-006) |
| PUT | `/practices/:id` | `SavePracticeDto` | `PracticeDto` |
| DELETE | `/practices/:id` | — | 204 |

`SavePracticeDto`: `quiz_id` (`@IsOptional @IsInt`, cho phép `null`), `trigger_at_seconds` (`@IsInt @Min(0)`), `title` (`@IsString`). Client đổi phút/giây sang giây (không phải giá trị nhạy cảm).
- **Server tính** `display_order` bài mới = số practice hiện có của bài; sửa giữ nguyên.
- Bài không tồn tại → 404 `LESSON_NOT_FOUND`; practice không tồn tại (PUT) → 404 `PRACTICE_NOT_FOUND`; `quiz_id` không tồn tại → 404 `QUIZ_NOT_FOUND`. DELETE không tồn tại → 204.
- Admin đọc danh sách: dùng lại `GET /learning/lessons/:lessonId/practices` của T-006 (cùng shape), không thêm route đọc.

### 4.3 Ghi danh
| Method | Route | Body | Trả về |
|---|---|---|---|
| GET | `/users/:userId/enrollments` | — | `AdminEnrollmentDto[]` order `id` asc |
| POST | `/users/:userId/enrollments` | `{ course_id: number, expires_in_days: number \| null }` | 201 `AdminEnrollmentDto` |
| DELETE | `/enrollments/:id` | — | 204 |

- `AdminEnrollmentDto` = `EnrollmentDto` (T-005) + `courses: { title } | null` — tên khóa `courses` giữ như PostgREST. Đọc `title` bằng `include: { course: { select: { title: true } } }` trong repository Learning (join chỉ đọc vào bảng của Catalog; ghi chú lý do trong code).
- **Server tính** `expires_at = now() + expires_in_days ngày` hoặc `null` khi `expires_in_days = null`. `expires_in_days`: `@IsOptional @IsInt @Min(1) @Max(3650)`; client **không** gửi `expires_at` (luật 5 — đây là quyền truy cập). Body có `expires_at` → 400 (đã có `forbidNonWhitelisted`).
- Khóa không tồn tại → 404 `COURSE_NOT_FOUND` (qua `CatalogService.findCourseById`). User không tồn tại → bắt Prisma `P2003` → 404 `USER_NOT_FOUND`. Đã có ghi danh cùng `(user, course)` → bắt `P2002` → 409 `ENROLLMENT_EXISTS`.
- DELETE không tồn tại → 204.

## 5. Tiêu chí nghiệm thu
- [x] Đủ 11 route mục 4; guard admin ở cấp class
- [x] E2E phân quyền: **mọi** route — không token 401, token học viên 403, admin 2xx (dùng `it.each` theo bảng route)
- [x] E2E bài: tạo bài vào module rỗng → `display_order 0`, bài thứ hai → 1; `lesson_type: 'exam'` → có `quiz_id`, quiz `"Quiz - <title>"`, `total_questions 0`; `lesson_type: 'practice'` với `video_url` → lưu `video_url = null`; sửa bài `video` có sẵn thành `dictation` → tạo quiz; sửa bài đã có quiz → không tạo quiz mới; body có `display_order` → 400
- [x] E2E transaction: giả lập lỗi ghi bài sau khi tạo quiz (unit service với repository mock là đủ) → không còn quiz mồ côi
- [x] E2E `lesson-order`: đảo 3 bài → `display_order` 0,1,2 đúng thứ tự gửi; id trùng hoặc id module khác → 400 và `display_order` không đổi
- [x] E2E PATCH: bật/tắt `is_free`, `is_published`; body rỗng → 400; bài ẩn không còn trong curriculum của học viên (gọi lại endpoint T-005)
- [x] E2E xóa bài: practice/tiến độ của bài biến mất, `materials.lesson_id` thành `null`; xóa lần 2 → 204
- [x] E2E practice: mới → `display_order` = số practice cũ; sửa giữ `display_order`; `quiz_id: null` hợp lệ; `quiz_id` không tồn tại → 404
- [x] E2E ghi danh: `expires_in_days: 30` → `expires_at` cách now 30 ngày (sai số ≤ 1 phút); `null` → `expires_at null`; trùng → 409 `ENROLLMENT_EXISTS`; khóa/user không tồn tại → 404; body có `expires_at` → 400; GET trả `courses.title`; học viên vừa được ghi danh học được bài trả phí (gọi curriculum T-005)
- [x] Unit service: các nhánh 404/409/400, tính `display_order`, quy tắc `video_url`, quy tắc tạo quiz
- [x] Swagger: mọi route có `@ApiOperation`, response type, `@ApiForbiddenResponse`
- [x] Không đụng file ngoài phạm vi

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md` — Claude cập nhật khi review.

## 7. Kết quả (người làm điền)
- Đã hoàn thành toàn bộ 11 endpoint admin dưới `/api/v1/learning/admin` trong `LearningAdminController` và `LearningAdminService`, gắn `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(AppRole.admin)` ở cấp class, `@ApiTags('learning-admin')`, `@ApiBearerAuth()`, cùng đầy đủ `@ApiOperation`, response decorator và `@ApiForbiddenResponse`:
  - **4.1 Bài học (`lessons` — ADM-010)**:
    - `POST /api/v1/learning/admin/modules/:moduleId/lessons`: tạo bài học mới, server tự tính `display_order = max(bài trong module) + 1` (module rỗng → `0`); chỉ giữ `video_url`/`pdf_url` khi `lesson_type = 'video'` và chuỗi khác rỗng; tự động tạo quiz rỗng (`"Quiz - <title>"`, `total_questions = 0`, `display_order = max(quiz trong module) + 1` hoặc `0`) trong cùng một `$transaction` khi `lesson_type ∈ {exam, practice, dictation}`.
    - `PUT /api/v1/learning/admin/lessons/:id`: cập nhật bài học, giữ nguyên `display_order`; nếu đổi sang `exam | practice | dictation` và bài chưa có `quiz_id` thì tự tạo quiz trong `$transaction`; bài đã có `quiz_id` thì giữ nguyên không tạo mới.
    - `PATCH /api/v1/learning/admin/lessons/:id`: cập nhật `is_free` và/hoặc `is_published`; body rỗng → `400 VALIDATION_FAILED`.
    - `DELETE /api/v1/learning/admin/lessons/:id`: xóa bài học, trả `204` kể cả khi không tồn tại; FK cascade `lesson_practices` / tiến độ / yêu thích / ghi chú và `SET NULL` `materials.lesson_id`.
    - `PUT /api/v1/learning/admin/modules/:moduleId/lesson-order`: cập nhật `display_order = vị trí trong mảng` trong một `$transaction`; ID trùng hoặc không thuộc module → `400 LESSON_ORDER_INVALID` và không ghi DB.
  - **4.2 Popup luyện tập (`lesson_practices` — LRN-006 admin)**:
    - `POST /api/v1/learning/admin/lessons/:lessonId/practices`: tạo popup luyện tập mới, server tự tính `display_order = số practice hiện có của bài`; trả về `PracticeDto` kèm `quizzes: { id, title, total_questions } | null`.
    - `PUT /api/v1/learning/admin/practices/:id`: cập nhật popup luyện tập, giữ nguyên `display_order`.
    - `DELETE /api/v1/learning/admin/practices/:id`: xóa popup luyện tập, trả `204` kể cả khi không tồn tại.
  - **4.3 Ghi danh (`enrollments` — ADM-005)**:
    - `GET /api/v1/learning/admin/users/:userId/enrollments`: trả `AdminEnrollmentDto[]` (kèm `courses: { title } | null` qua join chỉ đọc tới bảng `courses`) sắp theo `id` asc.
    - `POST /api/v1/learning/admin/users/:userId/enrollments`: tạo ghi danh, server tự tính `expires_at = now() + expires_in_days ngày` hoặc `null` khi `expires_in_days = null` (client gửi `expires_at` bị `forbidNonWhitelisted` chặn `400 VALIDATION_FAILED`); kiểm tra khóa học qua `CatalogService.findCourseById` (`404 COURSE_NOT_FOUND`), bắt `P2003` (`404 USER_NOT_FOUND`) và `P2002` (`409 ENROLLMENT_EXISTS`).
    - `DELETE /api/v1/learning/admin/enrollments/:id`: xóa ghi danh, trả `204` kể cả khi không tồn tại.
- **Các hạng mục ngoài phạm vi (không làm theo mục 2)**:
  - Quản lý `modules` (`ModuleManager`) — thuộc module Catalog.
  - Upload PDF/tài liệu (`storage`, bảng `materials`) — thuộc P4 Media.
  - Tạo/sửa quiz độc lập và câu hỏi — thuộc P3 Assessment (trừ quiz rỗng tự tạo kèm bài ở mục 4.1, đã đánh dấu `// TODO(P3): chuyển sang AssessmentService` trong `LearningRepository`).
  - Đọc danh sách học viên của khóa (`AdminCourseDetail.tsx:167-187`, cần `profiles`) và thống kê ghi danh (`AdminStudents`, `AdminDashboard`, `AdminReports`) — thuộc P5 Admin.
  - Chuyển đổi frontend admin — thuộc task sau theo mục 9.
- **Kiểm thử**:
  - Unit test: `learning.mapper.spec.ts` (+2 test cho `toAdminEnrollmentDto`), `learning-admin.service.spec.ts` (22 test cho các nhánh 404/409/400, tính `display_order`, quy tắc `video_url`/`pdf_url`, quy tắc tự tạo quiz, rollback transaction khi lỗi ghi bài). Tổng cộng 13 suite / 114 unit test pass.
  - E2E test: `backend/test/learning-admin.e2e-spec.ts` (33 test bao gồm bảng `it.each` 11 route × 3 vai trò 401/403/2xx, bài học, rollback transaction trên Postgres thật, `lesson-order`, `PATCH` ẩn bài kiểm tra với curriculum T-005, `DELETE` cascade + `SET NULL` `materials.lesson_id`, `practices`, `enrollments` + học viên học được bài trả phí trên curriculum T-005). Tổng cộng 6 suite / 103 e2e test pass.
- **Phạm vi file**: Chỉ tạo/sửa các file trong `backend/src/modules/learning/`, `backend/test/learning-admin.e2e-spec.ts` và `docs/tasks/T-009-learning-admin.md`. Không sửa `docs/PARITY.md`, `docs/PROGRESS.md` hay bất kỳ file nào ngoài phạm vi.

### Output nguyên văn các lệnh kiểm tra (mục 6):

```text
 Container l-english-academy-postgres-1  Running

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 13 passed, 13 total
Tests:       114 passed, 114 total
Snapshots:   0 total
Time:        3.595 s, estimated 25 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:26032) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/learning-admin.e2e-spec.ts (6.754 s)
[Nest] 26032  - 10/28/2026, 6:21:53 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
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
PASS test/auth.e2e-spec.ts (11.381 s)
PASS test/learning-user-data.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 6 passed, 6 total
Tests:       103 passed, 103 total
Snapshots:   0 total
Time:        30.736 s, estimated 68 s
Ran all test suites.

> backend@0.0.1 build
> nest build

6a894c0 feat(learning): add admin endpoints for lessons, practices and enrollments (T-009)
5870821 docs(tasks): add T-009 learning admin backend spec
4375f69 docs: record T-008 review PASS
 .../modules/learning/dto/admin-enrollment.dto.ts   |  32 +
 .../src/modules/learning/dto/admin-lesson.dto.ts   |  58 ++
 .../src/modules/learning/dto/admin-practice.dto.ts |  18 +
 backend/src/modules/learning/dto/index.ts          |   3 +
 .../modules/learning/learning-admin.controller.ts  | 224 +++++
 .../learning/learning-admin.service.spec.ts        | 721 +++++++++++++++
 .../src/modules/learning/learning-admin.service.ts | 307 +++++++
 .../src/modules/learning/learning.mapper.spec.ts   |  39 +-
 backend/src/modules/learning/learning.mapper.ts    |  11 +
 backend/src/modules/learning/learning.module.ts    |  11 +-
 .../src/modules/learning/learning.repository.ts    | 222 +++++
 backend/test/learning-admin.e2e-spec.ts            | 966 +++++++++++++++++++++
 docs/tasks/T-009-learning-admin.md                 |  50 +-
 13 files changed, 2647 insertions(+), 15 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Ghi chú cho task frontend sau (không làm ở đây)
- Không chuyển riêng `LessonManager` sang API được: danh sách bài admin đọc từ `AdminCourseDetail.tsx:159-165` (`modules` + `lessons` + `quizzes`) vẫn ở Supabase. Ghi qua API (DB mới) mà đọc từ Supabase thì admin không thấy thay đổi. Chuyển frontend admin khi đã có endpoint đọc admin cho modules (Catalog) và quizzes (P3).
- `AdminStudentDetail` chuyển được độc lập (đọc + ghi ghi danh cùng ở 4.3). Adapter phải giữ toast cũ: lỗi `ENROLLMENT_EXISTS` → đổi thành lỗi có `code: "23505"` để `getFriendlyErrorMessage` (`errorHandler.ts:46`) ra đúng câu cũ.
- `LessonPracticeManager` cũ bỏ qua lỗi; adapter phải giữ (không ném).

## 10. Review (Claude điền)
**PASS** (Claude, 2026-10-28) — merge vào `refactor/nestjs-backend`. Review trên `3eb7419`.
- 11 route đúng mục 4, guard admin ở cấp class; server tính `display_order`, `video_url`/`pdf_url`, `expires_at`; quiz tự tạo + ghi bài và `lesson-order` trong transaction; 404/409/400 đúng mã. Output nguyên văn đầy đủ.
- Gộp với P3 (`6322b3c`, cũng sửa `learning.module.ts`): xung đột 1 chỗ (`exports: [LearningService]` của P3 + controller/service admin), Claude giải tay. Chạy lại sau gộp: lint/typecheck sạch, unit 16 suite/143 test, e2e 7 suite/125 test, build OK.
- Góp ý (không chặn):
  - `expires_in_days` để `@IsOptional` → **bỏ trống = vĩnh viễn**. Adapter frontend phải luôn gửi trường này (kể cả `null`); nên đổi thành bắt buộc (`@ValidateIf(o => o.expires_in_days !== null)`) khi làm task frontend admin.
  - `inTransaction` tạo `new LearningRepository(tx as PrismaService)` — ép kiểu; chạy được vì chỉ gọi model, nhưng gọi `$transaction` lồng bên trong sẽ hỏng. Ghi chú để không ai dùng như vậy.
  - `resolveMediaUrls` coi chuỗi toàn khoảng trắng là rỗng (cũ giữ nguyên) — chấp nhận.
  - `lesson-order` nhận danh sách con của module (không bắt đủ mọi bài) — giao diện cũ luôn gửi đủ, chấp nhận.
