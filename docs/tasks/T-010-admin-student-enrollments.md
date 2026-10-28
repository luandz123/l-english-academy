# T-010: Ghi danh ở trang chi tiết học viên (admin) qua API

> **Người làm**: Antigravity · **Module**: Learning · **Nhánh**: `task/T-010-admin-student-enrollments` (tách từ `refactor/nestjs-backend` **sau khi `git pull`**)
> **Phụ thuộc**: T-009 đã merge · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` (mục 4.3, 9, 10), `src/lib/api/learning.ts`, `src/lib/errorHandler.ts`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-010-admin-student-enrollments
```

## 1. Mục tiêu
Chuyển 3 thao tác ghi danh ở `src/pages/admin/AdminStudentDetail.tsx` sang endpoint T-009: đọc, mở khóa, thu hồi. Đồng thời đổi `expires_in_days` ở backend thành **bắt buộc** (góp ý review T-009).

## 2. Phạm vi
**Được sửa/tạo**
- `backend/src/modules/learning/dto/admin-enrollment.dto.ts` — chỉ `CreateAdminEnrollmentDto.expires_in_days` (mục 4.1)
- `backend/test/learning-admin.e2e-spec.ts` — thêm test mục 4.1
- `src/lib/api/learning.ts` — **thêm** 3 hàm (mục 4.2), không đổi hàm cũ
- `src/lib/api/learning.test.ts` — thêm test
- `src/pages/admin/AdminStudentDetail.tsx` — **chỉ** thân `queryFn` của `admin-student-enrollments`, thân `mutationFn` của `unlockCourseMutation` và `removeEnrollmentMutation`, dòng `import`

**Cấm sửa**: JSX, `className`, câu chữ, `queryKey`, `onSuccess`/`onError`; 4 query còn lại của trang (`profiles`, `user_quiz_results`, `admin_student_notes`, `courses`) và `addNoteMutation` — thuộc task khác, giữ Supabase; module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-005 | `AdminStudentDetail.tsx:50-57` | `enrollments.select("*, courses(title)").eq("user_id", userId)`; lỗi bị bỏ qua → `[]` | `listUserEnrollments(userId!)` → `data ?? []` (không ném, như cũ) |
| ADM-005 | `AdminStudentDetail.tsx:109-120` | client tính `expires_at = now + expiryDays ngày` hoặc `null` rồi `insert`; lỗi → `throw` → toast `getFriendlyErrorMessage(err)` | `addUserEnrollment(userId!, Number(selectedCourseId), expiryDays === "unlimited" ? null : Number(expiryDays))`; có `error` → `throw error`. **Không** tính `expires_at` ở client (luật 5) |
| ADM-005 | `AdminStudentDetail.tsx:130-134` | `enrollments.delete().eq("id", enrollmentId)`; lỗi → `throw` | `removeEnrollment(enrollmentId)`; có `error` → `throw error` |

Thân `mutationFn` mở khóa mới (giữ nguyên tên biến state):
```ts
const { error } = await addUserEnrollment(
  userId!,
  Number(selectedCourseId),
  expiryDays === "unlimited" ? null : Number(expiryDays),
);
if (error) throw error;
```

## 4. Đặc tả
### 4.1 Backend: `expires_in_days` bắt buộc
Hiện `@IsOptional()` → bỏ trống trường bị hiểu là **vĩnh viễn**. Đổi thành: bỏ `@IsOptional()`, thêm `@ValidateIf((o: CreateAdminEnrollmentDto) => o.expires_in_days !== null)` trước `@IsInt() @Min(1) @Max(3650)`; Swagger `@ApiProperty({ nullable: true, ... })` (không còn `Optional`). Kết quả:
- `{ course_id, expires_in_days: 30 }` → hạn 30 ngày; `{ course_id, expires_in_days: null }` → vĩnh viễn (như cũ)
- `{ course_id }` (thiếu trường) → 400 `VALIDATION_FAILED`
- Service giữ nguyên.

