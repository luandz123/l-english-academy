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
- [x] 2 route + e2e 3 vai; `admin_id` = admin gọi API; body có `admin_id` → 400; thứ tự mới nhất trước; user lạ → 404
- [x] Adapter `listStudentNotes(userId)`, `addStudentNote(userId, content)` đúng URL/body, lỗi không ném; thân `mutationFn` mới: `const { error } = await addStudentNote(userId!, noteText); if (error) throw error;`
- [x] `grep -n 'admin_student_notes' src/pages/admin/AdminStudentDetail.tsx` rỗng; `check-ui-diff` OK

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
- **Backend (`backend/src/modules/admin/`, `backend/src/app.module.ts`)**: Tạo mới `AdminModule`, `AdminController`, `AdminService`, `AdminRepository`, `AdminMapper`, `AdminNoteDto`, `CreateAdminNoteDto` với 2 route `GET /api/v1/admin/users/:userId/notes` và `POST /api/v1/admin/users/:userId/notes` (bảo vệ bởi `JwtAuthGuard` + `RolesGuard` `@Roles(AppRole.admin)`), lấy `admin_id` từ token, bắt Prisma `P2003` → `404 USER_NOT_FOUND`.
- **Test backend**: Bổ sung unit test `backend/src/modules/admin/admin.service.spec.ts` và e2e test `backend/test/admin-notes.e2e-spec.ts`.
- **Frontend (`src/lib/api/admin.ts`, `src/lib/api/admin.test.ts`, `src/pages/admin/AdminStudentDetail.tsx`)**: Tạo adapter `listStudentNotes`, `addStudentNote` kèm unit test; chuyển `admin-student-notes` và `addNoteMutation` trong `AdminStudentDetail.tsx` (chỉ sửa `import`, thân `queryFn` và thân `mutationFn`).

