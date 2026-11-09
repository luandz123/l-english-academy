# T-020: Dashboard, Báo cáo, Danh sách học viên (admin) qua API

> **Người làm**: Antigravity · **Module**: Admin · **Nhánh**: `task/T-020-admin-stats`
> **Phụ thuộc**: **T-018 ✅ merged** (cùng sửa `backend/src/modules/admin/`) · **Ước lượng**: 2,5 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/admin/` (T-014, T-018 — làm theo đúng mẫu), file này.

## 1. Mục tiêu
3 trang admin đọc thẳng Supabase (đếm, 5 bản ghi gần nhất, dữ liệu thô để client tự gộp). Thêm endpoint admin **trả dữ liệu thô đúng shape cũ** và chuyển truy vấn. **Giữ nguyên mọi phép gộp/tính toán ở client** (đếm theo khóa, tỉ lệ đúng, trạng thái học viên) — chỉ thay nguồn dữ liệu.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/admin/**` (thêm `admin-stats.controller.ts` hoặc thêm route vào controller admin; service/repository/mapper/DTO; spec), `backend/test/admin-stats.e2e-spec.ts`; `src/lib/api/admin.ts` + `.test.ts`; **chỉ** thân `queryFn` + `import` ở `src/pages/admin/AdminDashboard.tsx`, `AdminReports.tsx`, `AdminStudents.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`; các dòng tính toán sau khi có dữ liệu (`scoreMap`, `qMap`, `sorted`, `enrollMap`, `status`…) — giữ nguyên từng dòng; `createStudentMutation` của `AdminStudents` (đã chuyển ở P1); module khác.

## 3. Hành vi cũ → mới (tất cả route dưới `/api/v1/admin/stats`, guard admin cấp class)
| PARITY | Chỗ cũ | Cũ | Route mới → trả về |
|---|---|---|---|
| ADM-001 | `AdminDashboard.tsx:13-34` | 3 lệnh đếm: `profiles` (tất cả), `courses` `is_active = true`, `user_quiz_results` (tất cả) | `GET /counts` → `{ total_students, total_courses, total_quiz_attempts }`; 3 `queryFn` đọc đúng trường của mình, `?? 0` như cũ |
| ADM-001 | `AdminDashboard.tsx:36-57` | `enrollments.select("*, courses(title)").order(enrolled_at desc).limit(5)` + gắn `profiles { user_id, full_name }` | `GET /recent-enrollments` → mảng đã gắn sẵn `courses` và `profiles`; `queryFn` = `return data ?? []` |
| ADM-001 | `AdminDashboard.tsx:60-81` | `user_quiz_results.select("*, quizzes(title)").order(completed_at desc).limit(5)` + gắn `profiles` | `GET /recent-results` → như trên (`score` là number) |
| ADM-001 | `AdminDashboard.tsx:85-90` | `quizzes.select("id, title")` + `user_quiz_results.select("quiz_id, score")` | `GET /quiz-scores` → `{ quizzes: {id,title}[], results: {quiz_id,score}[] }`; `queryFn` lấy 2 mảng rồi **giữ nguyên** đoạn `if (!quizzes?.length) return []`… và `scoreMap` |
| ADM-018 | `AdminReports.tsx:12-20` | `courses.select("id, title").eq(is_active, true)` + `enrollments.select("course_id")` | `GET /course-enrollments` → `{ courses: {id,title}[], enrollments: {course_id}[] }`; giữ `countMap` |
| ADM-018 | `AdminReports.tsx:24-50` | `user_answers.select("question_id, is_correct")` → client chọn 5 câu khó nhất → `questions.select("id, question_text").in(id)` | `GET /answers` → `{question_id,is_correct}[]` và `GET /questions?ids=1,2,3` → `{id,question_text}[]` (tối đa 50 id); giữ nguyên `qMap`/`sorted`/thay `[PASSAGE]` |
| ADM-002 | `AdminStudents.tsx:55-75` | `profiles.select("*").order(created_at desc)` + `enrollments.select("user_id, expires_at")` | `GET /students` → `{ profiles: ProfileRow[], enrollments: {user_id,expires_at}[] }`; giữ `enrollMap`, `status` |

- `ProfileRow`: đủ cột `profiles` snake_case như `select("*")` (dùng lại mapper profile có sẵn ở module Auth nếu được export; nếu không, map đủ cột trong mapper Admin).
- Join/đọc bảng của module khác (Catalog, Learning, Assessment, Auth) **chỉ đọc**, trong `AdminRepository`, ghi chú lý do (thống kê toàn hệ thống). `score` numeric → number.
- Thứ tự như cũ; `limit(5)` ở server.

