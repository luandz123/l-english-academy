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
- [x] E2E 2 route × 3 vai; enrollments đúng thứ tự, có `profiles.full_name`, khóa khác không lẫn; profile của user không có profile → `{ profile: null }`
- [x] Adapter test (`listCourseEnrollments`, `getStudentProfile`): đúng URL, bóc `.profile`, lỗi không ném
- [x] `grep -nE 'from\("(profiles|courses|enrollments|full_tests)"\)' src/pages/admin/AdminStudentDetail.tsx src/pages/admin/AdminCourseDetail.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -nE 'from\("(profiles|courses|enrollments|full_tests)"\)' src/pages/admin/AdminStudentDetail.tsx src/pages/admin/AdminCourseDetail.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
```bash
$ docker compose up -d postgres
 Container l-english-academy-postgres-1  Running

$ cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/learning/lesson-access.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 21 passed, 21 total
Tests:       222 passed, 222 total
Snapshots:   0 total
Time:        2.625 s, estimated 16 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (7.162 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog-admin-courses.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 17 passed, 17 total
Tests:       252 passed, 252 total
Snapshots:   0 total
Time:        34.23 s, estimated 35 s
Ran all test suites.

> backend@0.0.1 build
> nest build

$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 3ms
 ✓ src/lib/api/client.test.ts (4 tests) 16ms
 ✓ src/lib/api/payments.test.ts (8 tests) 27ms
 ✓ src/lib/api/admin.test.ts (16 tests) 26ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 22ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 24ms
 ✓ src/lib/api/catalog.test.ts (29 tests) 35ms
 ✓ src/lib/api/auth.test.ts (12 tests) 22ms
 ✓ src/lib/api/learning.test.ts (47 tests) 45ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 13ms
 ✓ src/test/part2Audio.test.ts (3 tests) 394ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 4ms

 Test Files  12 passed (12)
      Tests  157 passed (157)
   Start at  08:24:38
   Duration  5.20s (transform 1.37s, setup 3.39s, collect 4.16s, tests 633ms, environment 24.53s, prepare 2.69s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
dist/assets/AdminCourseDetail-C2V8RUJ6.js            185.29 kB │ gzip:  50.13 kB
dist/assets/AdminStudentDetail-DXktrLMj.js            12.17 kB │ gzip:   3.43 kB
✓ built in 12.87s

check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ grep -nE 'from\("(profiles|courses|enrollments|full_tests)"\)' src/pages/admin/AdminStudentDetail.tsx src/pages/admin/AdminCourseDetail.tsx
(không có kết quả - rỗng)

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
de2804a feat(admin): migrate leftovers in student and course details to nestjs
7c2a5d9 docs(tasks): queue T-022 admin detail page leftovers
7bacf69 docs: record T-020 review PASS, update queue and admin rows
 backend/src/modules/auth/auth-admin.controller.ts  | 27 +++++-
 backend/src/modules/auth/auth.service.ts           |  5 ++
 backend/src/modules/auth/dto/profile.dto.ts        |  5 ++
 .../modules/learning/dto/admin-enrollment.dto.ts   | 16 ++++
 .../modules/learning/learning-admin.controller.ts  | 14 ++++
 .../learning/learning-admin.service.spec.ts        | 52 ++++++++++++
 .../src/modules/learning/learning-admin.service.ts |  6 ++
 backend/src/modules/learning/learning.mapper.ts    | 16 ++++
 .../src/modules/learning/learning.repository.ts    | 30 +++++++
 backend/test/auth.e2e-spec.ts                      | 68 +++++++++++++++
 backend/test/learning-admin.e2e-spec.ts            | 98 +++++++++++++++++++++-
 src/lib/api/auth.test.ts                           | 57 ++++++++++++-
 src/lib/api/auth.ts                                | 14 ++++
 src/lib/api/learning.test.ts                       | 37 ++++++++
 src/lib/api/learning.ts                            | 18 ++++
 src/pages/admin/AdminCourseDetail.tsx              | 29 ++-----
 src/pages/admin/AdminStudentDetail.tsx             | 11 ++-
 17 files changed, 472 insertions(+), 31 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
