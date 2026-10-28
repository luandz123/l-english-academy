# T-011: Danh sách kết quả quiz qua API (Learn, Dashboard, Hồ sơ, admin)

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-011-quiz-results-lists` (tách từ `refactor/nestjs-backend` mới nhất)
> **Phụ thuộc**: không (T-010 có thể chưa merge: nếu đụng `AdminStudentDetail.tsx` thì chỉ sửa đúng chỗ ở mục 3) · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/assessment/` (làm theo đúng cấu trúc ở đó), `src/lib/api/assessment.ts`, file này.

## 1. Mục tiêu
Sau P3 lõi, `QuizPage` ghi kết quả qua API (DB mới) nhưng 4 trang vẫn đọc `user_quiz_results` từ Supabase → không thấy kết quả mới. Thêm 2 endpoint đọc và chuyển 4 truy vấn.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/assessment/**` (thêm method/route/DTO, không đổi route cũ), `backend/test/assessment-results.e2e-spec.ts` (mới), `src/lib/api/assessment.ts` + `.test.ts` (thêm hàm), và **chỉ thân `queryFn` + `import`** ở 4 chỗ mục 3.
**Cấm**: JSX, `className`, câu chữ, `queryKey`; `DashboardPage.tsx:317` (bảng xếp hạng — Gamification); `DictationPage.tsx` (task Dictation); module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Truy vấn cũ | Thay bằng |
|---|---|---|---|
| ASM-006 (đọc) | `LearnPage.tsx:100-112` | `select quiz_id, score, correct_answers, total_questions` · `user_id = me` · order `completed_at` desc | `listMyQuizResults()` |
| ASM-006 (đọc) | `DashboardPage.tsx:181-191` | `select id, quiz_id, score, total_questions, correct_answers, time_spent_seconds, completed_at` · như trên | `listMyQuizResults()` |
| ASM-006 (đọc) | `Profile.tsx:227-237` | `select *, quizzes(id, title, audio_url, total_questions, module_id, modules(id, title, courses(id, title)))` · như trên | `listMyQuizResults()` |
| ADM-003 | `AdminStudentDetail.tsx:59-70` | `select *, quizzes(title)` · `user_id = :userId` · order `completed_at` desc | `listUserQuizResults(userId!)` |

Thân `queryFn` mới giữ `if (!user) return [];` (nếu có) và `return data ?? []` / `data || []` như cũ; **không ném lỗi** (cũ không ném).

## 4. Đặc tả
| Method | Route | Guard | Trả về |
|---|---|---|---|
| GET | `/api/v1/assessment/results/me` | JWT | `QuizResultWithQuizDto[]` của chính mình |
| GET | `/api/v1/assessment/admin/users/:userId/results` | JWT + `RolesGuard` + `@Roles(AppRole.admin)` (`ParseUUIDPipe`) | `QuizResultWithQuizDto[]` của user đó |

- `QuizResultWithQuizDto` = `QuizResultDto` (đã có) + `quizzes: { id, title, audio_url, total_questions, module_id, modules: { id, title, courses: { id, title } | null } | null } | null`. Một shape cho cả 4 chỗ (chỗ cũ chọn ít cột hơn vẫn đọc đúng). Tên khóa `quizzes`/`modules`/`courses` giữ như PostgREST.
- Sắp `completed_at` desc **nulls last**, rồi `id` desc.
- Join `quizzes → modules → courses` chỉ đọc bằng `include`/`select` trong `AssessmentRepository` (bảng của Catalog; ghi chú lý do trong code như T-009).
- `user_id` của `/me` **chỉ** từ token. Route `/me` phải khai báo **trước** `results/:resultId` trong controller (tránh `ParseIntPipe` bắt `"me"` → 400).
- RLS cũ → test e2e: `Users view own results` (A không thấy kết quả B qua `/me`), `Admins view all results` (admin đọc được của B; học viên gọi route admin → 403; không token → 401).

## 5. Tiêu chí nghiệm thu
- [x] 2 route đúng mục 4; e2e phân quyền đủ 3 vai
- [x] E2E: thứ tự `completed_at` desc; `quizzes.modules.courses.title` đúng khi quiz có module; quiz không module → `quizzes.modules = null`; `score` là number
- [x] Unit mapper cho DTO mới; adapter test: đúng URL, lỗi trả `{ data: null, error }` không ném
- [x] `grep -n 'from("user_quiz_results")' src/pages/LearnPage.tsx src/pages/Profile.tsx src/pages/admin/AdminStudentDetail.tsx` rỗng; `DashboardPage.tsx` chỉ còn dòng `:317`
- [x] `check-ui-diff` OK; số `queryKey` mỗi trang không đổi

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("user_quiz_results")' src/pages/LearnPage.tsx src/pages/DashboardPage.tsx src/pages/Profile.tsx src/pages/admin/AdminStudentDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```
Không sửa `docs/PARITY.md`, `docs/PROGRESS.md`.

## 7. Kết quả (người làm điền)
- **Backend**: Thêm `QuizResultWithQuizDto` (và các DTO nhúng `quizzes -> modules -> courses`) trong `backend/src/modules/assessment/dto/quiz-result.dto.ts`, phương thức `findResultsByUserWithQuiz` trong `AssessmentRepository` (sắp `completed_at` desc nulls last, rồi `id` desc), mapper `toQuizResultWithQuizDto` trong `AssessmentMapper`, `listUserResults` trong `AssessmentService`, và 2 route `GET /api/v1/assessment/results/me` (khai báo trước `results/:resultId`), `GET /api/v1/assessment/admin/users/:userId/results` trong `AssessmentController`.
- **Test backend**: Bổ sung unit test mapper + service trong `backend/src/modules/assessment/assessment.service.spec.ts` và file e2e mới `backend/test/assessment-results.e2e-spec.ts`.
- **Frontend adapter & pages**: Thêm `QuizResultWithQuizRow`, `listMyQuizResults`, `listUserQuizResults` vào `src/lib/api/assessment.ts` kèm unit test trong `src/lib/api/assessment.test.ts`; chuyển 4 truy vấn ở `LearnPage.tsx`, `DashboardPage.tsx`, `Profile.tsx`, `AdminStudentDetail.tsx` (chỉ sửa `import` và thân `queryFn`).

### Output nguyên văn các lệnh ở mục 6

```text
 Container l-english-academy-postgres-1  Running

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts (12.365 s)
PASS src/modules/learning/learning.mapper.spec.ts (12.422 s)
PASS src/common/filters/all-exceptions.filter.spec.ts (12.46 s)
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts (14.603 s)
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts (14.669 s)
PASS src/modules/payments/payments.service.spec.ts (16.844 s)
PASS src/modules/learning/learning-quiz-access.spec.ts (16.893 s)
PASS src/modules/assessment/assessment.service.spec.ts (17.028 s)
PASS src/modules/catalog/catalog.service.spec.ts (18.95 s)
PASS src/modules/learning/learning-admin.service.spec.ts (19.091 s)
PASS src/modules/learning/learning.service.spec.ts (19.181 s)

Test Suites: 18 passed, 18 total
Tests:       165 passed, 165 total
Snapshots:   0 total
Time:        23.895 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:10972) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/payments.e2e-spec.ts (32.798 s)
PASS test/assessment-results.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
[Nest] 10972  - 10/28/2026, 10:19:39 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
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
PASS test/auth.e2e-spec.ts (11.756 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 9 passed, 9 total
Tests:       142 passed, 142 total
Snapshots:   0 total
Time:        67.703 s
Ran all test suites.

> backend@0.0.1 build
> nest build


> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 14ms
 ✓ src/lib/api/client.test.ts (4 tests) 97ms
 ✓ src/lib/api/payments.test.ts (4 tests) 128ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 142ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 137ms
 ✓ src/lib/api/auth.test.ts (9 tests) 146ms
 ✓ src/lib/api/learning.test.ts (34 tests) 139ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 421ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 83ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 7ms

 Test Files  10 passed (10)
      Tests  96 passed (96)
   Start at  22:20:39
   Duration  24.30s (transform 6.40s, setup 16.02s, collect 12.53s, tests 1.31s, environment 173.29s, prepare 4.13s)


> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2735 modules transformed.
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
dist/assets/googleOAuth-aaAOM7oo.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-DygG_jt-.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-BlYdYEzP.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-OmsUGGNd.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-ByrkHC3p.js                          0.66 kB │ gzip:   0.39 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/assessment-DoyBXn49.js                     0.97 kB │ gzip:   0.39 kB
dist/assets/ErrorState-D_gmwVWD.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-wqVd6gVD.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-CEda5BuS.js                           1.15 kB │ gzip:   0.46 kB
dist/assets/button-Bpy35tcI.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-CT_WPG6o.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-CSlyjMME.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/learning-D0udDoyV.js                       1.84 kB │ gzip:   0.63 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-BtOWO8wY.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-BG2RQRPA.js                    2.13 kB │ gzip:   1.24 kB
dist/assets/FullTestsPage-Cy1EpbFl.js                  2.21 kB │ gzip:   1.30 kB
dist/assets/ListeningPage-CBue1TNQ.js                  2.22 kB │ gzip:   1.27 kB
dist/assets/sheet-DCTvSo4Q.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-I0rOUVOg.js                         2.34 kB │ gzip:   0.94 kB
dist/assets/AuthCallback-B9MmDiGL.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-BTW76DeV.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-C9IeW4s9.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-CqeC13xS.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-CpYMcoOQ.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-DPXYV85M.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-C78fmddS.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-Bt786Ls3.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-BrwfcDEF.js                 4.97 kB │ gzip:   2.09 kB
dist/assets/MysteryChestModal-B_TPz5DJ.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-rLMMVADN.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-ClgZl0gC.js                          5.36 kB │ gzip:   2.07 kB
dist/assets/FullTestList-zUvbY8rn.js                   5.87 kB │ gzip:   2.49 kB
dist/assets/ResetPassword-DFZd3DfM.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-d_YtrBnp.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-CclDOE7L.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-D4LXx3nn.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-BJmFEuml.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-B_8fT4oM.js          7.82 kB │ gzip:   3.36 kB
dist/assets/AdminDashboard-Bav3tQab.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-COQtYJQg.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-7Y6Rka2p.js                          9.79 kB │ gzip:   3.79 kB
dist/assets/AdminCourses-BAOjAq5O.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/useGamification-CRMVgj8P.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminEnrollments-BL5YcYsX.js              10.64 kB │ gzip:   3.29 kB
dist/assets/AdminCourseNew-BXYCNMW1.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-BmuIawQT.js            12.29 kB │ gzip:   3.46 kB
dist/assets/homepageShowcaseService-TLPvYs9Q.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-Guh1VEoq.js                     14.27 kB │ gzip:   4.01 kB
dist/assets/AdminCategories-98cAVp0Y.js               14.73 kB │ gzip:   4.74 kB
dist/assets/AdminMaterials-CzjbJQIT.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-X7WRN46a.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-CdqjWIHV.js               18.54 kB │ gzip:   5.64 kB
dist/assets/StudentLayout-D5rNCqtR.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-DJmy2NBh.js                 19.25 kB │ gzip:   5.83 kB
dist/assets/select-C6QCBPby.js                        21.25 kB │ gzip:   7.39 kB
dist/assets/AdminFullTestManager-BhSkAahr.js          22.88 kB │ gzip:   7.21 kB
dist/assets/AdminBackup-CbSRXQlD.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/AdminGamesConfig-DMYDSCkT.js              25.47 kB │ gzip:   7.54 kB
dist/assets/FullTestResult-BeIXvIwu.js                25.77 kB │ gzip:   7.51 kB
dist/assets/QuizPage-BgOJFN3R.js                      25.93 kB │ gzip:   7.77 kB
dist/assets/QuizResult-D2Otew-i.js                    27.99 kB │ gzip:   7.83 kB
dist/assets/AdminVocabPacks-felLVODY.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-DCVPcl8_.js                      37.66 kB │ gzip:   9.44 kB
dist/assets/AdminSettings-XvsoDnO9.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-DgUEcQ7g.js                       40.64 kB │ gzip:  10.42 kB
dist/assets/LearnPage-BHPQHKy9.js                     40.82 kB │ gzip:  11.21 kB
dist/assets/UpgradeProModal-8zmTM0qQ.js               41.34 kB │ gzip:  11.91 kB
dist/assets/AdminFullTestQuestions-Z6HpmyAg.js        43.64 kB │ gzip:   9.68 kB
dist/assets/WordShooterLeaderboardModal-Dz3R_6m4.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-CTVc7htG.js                  58.03 kB │ gzip:  15.40 kB
dist/assets/Index-CsL8R8Dw.js                         59.64 kB │ gzip:  15.42 kB
dist/assets/DashboardPage-BIsSIHUB.js                 67.51 kB │ gzip:  15.22 kB
dist/assets/WordDefenseGame-qL99ocxu.js               73.08 kB │ gzip:  18.40 kB
dist/assets/WordShooterGame-87QPqDWP.js               78.41 kB │ gzip:  21.34 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-B-UHv312.js                         95.82 kB │ gzip:  33.18 kB
dist/assets/DictationPage-KbpXnycC.js                110.40 kB │ gzip:  26.49 kB
dist/assets/vocabPacksService-bmeP2A8k.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-CTZT3hTp.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-DcOHqQ1L.js               338.88 kB │ gzip:  55.20 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-BMfUt3Ni.js            651.43 kB │ gzip: 172.95 kB
✓ built in 26.52s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
src/pages/DashboardPage.tsx:314:        supabase.from("user_quiz_results").select("user_id, time_spent_seconds"),
7ba262f feat(assessment): add quiz results list endpoints and migrate 4 pages (T-011)
81b2a40 docs(tasks): queue T-015 payments admin and T-016 admin enrollments list
5d5ba68 chore(render): add payment env vars to staging blueprint
 .../modules/assessment/assessment.controller.ts    |  34 +++
 .../src/modules/assessment/assessment.mapper.ts    |  33 ++-
 .../modules/assessment/assessment.repository.ts    |  57 +++++
 .../modules/assessment/assessment.service.spec.ts  |  84 +++++++
 .../src/modules/assessment/assessment.service.ts   |  10 +
 .../src/modules/assessment/dto/quiz-result.dto.ts  |  48 ++++
 backend/test/assessment-results.e2e-spec.ts        | 255 +++++++++++++++++++++
 docs/tasks/T-011-quiz-results-lists.md             |  14 +-
 src/lib/api/assessment.test.ts                     |  18 ++
 src/lib/api/assessment.ts                          |  39 ++++
 src/pages/DashboardPage.tsx                        |   7 +-
 src/pages/LearnPage.tsx                            |   7 +-
 src/pages/Profile.tsx                              |   7 +-
 src/pages/admin/AdminStudentDetail.tsx             |   7 +-
 14 files changed, 594 insertions(+), 26 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có.

## 9. Review (Claude điền)