Output nguyên văn các lệnh ở mục 6:
```text
 Container l-english-academy-postgres-1  Running

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 20 passed, 20 total
Tests:       175 passed, 175 total
Snapshots:   0 total
Time:        2.164 s, estimated 15 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:14708) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/admin-notes.e2e-spec.ts (5.297 s)
[Nest] 14708  - 10/28/2026, 10:41:17 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
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
PASS test/auth.e2e-spec.ts (10.951 s)
PASS test/assessment-full-test.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 10 passed, 10 total
Tests:       149 passed, 149 total
Snapshots:   0 total
Time:        42.092 s, estimated 54 s
Ran all test suites.

> backend@0.0.1 build
> nest build


> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 6ms
 ✓ src/lib/api/admin.test.ts (3 tests) 85ms
 ✓ src/lib/api/client.test.ts (4 tests) 110ms
 ✓ src/lib/api/payments.test.ts (4 tests) 179ms
 ✓ src/lib/api/fullTest.test.ts (5 tests) 189ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 293ms
 ✓ src/lib/api/auth.test.ts (9 tests) 189ms
 ✓ src/lib/api/assessment.test.ts (10 tests) 252ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/lib/api/learning.test.ts (34 tests) 185ms
 ✓ src/test/part2Audio.test.ts (3 tests) 496ms
   ✓ SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause  321ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 15ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 9ms

 Test Files  12 passed (12)
      Tests  101 passed (101)
   Start at  22:41:58
   Duration  26.13s (transform 5.00s, setup 18.59s, collect 13.58s, tests 2.01s, environment 196.17s, prepare 3.65s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
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
dist/assets/googleOAuth-J1ItTo1Q.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-D1Ztp7tF.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-DeSopEtD.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-C5v12Ils.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-Cb887DXy.js                          0.66 kB │ gzip:   0.39 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/assessment-1BwRNxpS.js                     0.82 kB │ gzip:   0.36 kB
dist/assets/fullTest-BdVUhUAi.js                       0.86 kB │ gzip:   0.34 kB
dist/assets/ErrorState-BvjDDBy0.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-DN1ufIM1.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-BswIKiAe.js                           1.15 kB │ gzip:   0.46 kB
dist/assets/button-DwI6o5aQ.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-Dq49FQX1.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-CnTyAIYB.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/learning-B2uni8xl.js                       1.84 kB │ gzip:   0.63 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-5l7-BnYW.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-CKxYDedV.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-Bj2xwRl1.js                  2.21 kB │ gzip:   1.30 kB
dist/assets/ListeningPage-F9rw57NR.js                  2.22 kB │ gzip:   1.27 kB
dist/assets/sheet-SotDJqYs.js                          2.34 kB │ gzip:   0.93 kB
dist/assets/dialog-D5SzitxV.js                         2.34 kB │ gzip:   0.94 kB
dist/assets/AuthCallback-D7JY-9Ux.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-CqMvgknT.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-rauCVbt8.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-BaO9Wk42.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-Bgq7BkLy.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-Be2ttjfd.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-CiO4-1No.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-lbdAzXD-.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-ZkY3ckIA.js                 4.97 kB │ gzip:   2.09 kB
dist/assets/MysteryChestModal-B7iSh7my.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-G4oUlH6X.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-Dury7PGG.js                          5.36 kB │ gzip:   2.06 kB
dist/assets/FullTestList-CcaiqCLK.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-Dm8M87HB.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-CxhVc4oF.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-DPIjPrXz.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-j2Mlx_zW.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-BPpNnz_U.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-B79vVPPR.js          7.82 kB │ gzip:   3.36 kB
dist/assets/AdminDashboard-C2tVXRTV.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-CuVX7eCl.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-CeQkYODL.js                          9.79 kB │ gzip:   3.79 kB
dist/assets/AdminCourses-Bfzad5kM.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/useGamification-CG8QaTw6.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-CqDkwsIs.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-C988RF0n.js                10.89 kB │ gzip:   3.67 kB
dist/assets/AdminStudentDetail-DmFvm-M-.js            12.34 kB │ gzip:   3.49 kB
dist/assets/homepageShowcaseService-DLUpqnH_.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-BXX43Y2P.js                     14.27 kB │ gzip:   4.00 kB
dist/assets/AdminCategories-KsgaDIsh.js               14.73 kB │ gzip:   4.73 kB
dist/assets/AdminMaterials-DqRYtinW.js                15.16 kB │ gzip:   4.72 kB
dist/assets/Combination-Cj70srmv.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-CcPb2n8G.js               18.54 kB │ gzip:   5.64 kB
dist/assets/StudentLayout-DuugTDEj.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-oMfLUHhi.js                 19.25 kB │ gzip:   5.83 kB
dist/assets/select-T62eEoiP.js                        21.25 kB │ gzip:   7.39 kB
dist/assets/AdminFullTestManager-18GfUCOA.js          22.88 kB │ gzip:   7.20 kB
dist/assets/AdminBackup-Djer-DT4.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/FullTestResult-DQAdSLUB.js                25.05 kB │ gzip:   7.29 kB
dist/assets/AdminGamesConfig-DkrElBdS.js              25.47 kB │ gzip:   7.54 kB
dist/assets/QuizPage-BxcSQG-7.js                      25.93 kB │ gzip:   7.77 kB
dist/assets/QuizResult-D599RzdY.js                    27.99 kB │ gzip:   7.83 kB
dist/assets/AdminVocabPacks-0zv6BVHt.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-CQP3xMgG.js                      37.66 kB │ gzip:   9.43 kB
dist/assets/AdminSettings-COgpMogL.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-BcrFNN01.js                       40.79 kB │ gzip:  10.43 kB
dist/assets/LearnPage-KJpLomjN.js                     40.91 kB │ gzip:  11.23 kB
dist/assets/UpgradeProModal-BLYriLZ2.js               41.34 kB │ gzip:  11.91 kB
dist/assets/AdminFullTestQuestions-Cp2q7Jni.js        43.64 kB │ gzip:   9.67 kB
dist/assets/WordShooterLeaderboardModal-BmwpCBLh.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-Btdr4_D8.js                  55.36 kB │ gzip:  14.18 kB
dist/assets/Index-CtyuyITB.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-oEQ2bwTN.js                 67.64 kB │ gzip:  15.23 kB
dist/assets/WordDefenseGame-CY0_nVXn.js               73.08 kB │ gzip:  18.40 kB
dist/assets/WordShooterGame-DqzJ87GH.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-PxOmUlIj.js                         95.85 kB │ gzip:  33.19 kB
dist/assets/DictationPage-B4dZZt_L.js                110.40 kB │ gzip:  26.48 kB
dist/assets/vocabPacksService-CbaQtLNg.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-Bo99vrTL.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-DxWgjffl.js               338.88 kB │ gzip:  55.19 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-CGxaChVO.js            651.43 kB │ gzip: 172.95 kB
✓ built in 27.67s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
cb5db38 feat(admin): add student notes endpoints and migrate AdminStudentDetail (T-014)
f437eff ci: skip Vercel deploys that do not change the frontend
af4797c feat(assessment): server-side Full Test grading with ETS conversion (P3)
 backend/src/app.module.ts                       |   2 +
 backend/src/modules/admin/admin.controller.ts   |  74 +++++++++++
 backend/src/modules/admin/admin.mapper.ts       |  17 +++
 backend/src/modules/admin/admin.module.ts       |  14 +++
 backend/src/modules/admin/admin.repository.ts   |  25 ++++
 backend/src/modules/admin/admin.service.spec.ts |  88 +++++++++++++
 backend/src/modules/admin/admin.service.ts      |  45 +++++++
 backend/src/modules/admin/dto/admin-note.dto.ts |  31 +++++
 backend/src/modules/admin/dto/index.ts          |   2 +
 backend/test/admin-notes.e2e-spec.ts            | 145 ++++++++++++++++++++++
 docs/tasks/T-014-admin-student-notes.md         |  10 +-
 src/lib/api/admin.test.ts                       |  64 ++++++++++
 src/lib/api/admin.ts                            |  35 ++++++
 src/pages/admin/AdminStudentDetail.tsx          |  11 +-
 14 files changed, 552 insertions(+), 11 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
