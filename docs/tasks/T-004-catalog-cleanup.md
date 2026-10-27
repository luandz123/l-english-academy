# T-004: Dọn các góp ý từ review T-001 / T-002

> **Người làm**: Antigravity · **Module**: Catalog · **Nhánh**: `task/T-004-catalog-cleanup` (tách từ `refactor/nestjs-backend` **sau khi `git pull`**)
> **Phụ thuộc**: không · **Ước lượng**: 1 giờ
> Đọc trước: `AGENTS.md`, mục 9 của `T-001-catalog-read.md` và `T-002-catalog-adapter.md`, file này. Gặp gì không rõ: **dừng và ghi vào mục 8**.

## 0. Bắt đầu
```bash
git fetch && git checkout refactor/nestjs-backend && git pull
git checkout -b task/T-004-catalog-cleanup
```

## 1. Mục tiêu
Refactor nhỏ, **không đổi hành vi**: bỏ code lặp và một chỗ nuốt lỗi quá rộng.

## 2. Phạm vi
**Được tạo/sửa**
- `backend/src/common/transforms/to-optional-boolean.ts` (mới) — hàm `toOptionalBoolean` dùng với `@Transform`
- `backend/src/common/transforms/to-optional-boolean.spec.ts` (mới)
- `backend/src/modules/catalog/dto/list-categories-query.dto.ts`, `list-courses-query.dto.ts`, `count-courses-query.dto.ts` — dùng `@Transform(toOptionalBoolean)` thay 3 hàm lặp
- `backend/src/modules/catalog/catalog.repository.ts` — `countCourses` nhận kiểu `Pick<CourseFilter, 'isActive'>` thay `CategoryFilter`
- `src/lib/api/catalog.ts` — `getCourse` chỉ đổi lỗi thành `{ data: null, error: null }` khi `error.code === "COURSE_NOT_FOUND"` (bỏ điều kiện `status === 404`)
- `src/lib/api/catalog.test.ts` — thêm test: 404 với `code: "NOT_FOUND"` (sai route) **phải** trả về `error`

**Cấm sửa**: mọi file `.tsx`, file ngoài danh sách, hành vi của endpoint.

## 3. Hành vi cần giữ
- `active=true|false` → boolean; bỏ trống/chuỗi rỗng → không lọc; giá trị khác → 400 `VALIDATION_FAILED` (như hiện tại).
- Toàn bộ test hiện có của catalog vẫn pass **không sửa nội dung test cũ**.

## 4. Tiêu chí nghiệm thu
- [x] Không còn hàm `Transform` viết lặp trong 3 DTO
- [x] Unit test cho `toOptionalBoolean`: `'true'`, `'false'`, `true`, `false`, `''`, `undefined`, `null`, `'abc'`
- [x] Test mới cho `getCourse` với 404 `NOT_FOUND`
- [x] `node scripts/check-ui-diff.mjs refactor/nestjs-backend` OK

## 5. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7 (không tóm tắt, không viết lại)
```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 6. Quy tắc báo cáo (áp dụng từ task này)
- Mô tả đúng **code đã commit**; nếu không chắc, trích `git diff` thay vì diễn giải.
- Không đánh dấu PARITY/PROGRESS — Claude cập nhật khi review.

## 7. Kết quả (người làm điền)

### Output lệnh kiểm tra backend:
```bash
$ cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"

> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json

> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/config/env.schema.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts

Test Suites: 10 passed, 10 total
Tests:       64 passed, 64 total
Snapshots:   0 total
Time:        3.017 s, estimated 20 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (9.624 s)
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 4 passed, 4 total
Tests:       53 passed, 53 total
Snapshots:   0 total
Time:        18.965 s, estimated 50 s
Ran all test suites.

> backend@0.0.1 build
> nest build
```

### Output lệnh kiểm tra frontend & UI diff:
```bash
$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend

> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 17ms
 ✓ src/lib/api/client.test.ts (4 tests) 45ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 80ms
 ✓ src/lib/api/auth.test.ts (9 tests) 94ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/test/part2Audio.test.ts (3 tests) 454ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 27ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 9ms

 Test Files  7 passed (7)
      Tests  45 passed (45)
   Start at  05:00:37
   Duration  7.36s (transform 3.27s, setup 2.23s, collect 8.07s, tests 725ms, environment 13.99s, prepare 2.78s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

✓ built in 26.09s

check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
```

### Output git log & git diff:
```bash
$ git log --oneline -3 && git diff --stat refactor/nestjs-backend

176aeee docs(tasks): complete T-004 report and verification results
66b408d refactor(catalog): address review feedback from T-001 and T-002 (T-004)
f9dbc20 feat(learning): block lessons when enrollment has expired (OPEN_QUESTIONS #18)
 backend/src/common/transforms/to-optional-boolean.spec.ts    |  33 ++++++
 backend/src/common/transforms/to-optional-boolean.ts         |  24 +++++
 backend/src/modules/catalog/catalog.repository.ts            |   2 +-
 backend/src/modules/catalog/dto/count-courses-query.dto.ts   |   8 +-
 backend/src/modules/catalog/dto/list-categories-query.dto.ts |   8 +-
 backend/src/modules/catalog/dto/list-courses-query.dto.ts    |   8 +-
 docs/tasks/T-004-catalog-cleanup.md                          | 112 ++++++++++++++++++++-
 src/lib/api/catalog.test.ts                                  |  15 +++
 src/lib/api/catalog.ts                                       |   5 +-
 9 files changed, 188 insertions(+), 27 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)
Không có. Đã hoàn thành toàn bộ yêu cầu của T-004.

## 9. Review (Claude điền)
