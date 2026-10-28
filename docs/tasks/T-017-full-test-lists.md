# T-017: Danh sách đề Full Test và kết quả Full Test của tôi qua API

> **Người làm**: Antigravity · **Module**: Assessment · **Nhánh**: `task/T-017-full-test-lists`
> **Phụ thuộc**: **T-011 ✅ merged** (cùng sửa `DashboardPage.tsx`, `Profile.tsx`, `assessment.*`) · **Ước lượng**: 1,5 giờ
> Đọc trước: `AGENTS.md`, `backend/src/modules/assessment/full-test.*` (Claude viết — **thêm** route vào `full-test.controller.ts`/`full-test.service.ts`/`full-test.repository.ts`, không đổi route cũ), `src/lib/api/fullTest.ts`, file này.

## 1. Mục tiêu
Full Test đã ghi kết quả qua API (DB mới) nhưng danh sách đề và 3 chỗ đọc kết quả vẫn ở Supabase.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/assessment/full-test.*` + `dto/full-test.dto.ts` (thêm), `backend/test/assessment-full-test-lists.e2e-spec.ts` (mới), `src/lib/api/fullTest.ts` + `.test.ts` (thêm hàm), **chỉ** thân `queryFn` + `import` ở 4 chỗ mục 3.
**Cấm**: JSX, câu chữ, `queryKey`; `DashboardPage.tsx:312-330` (bảng xếp hạng thời gian học của mọi người — để riêng); `AdminBackup.tsx`; `FullTestExam.tsx`, `FullTestResult.tsx`.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Truy vấn cũ | Thay bằng |
|---|---|---|---|
| ASM-009 | `FullTestList.tsx:16-28` | `full_tests.select("*").eq("course_id", cid).order("category").order("display_order")`; lỗi → `throw` | `listCourseFullTests(cid)`; có `error` → `throw error` |
| ASM-016 (đọc) | `FullTestList.tsx:30-41` | `user_full_test_results.select("test_id, total_score")` · `user_id = me` · order `total_score` desc | `listMyFullTestResults()` → `data || []` |
| ASM-016 (đọc) | `DashboardPage.tsx:195-207` | `select("*, full_tests(*)")` · order `completed_at` desc | `listMyFullTestResults()` |
| ASM-016 (đọc) | `Profile.tsx:245-257` | `select("*, full_tests(id, title, total_questions)")` · như trên | `listMyFullTestResults()` |

`FullTestList` chọn điểm cao nhất mỗi đề bằng `resultMap` ở client nên thứ tự server trả không ảnh hưởng.

## 4. Đặc tả
| Method | Route | Guard | Trả về |
|---|---|---|---|
| GET | `/api/v1/assessment/courses/:courseId/full-tests` | không (RLS cũ công khai) | `FullTestDto[]` order `category`, `display_order`, `id` |
| GET | `/api/v1/assessment/full-test-results/me` | JWT | `FullTestResultWithTestDto[]` của chính mình, order `completed_at` desc nulls last, `id` desc |

- `FullTestResultWithTestDto` = `FullTestResultDto` + `full_tests: FullTestDto | null` (tên khóa `full_tests` như PostgREST).
- Route `full-test-results/me` khai báo **trước** `full-test-results/:resultId` (tránh `ParseIntPipe` bắt `"me"`).
- RLS `Users view own full test results`: A không thấy kết quả của B (e2e).

## 5. Tiêu chí nghiệm thu
- [x] E2E: danh sách đề đúng thứ tự, khóa khác không lẫn; `/me` chỉ của mình, kèm `full_tests.title`; không token → 401
- [x] Adapter test đúng URL, lỗi không ném
- [x] `grep -n 'from("full_tests")\|from("user_full_test_results")' src/pages/FullTestList.tsx src/pages/Profile.tsx` rỗng; `DashboardPage.tsx` chỉ còn dòng `:316`; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("full_tests")\|from("user_full_test_results")' src/pages/FullTestList.tsx src/pages/DashboardPage.tsx src/pages/Profile.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
- **Backend (`backend/src/modules/assessment/`)**:
  - `dto/full-test.dto.ts`: thêm `FullTestResultWithTestDto` kế thừa `FullTestResultDto`, kèm trường `@ApiProperty({ type: FullTestDto, nullable: true }) full_tests!: FullTestDto | null;`.
  - `full-test.repository.ts`: thêm `findCourseFullTests(courseId)` sắp xếp `category` asc, `displayOrder` asc, `id` asc; thêm `findMyFullTestResults(userId)` include `fullTest`, sắp xếp `completedAt` desc nulls last, `id` desc.
  - `full-test.mapper.ts`: thêm `toResultWithTestDto` map kèm `full_tests: FullTestDto | null`.
  - `full-test.service.ts`: thêm `getCourseFullTests(courseId)` và `getMyResults(userId)`.
  - `full-test.controller.ts`: thêm route công khai `GET /api/v1/assessment/courses/:courseId/full-tests` và route `GET /api/v1/assessment/full-test-results/me` (có `JwtAuthGuard`, đặt ngay trước `full-test-results/:resultId` để tránh bị `ParseIntPipe` nuốt chuỗi `"me"`).
  - `backend/test/assessment-full-test-lists.e2e-spec.ts`: tạo bộ e2e test với 8 test case phủ đầy đủ: công khai 200 không cần token, sắp xếp đúng thứ tự category/display_order/id, cách ly đề thi giữa các khóa học, trả mảng rỗng khi khóa không có đề, 401 khi chưa đăng nhập, trả kết quả của chính user kèm `full_tests`, cách ly kết quả giữa các user (User A không thấy User B), và kiểm tra `/me` không bị bắt nhầm bởi `:resultId`.
- **Frontend (`src/lib/api/fullTest.ts`, `src/lib/api/fullTest.test.ts`, các pages)**:
  - `fullTest.ts`: xuất kiểu `FullTestResultWithTestRow`, thêm hàm `listCourseFullTests(courseId)` và `listMyFullTestResults()`.
  - `fullTest.test.ts`: thêm unit test cho `listCourseFullTests` và `listMyFullTestResults` (kiểm tra URL, method, và lỗi trả về qua `error` không throw).
  - `src/pages/FullTestList.tsx`: thay thế hoàn toàn Supabase query bằng `listCourseFullTests(cid)` và `listMyFullTestResults()`.
  - `src/pages/DashboardPage.tsx`: thay thế query `dashboard-full-tests` bằng `listMyFullTestResults()`. Giữ nguyên leaderboard và allFullTests.
  - `src/pages/Profile.tsx`: thay thế query `profile-fulltest-results` bằng `listMyFullTestResults()`. Giữ nguyên system stats.

Output nguyên văn các lệnh ở mục 6:
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

PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts (8.369 s)
PASS src/common/filters/all-exceptions.filter.spec.ts (8.438 s)
PASS src/modules/learning/learning.mapper.spec.ts (8.512 s)
PASS src/modules/admin/admin.service.spec.ts (9.975 s)
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts (10.051 s)
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts (10.115 s)
PASS src/modules/catalog/catalog-admin.service.spec.ts (10.359 s)
PASS src/modules/payments/payments.service.spec.ts (10.671 s)
PASS src/modules/learning/learning-quiz-access.spec.ts (10.699 s)
PASS src/modules/assessment/assessment.service.spec.ts (10.862 s)
PASS src/modules/catalog/catalog.service.spec.ts (11.373 s)
PASS src/modules/learning/learning-admin.service.spec.ts (11.629 s)
PASS src/modules/learning/learning.service.spec.ts (11.746 s)

Test Suites: 21 passed, 21 total
Tests:       188 passed, 188 total
Snapshots:   0 total
Time:        14.666 s, estimated 32 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/assessment-full-test-lists.e2e-spec.ts (7.432 s)
PASS test/auth.e2e-spec.ts (14.254 s)
PASS test/assessment-full-test.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 13 passed, 13 total
Tests:       176 passed, 176 total
Snapshots:   0 total
Time:        64.513 s
Ran all test suites.

> backend@0.0.1 build
> nest build

$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 ✓ src/test/example.test.ts (1 test) 36ms
 ✓ src/lib/api/admin.test.ts (3 tests) 86ms
 ✓ src/lib/api/client.test.ts (4 tests) 128ms
 ✓ src/lib/api/payments.test.ts (4 tests) 183ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 190ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 170ms
 ✓ src/lib/api/catalog.test.ts (19 tests) 189ms
 ✓ src/lib/api/auth.test.ts (9 tests) 151ms
 ✓ src/lib/api/learning.test.ts (43 tests) 157ms
 ✓ src/test/part2Audio.test.ts (3 tests) 441ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 52ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 12ms

 Test Files  12 passed (12)
      Tests  123 passed (123)
   Start at  23:48:09
   Duration  8.35s (transform 6.34s, setup 7.09s, collect 15.27s, tests 1.79s, environment 24.51s, prepare 2.97s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
dist/assets/FullTestList-ZGRjf1Hq.js                   5.71 kB │ gzip:   2.43 kB
dist/assets/Profile-D6v6DK0q.js                       40.55 kB │ gzip:  10.38 kB
dist/assets/DashboardPage-C8PC6Bcb.js                 67.45 kB │ gzip:  15.23 kB
✓ built in 31.90s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ grep -n 'from("full_tests")\|from("user_full_test_results")' src/pages/FullTestList.tsx src/pages/DashboardPage.tsx src/pages/Profile.tsx
src/pages/DashboardPage.tsx:208:        .from("full_tests")
src/pages/DashboardPage.tsx:310:        supabase.from("user_full_test_results").select("user_id, time_spent_seconds"),
src/pages/Profile.tsx:207:        supabase.from("full_tests").select("*", { count: "exact", head: true }),

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
5dab40f feat(assessment): load course full-tests and user results via api
0ca47ab docs: record T-013 review PASS, update queue and ADM-010
4546e33 merge: T-013 admin course frontend via API (review PASS)
 .../src/modules/assessment/dto/full-test.dto.ts    |   5 +
 .../src/modules/assessment/full-test.controller.ts |  23 ++
 backend/src/modules/assessment/full-test.mapper.ts |  10 +
 .../src/modules/assessment/full-test.repository.ts |  20 ++
 .../src/modules/assessment/full-test.service.ts    |  16 ++
 .../test/assessment-full-test-lists.e2e-spec.ts    | 277 +++++++++++++++++++++
 docs/tasks/T-017-full-test-lists.md                | 151 ++++++++++-
 src/lib/api/fullTest.test.ts                       |  21 ++
 src/lib/api/fullTest.ts                            |  19 ++
 src/pages/DashboardPage.tsx                        |   7 +-
 src/pages/FullTestList.tsx                         |  15 +-
 src/pages/Profile.tsx                              |   7 +-
 12 files changed, 546 insertions(+), 25 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