## 4. Tiêu chí nghiệm thu
- [x] E2E: mọi route × 3 vai (401/403/200)
- [x] E2E: `counts` đúng (seed 2 khóa active + 1 ẩn → `total_courses = 2`); `recent-*` tối đa 5, mới nhất trước, có `profiles.full_name`; `questions?ids=` chỉ trả id được hỏi, > 50 id → 400
- [x] Adapter test; `grep -n "supabase" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminReports.tsx` rỗng; `AdminStudents.tsx` không còn `from("profiles")`/`from("enrollments")`; `check-ui-diff` OK
- [x] `git diff` 3 trang: các dòng tính toán sau khi có dữ liệu **không đổi**

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 6, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n "supabase" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminStudents.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Kết quả (người làm điền)

### 6.1. Docker Postgres
```
 Container l-english-academy-postgres-1  Running
```

### 6.2. Backend lint, typecheck, test, test:e2e, build
```
> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts

Test Suites: 21 passed, 21 total
Tests:       212 passed, 212 total
Snapshots:   0 total
Time:        4.502 s, estimated 5 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/health.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/auth.e2e-spec.ts (6.027 s)
PASS test/learning-access.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/admin-stats.e2e-spec.ts

Test Suites: 16 passed, 16 total
Tests:       238 passed, 238 total
Snapshots:   0 total
Time:        62.639 s
Ran all test suites.

> backend@0.0.1 build
> nest build
```

### 6.3. Frontend test, build, check-ui-diff
```
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 16ms
 ✓ src/lib/api/client.test.ts (4 tests) 165ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 222ms
 ✓ src/lib/api/auth.test.ts (9 tests) 240ms
 ✓ src/lib/api/admin.test.ts (16 tests) 233ms
 ✓ src/lib/api/payments.test.ts (8 tests) 263ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 233ms
 ✓ src/lib/api/catalog.test.ts (19 tests) 236ms
 ✓ src/lib/api/learning.test.ts (45 tests) 269ms
 ✓ src/test/part2Audio.test.ts (3 tests) 500ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 25ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 45ms

 Test Files  12 passed (12)
      Tests  142 passed (142)
   Start at  01:17:40
   Duration  8.75s (transform 8.59s, setup 7.53s, collect 20.37s, tests 2.45s, environment 22.22s, prepare 2.85s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                        1.71 kB │ gzip:   0.80 kB
dist/assets/index-DnZVuPdT.css                       310.27 kB │ gzip:  40.21 kB
...
✓ built in 28.93s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```

### 6.4. Grep supabase in admin pages
```
grep -n "supabase" src/pages/admin/AdminDashboard.tsx src/pages/admin/AdminReports.tsx src/pages/admin/AdminStudents.tsx
(không có kết quả — mã thoát 1 — hoàn toàn sạch supabase)
```

### 6.5. Git log and git diff stat
```
09e0ff4 feat(admin): add admin stats and reports API and migrate dashboard callers
96842e7 docs: record T-018 review PASS, update queue and settings rows
3c0cbc3 merge: T-018 platform settings via API (review PASS)

 backend/src/modules/admin/admin-stats.controller.ts | 108 ++++++
 backend/src/modules/admin/admin.mapper.ts           |  73 ++--
 backend/src/modules/admin/admin.module.ts           |   3 +-
 backend/src/modules/admin/admin.repository.ts       | 177 +++++++++
 backend/src/modules/admin/admin.service.spec.ts     | 198 ++++++++++
 backend/src/modules/admin/admin.service.ts          |  85 ++++-
 backend/src/modules/admin/dto/admin-stats.dto.ts    | 163 ++++++++
 backend/src/modules/admin/dto/index.ts              |   1 +
 backend/test/admin-stats.e2e-spec.ts                | 530 ++++++++++++++++++++++++++
 src/lib/api/admin.test.ts                           | 125 ++++++-
 src/lib/api/admin.ts                                | 137 ++++++-
 src/pages/admin/AdminDashboard.tsx                  |  70 +---
 src/pages/admin/AdminReports.tsx                    |  18 +-
 src/pages/admin/AdminStudents.tsx                   |   8 +-
 14 files changed, 1638 insertions(+), 58 deletions(-)
```

## 7. Câu hỏi (người làm điền khi bị chặn)

## 8. Review (Claude điền)
**PASS** (Claude, 2026-10-29) — merge vào `refactor/nestjs-backend`. Review trên `7845bfe`.
- Route `/admin/stats/*` đúng mục 3, guard admin; giới hạn 50 id; 3 trang giữ nguyên mọi dòng tính toán (`scoreMap`, `countMap`, `qMap`/`sorted`, `enrollMap`/`status`), không còn Supabase.
- Lệch nhỏ (chấp nhận): thêm `if (error) throw error` ở các `queryFn` mà code cũ bỏ qua lỗi. Hiển thị không đổi vì `useQuery` rơi về giá trị mặc định `0`/`[]` khi lỗi; chỉ thêm 1 lần retry.
- Sau gộp: lint/typecheck sạch, unit 221/221, e2e 249/249, vitest 152/152, `check-ui-diff` OK, build OK.
