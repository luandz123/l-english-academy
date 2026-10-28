# T-016: Danh sách ghi danh toàn hệ thống (admin) qua API

> **Người làm**: Antigravity · **Module**: Learning · **Nhánh**: `task/T-016-admin-enrollments-list`
> **Phụ thuộc**: **T-015 ✅ merged** (cùng sửa `AdminEnrollments.tsx`) · **Ước lượng**: 1 giờ
> Đọc trước: `AGENTS.md`, `T-009-learning-admin.md` mục 4.3, file này.

## 1. Mục tiêu
Tab "Đăng ký khóa học" ở `/admin/enrollments` đọc mọi `enrollments` từ Supabase. Thêm 1 endpoint admin và chuyển query đó.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/learning/` (thêm route vào `learning-admin.controller.ts`, method service/repository/mapper, DTO), `backend/test/learning-admin.e2e-spec.ts` (thêm test), `src/lib/api/learning.ts` + `.test.ts` (thêm hàm), **chỉ** thân `queryFn` `admin-enrollments` + `import` ở `src/pages/admin/AdminEnrollments.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`; phần tính `remaining`/`status` trong `queryFn` (logic hiển thị — **giữ nguyên ở client**); module khác.

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-015 | `AdminEnrollments.tsx:63-100` | `enrollments.select("*, courses(title)").order(enrolled_at desc)` + `profiles.select("id, user_id, full_name").in(user_id)`; lỗi → `throw` | `const { data, error } = await listAllEnrollments(); if (error) throw error;` rồi **giữ nguyên** đoạn `map` tính `remaining`, `status`, nhưng `profiles` lấy sẵn từ server (bỏ truy vấn `profiles` thứ hai) |

## 4. Đặc tả
- `GET /api/v1/learning/admin/enrollments` (guard admin cấp class sẵn có) → `AdminEnrollmentListDto[]` order `enrolled_at` desc **nulls last**, `id` desc.
- `AdminEnrollmentListDto` = `AdminEnrollmentDto` (T-009, có `courses: { title } | null`) + `profiles: { id, user_id, full_name } | null` (join chỉ đọc `user → profile`).
- Trong `queryFn`: giữ `profiles` từ server thay cho `profiles?.find(...)` — đổi đúng biểu thức đó thành `e.profiles ?? null`; mọi dòng khác của `map` giữ nguyên.

## 5. Tiêu chí nghiệm thu
- [x] E2E 3 vai; thứ tự; có `courses.title` và `profiles.full_name`; user không có profile → `profiles: null`
- [x] `grep -n 'from("enrollments")\|from("profiles")' src/pages/admin/AdminEnrollments.tsx` rỗng (sau T-015 thì không còn `profiles` nào); `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'from("enrollments")\|from("profiles")' src/pages/admin/AdminEnrollments.tsx
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

PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts (9.071 s)
PASS src/modules/learning/learning.mapper.spec.ts (9.074 s)
PASS src/common/filters/all-exceptions.filter.spec.ts (9.109 s)
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts (10.748 s)
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts (10.768 s)
PASS src/modules/admin/admin.service.spec.ts (11.715 s)
PASS src/modules/catalog/catalog-admin.service.spec.ts (11.764 s)
PASS src/modules/payments/payments.service.spec.ts (11.804 s)
PASS src/modules/learning/learning-quiz-access.spec.ts (11.848 s)
PASS src/modules/assessment/assessment.service.spec.ts (11.93 s)
PASS src/modules/catalog/catalog.service.spec.ts (14.496 s)
PASS src/modules/learning/learning-admin.service.spec.ts (14.586 s)
PASS src/modules/learning/learning.service.spec.ts (14.61 s)

Test Suites: 21 passed, 21 total
Tests:       195 passed, 195 total
Snapshots:   0 total
Time:        18.141 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (29.445 s)
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/health.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts

Test Suites: 13 passed, 13 total
Tests:       176 passed, 176 total
Snapshots:   0 total
Time:        43.025 s, estimated 59 s
Ran all test suites.

> backend@0.0.1 build
> nest build

$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 4ms
 ✓ src/lib/api/client.test.ts (4 tests) 16ms
 ✓ src/lib/api/admin.test.ts (3 tests) 15ms
 ✓ src/lib/api/fullTest.test.ts (5 tests) 19ms
 ✓ src/lib/api/payments.test.ts (8 tests) 21ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 22ms
 ✓ src/lib/api/auth.test.ts (9 tests) 16ms
 ✓ src/lib/api/catalog.test.ts (19 tests) 24ms
 ✓ src/lib/api/learning.test.ts (45 tests) 38ms
 ✓ src/test/part2Audio.test.ts (3 tests) 399ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 14ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 5ms

 Test Files  12 passed (12)
      Tests  127 passed (127)
   Start at  00:10:04
   Duration  37.55s (transform 2.35s, setup 45.00s, collect 9.64s, tests 594ms, environment 198.32s, prepare 7.02s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 27.38s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ grep -n 'from("enrollments")\|from("profiles")' src/pages/admin/AdminEnrollments.tsx
(empty - exit code 1)

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
2e5ef6e feat(learning): add admin list all enrollments endpoint and migrate AdminEnrollments
21a92e2 docs(tasks): queue T-018 platform settings and T-019 admin courses/categories
4bdd0a4 docs: record T-015 review PASS, update queue and payments rows
 backend/src/modules/learning/dto/admin-enrollment.dto.ts   | 16 ++++++
 backend/src/modules/learning/learning-admin.controller.ts  | 12 +++++
 backend/src/modules/learning/learning-admin.service.spec.ts| 44 ++++++++++++++++
 backend/src/modules/learning/learning-admin.service.ts     |  6 +++
 backend/src/modules/learning/learning.mapper.spec.ts       | 48 ++++++++++++++++++
 backend/src/modules/learning/learning.mapper.ts            | 17 +++++++
 backend/src/modules/learning/learning.repository.ts        | 33 ++++++++++++
 backend/test/learning-admin.e2e-spec.ts                    | 58 ++++++++++++++++++++++
 src/lib/api/learning.test.ts                               | 35 +++++++++++++
 src/lib/api/learning.ts                                    | 17 +++++++
 src/pages/admin/AdminEnrollments.tsx                       | 15 ++----
 11 files changed, 289 insertions(+), 12 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