### 4.2 Adapter `src/lib/api/learning.ts`
| Hàm | Gọi | Trả về |
|---|---|---|
| `listUserEnrollments(userId)` | GET `learning/admin/users/:userId/enrollments` | `AdminEnrollmentRow[]` |
| `addUserEnrollment(userId, courseId, expiresInDays)` | POST `learning/admin/users/:userId/enrollments` body `{ course_id, expires_in_days }` (**luôn** có `expires_in_days`, kể cả `null`) | `AdminEnrollmentRow` |
| `removeEnrollment(enrollmentId)` | DELETE `learning/admin/enrollments/:id` | `null` |

- `AdminEnrollmentRow` = `EnrollmentRow` (đã có) + `courses: { title: string } | null`.
- Mọi hàm trả `{ data, error }`, không ném.
- `addUserEnrollment`: lỗi `code === "ENROLLMENT_EXISTS"` → trả `error = new ApiError(409, "23505", <message gốc>)` để `getFriendlyErrorMessage` (`errorHandler.ts:46`) ra đúng câu cũ "Dữ liệu này đã tồn tại…". Lỗi khác trả nguyên.

## 5. Tiêu chí nghiệm thu
- [x] `grep -n 'from("enrollments")' src/pages/admin/AdminStudentDetail.tsx` không còn kết quả (dán output)
- [x] `git diff refactor/nestjs-backend -- src/pages/admin/AdminStudentDetail.tsx` chỉ đổi `import` và thân 1 `queryFn` + 2 `mutationFn`; `check-ui-diff` OK; số `queryKey` trước/sau bằng nhau
- [x] `learning.test.ts`: 3 hàm gọi đúng method/URL/body; `addUserEnrollment(…, null)` gửi `"expires_in_days": null` (không bỏ khóa); `ENROLLMENT_EXISTS` → `error.code === "23505"` và `getFriendlyErrorMessage(error)` ra câu trùng lặp; 500 → error nguyên; không hàm nào ném
- [x] E2E backend: thiếu `expires_in_days` → 400; `null` → `expires_at null`; 30 → hạn 30 ngày (test cũ vẫn pass)
- [x] Chạy tay local (backend + `npm run dev`, tài khoản admin test trong `.env`/seed): mở `/admin/students/:id` của một học viên test → mở khóa 1 khóa 30 ngày → bảng hiện ngày hết hạn đúng; mở khóa "Vĩnh viễn" → hiện "Vĩnh viễn"; khóa đã mở biến khỏi danh sách chọn; thu hồi → dòng biến mất; ghi kết quả vào mục 7

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
npx eslint src/lib/api/learning.ts src/lib/api/learning.test.ts
grep -n 'from("enrollments")' src/pages/admin/AdminStudentDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md` — Claude cập nhật khi review.

## 7. Kết quả (người làm điền)
- **Backend (mục 4.1)**: Đã đổi `CreateAdminEnrollmentDto.expires_in_days` trong `backend/src/modules/learning/dto/admin-enrollment.dto.ts` sang bắt buộc bằng `@ValidateIf((o: CreateAdminEnrollmentDto) => o.expires_in_days !== null)` và `@ApiProperty({ nullable: true, ... })`; bổ sung test e2e kiểm tra thiếu `expires_in_days` → `400 VALIDATION_FAILED` trong `backend/test/learning-admin.e2e-spec.ts`.
- **Adapter (mục 4.2)**: Đã thêm kiểu `AdminEnrollmentRow` và 3 hàm `listUserEnrollments(userId)`, `addUserEnrollment(userId, courseId, expiresInDays)`, `removeEnrollment(enrollmentId)` vào `src/lib/api/learning.ts` (khi gặp lỗi `ENROLLMENT_EXISTS` đổi thành `new ApiError(409, "23505", ...)` để `getFriendlyErrorMessage` trả đúng câu thông báo trùng lặp cũ); bổ sung 8 unit test trong `src/lib/api/learning.test.ts` (tổng 34 test pass).
- **Frontend (`src/pages/admin/AdminStudentDetail.tsx`)**: Chỉ sửa dòng `import`, thân `queryFn` của `admin-student-enrollments` và thân 2 `mutationFn` (`unlockCourseMutation`, `removeEnrollmentMutation`); không tính `expires_at` ở client, giữ nguyên toàn bộ `queryKey` (8 vị trí), JSX và câu chữ.
- **Kết quả kiểm thử chạy tay trên trình duyệt local (backend `:3000` + Vite `:8082`)**:
  1. Đăng nhập tài khoản admin (`admin_t008@lenglish.local`) và mở `/admin/students/44444444-4444-4444-8444-444444444444` (`Học Viên Test T-010`) → tab `Khóa học (0)` hiển thị `Chưa đăng ký khóa nào` (`GET /api/v1/learning/admin/users/:userId/enrollments`).
  2. Bấm `Mở khóa học` → chọn `Khóa Luyện Nghe - Đọc TOEIC Toàn Diện` và thời hạn `30 ngày` → bấm `Cấp quyền truy cập` (`POST /api/v1/learning/admin/users/:userId/enrollments` với body `{"course_id":1,"expires_in_days":30}`) → bảng hiển thị dòng `Khóa Luyện Nghe - Đọc TOEIC Toàn Diện | 28/10/2026 | 27/11/2026` (đúng hạn 30 ngày do server tính).
  3. Mở lại hộp thoại `Mở khóa học` → khóa `Khóa Luyện Nghe - Đọc TOEIC Toàn Diện` đã biến mất khỏi danh sách chọn (chỉ còn `Khóa Luyện Đề ETS Thực Chiến`).
  4. Chọn `Khóa Luyện Đề ETS Thực Chiến` và thời hạn `Vĩnh viễn` → bấm `Cấp quyền truy cập` (`POST` với body `{"course_id":2,"expires_in_days":null}`) → bảng hiển thị dòng `Khóa Luyện Đề ETS Thực Chiến | 28/10/2026 | Vĩnh viễn`.
  5. Bấm nút thùng rác thu hồi `Khóa Luyện Nghe - Đọc TOEIC Toàn Diện` → xác nhận `Thu hồi quyền` (`DELETE /api/v1/learning/admin/enrollments/:id`) → dòng khóa 1 biến mất khỏi bảng, chỉ còn lại khóa 2.

### Output nguyên văn các lệnh ở mục 6

```text
 Container l-english-academy-postgres-1  Created
 Container l-english-academy-postgres-1  Starting
 Container l-english-academy-postgres-1  Started

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts (8.731 s)
PASS src/modules/learning/learning.mapper.spec.ts (8.752 s)
PASS src/common/filters/all-exceptions.filter.spec.ts (8.835 s)
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts (11.23 s)
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts (11.239 s)
PASS src/modules/learning/learning-quiz-access.spec.ts (13.999 s)
PASS src/modules/assessment/assessment.service.spec.ts (14.169 s)
PASS src/modules/catalog/catalog.service.spec.ts (14.577 s)
PASS src/modules/learning/learning-admin.service.spec.ts (14.743 s)
PASS src/modules/learning/learning.service.spec.ts (14.931 s)

Test Suites: 16 passed, 16 total
Tests:       143 passed, 143 total
Snapshots:   0 total
Time:        19.007 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:11772) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/assessment-quiz.e2e-spec.ts (34.207 s)
[Nest] 11772  - 10/28/2026, 8:53:53 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
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
PASS test/auth.e2e-spec.ts (7.951 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 7 passed, 7 total
Tests:       126 passed, 126 total
Snapshots:   0 total
Time:        48.4 s
Ran all test suites.

> backend@0.0.1 build
> nest build


> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 18ms
 ✓ src/lib/api/client.test.ts (4 tests) 58ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 102ms
 ✓ src/lib/api/assessment.test.ts (10 tests) 93ms
 ✓ src/lib/api/auth.test.ts (9 tests) 114ms
 ✓ src/lib/api/learning.test.ts (34 tests) 128ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 433ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 49ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 11ms

 Test Files  9 passed (9)
      Tests  89 passed (89)
   Start at  20:54:22
   Duration  30.36s (transform 4.97s, setup 51.42s, collect 15.29s, tests 1.01s, environment 150.82s, prepare 3.97s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2734 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/icon-shield-B0UUQDlh.webp                 16.16 kB
dist/assets/icon-flame-3d-DnBxg_M6.webp               28.17 kB
dist/assets/icon-arcade-3d-Bi7AXjVJ.webp              28.75 kB
dist/assets/icon-trophy-3d-CctHGkgb.webp              30.14 kB
dist/assets/icon-word-defense-BYBOe8H3.webp           35.35 kB
dist/assets/icon-dictation-3d-C0aBuE_E.webp           36.24 kB
dist/assets/icon-vip-crown-3d-8elhJVIy.webp           36.91 kB
dist/assets/icon-video-3d-mGfYA5-a.webp               39.78 kB
dist/assets/icon-fulltest-3d-DVa66wxC.webp            39.84 kB
dist/assets/icon-word-shooter-CV9wU2_M.webp           46.04 kB
dist/assets/icon-ets-seal-3d-DNcz2jN_.webp            46.88 kB
dist/assets/icon-vocab-packs-CooV73nv.webp            46.96 kB
dist/assets/icon-gift-3d-Lz8bTNOI.webp                68.71 kB
dist/assets/icon-reflex-Clpau8yW.webp                 81.14 kB
dist/assets/logo-B6DxuRMe.jpg                        117.98 kB
dist/assets/hero-banner-new-CIOKYmps.jpg             250.05 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
dist/assets/icon-reflex-8vI30Y3_.js                    0.06 kB │ gzip:   0.08 kB
dist/assets/index-yNqE7hcw.js                          0.19 kB │ gzip:   0.17 kB
dist/assets/index-D-bbvFwL.js                          0.24 kB │ gzip:   0.18 kB
dist/assets/googleOAuth-E-YX2r06.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-B-_lHW8a.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-6-oI__6M.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-CTLzUNhw.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-BxMsOqP_.js                          0.66 kB │ gzip:   0.40 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/assessment-BlN_D-4j.js                     0.82 kB │ gzip:   0.36 kB
dist/assets/ErrorState-B2VEdlcO.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-Bol5B0cx.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-B4gY1nA6.js                           1.15 kB │ gzip:   0.46 kB
dist/assets/button-D0oIsNRT.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-DHKgpKjW.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-BnJdFmiP.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/learning-wO0mYdjK.js                       1.84 kB │ gzip:   0.63 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-Btq_-2Hl.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-Duv_1jWn.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-DDzLHoyE.js                  2.21 kB │ gzip:   1.30 kB
dist/assets/ListeningPage-DRa1kBxn.js                  2.22 kB │ gzip:   1.28 kB
dist/assets/sheet-BNKwf-xz.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-D3wq068z.js                         2.34 kB │ gzip:   0.93 kB
dist/assets/AuthCallback-C-YjaJDS.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-DKpqj1A0.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-Ck62iCN0.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-DjXLKvVM.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-CIyFCUvy.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-KezfBNrU.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-CIJOHpAC.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-Dkk5p4c5.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-C97lP62f.js                 4.97 kB │ gzip:   2.10 kB
dist/assets/MysteryChestModal-C8_efkUu.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-DQiKFDJd.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-DcH4Ins1.js                          5.36 kB │ gzip:   2.06 kB
dist/assets/FullTestList-BeRUk1P6.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-uIWGu_26.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-DnEJJMFj.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-DdI6e-dh.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-Bs3X_zva.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-U66Ca8a-.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-k_90pXFL.js          7.82 kB │ gzip:   3.36 kB
dist/assets/AdminDashboard-mvddwoc5.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-BK7Jgu2i.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-DpvkP-3c.js                          9.79 kB │ gzip:   3.79 kB
dist/assets/AdminCourses-Bx6RpJDK.js                   9.96 kB │ gzip:   3.33 kB
dist/assets/useGamification-BXjIq4_v.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-__77XOmZ.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-BEP0VI59.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-BeVrUiqN.js            12.35 kB │ gzip:   3.46 kB
dist/assets/homepageShowcaseService-OODr0HPO.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-CIViMDWE.js                     14.27 kB │ gzip:   4.01 kB
dist/assets/AdminCategories-viNguSya.js               14.73 kB │ gzip:   4.73 kB
dist/assets/AdminMaterials-UKybPOpJ.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-DDv3G_o2.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-cjUH7PaX.js               18.54 kB │ gzip:   5.64 kB
dist/assets/StudentLayout-NKzC8-DQ.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-BgxyR1Js.js                 19.25 kB │ gzip:   5.84 kB
dist/assets/select-nETGZiyC.js                        21.25 kB │ gzip:   7.39 kB
dist/assets/AdminFullTestManager-LqM5TUdv.js          22.88 kB │ gzip:   7.20 kB
dist/assets/AdminBackup-CmbAyQcb.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/AdminGamesConfig-C8QWxf0k.js              25.47 kB │ gzip:   7.54 kB
dist/assets/FullTestResult-_Mqw5PtR.js                25.77 kB │ gzip:   7.51 kB
dist/assets/QuizPage-DUoEqFnx.js                      25.93 kB │ gzip:   7.77 kB
dist/assets/QuizResult-D6_jReXc.js                    27.99 kB │ gzip:   7.82 kB
dist/assets/AdminVocabPacks-Dtu1r7ql.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-BgC093hM.js                      37.66 kB │ gzip:   9.44 kB
dist/assets/AdminSettings-ChpW17mR.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-BrczFJ8_.js                       40.79 kB │ gzip:  10.44 kB
dist/assets/LearnPage-CADqiIVZ.js                     40.91 kB │ gzip:  11.23 kB
dist/assets/UpgradeProModal-Cjx9zkJG.js               42.21 kB │ gzip:  12.23 kB
dist/assets/AdminFullTestQuestions-Dcf7G7Bp.js        43.64 kB │ gzip:   9.67 kB
dist/assets/WordShooterLeaderboardModal-C66XcFMl.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-DNHzstqS.js                  58.03 kB │ gzip:  15.40 kB
dist/assets/Index-CV8Pv_1T.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-Wv-mA2k3.js                 67.64 kB │ gzip:  15.24 kB
dist/assets/WordDefenseGame-OehnAi0r.js               73.08 kB │ gzip:  18.41 kB
dist/assets/WordShooterGame-CYoeq8BX.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-CBrrtg_Y.js                         95.81 kB │ gzip:  33.17 kB
dist/assets/DictationPage-BZD8kU-Q.js                110.40 kB │ gzip:  26.49 kB
dist/assets/vocabPacksService-D9fbteBX.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-DqN07rwg.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-CNHXy7-d.js               338.88 kB │ gzip:  55.20 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-DLzPjtFe.js            651.43 kB │ gzip: 172.95 kB
✓ built in 48.12s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
f9127f5 feat(learning): migrate admin student enrollments to API and require expires_in_days (T-010)
80454f1 docs(tasks): add T-010 admin student enrollments spec
47b12e8 docs: record T-009 review PASS, mark ADM-005 backend done
 .../modules/learning/dto/admin-enrollment.dto.ts   |  10 +-
 backend/test/learning-admin.e2e-spec.ts            |  13 ++
 docs/tasks/T-010-admin-student-enrollments.md      |  20 ++-
 src/lib/api/learning.test.ts                       | 143 +++++++++++++++++++++
 src/lib/api/learning.ts                            |  49 +++++++
 src/pages/admin/AdminStudentDetail.tsx             |  20 +--
 6 files changed, 237 insertions(+), 18 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
