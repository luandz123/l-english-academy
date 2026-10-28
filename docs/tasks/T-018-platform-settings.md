# T-018: Cài đặt nền tảng (`platform_settings`) qua API

> **Người làm**: Antigravity · **Module**: Admin · **Nhánh**: `task/T-018-platform-settings`
> **Phụ thuộc**: không · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, code `backend/src/modules/admin/` (T-014, làm theo đúng mẫu), file này.

## 1. Mục tiêu
3 nơi đọc/ghi `platform_settings` thẳng Supabase: cấu hình trang chủ (giá VIP, section), gói từ vựng game, trang cài đặt admin. Chuyển sang API.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/admin/**` (thêm `settings.controller.ts` cho route công khai, route admin vào controller admin, method service/repository, DTO, spec); `backend/test/platform-settings.e2e-spec.ts`; `src/lib/api/admin.ts` + `.test.ts` (thêm hàm); **chỉ** đoạn gọi Supabase trong `src/services/homepageShowcaseService.ts` (`:359-372` đọc, `:450-469` ghi), `src/services/vocabPacksService.ts` (`:29-40` đọc, `:98-125` ghi), `src/pages/admin/AdminSettings.tsx` (thân `queryFn` `admin-settings` + vòng lặp lưu trong `mutationFn`) và `import`.
**Cấm**: JSX, câu chữ, `queryKey`; logic gộp mặc định / cache `localStorage` trong 2 service (giữ nguyên, chỉ thay nguồn dữ liệu); module khác. Không đụng `PaymentsService` (đã tự đọc giá từ DB).

## 3. Hành vi cũ (RLS là nguồn sự thật)
- `Public read for non-sensitive platform settings` (`20261023_platform_settings_public_read.sql`): ai cũng đọc được **đúng** các key: `homepage_showcase_config`, `game_vocab_packs`, `platform_name`, `tagline`, `primary_color`, `accent_color`, `contact_email`, `contact_phone`.
- `Admins manage platform settings` (ALL): chỉ admin đọc mọi key và ghi.
- Ghi cũ: đọc xem key có chưa → `update` hoặc `insert` (2 lệnh rời). Mới: một upsert.

## 4. Đặc tả
| Method | Route | Guard | Body | Trả về |
|---|---|---|---|---|
| GET | `/api/v1/settings/:key` | không | — | `{ setting: SettingDto \| null }` |
| GET | `/api/v1/admin/settings` | admin | — | `SettingDto[]` order `key` |
| PUT | `/api/v1/admin/settings/:key` | admin | `{ value: string }` (`@IsString`, `@MaxLength(1_000_000)`) | `SettingDto` |

- `SettingDto`: `key, value, updated_at`.
- Route công khai: key **không** nằm trong danh sách mục 3 → `{ setting: null }` (không lộ key nhạy cảm, không báo key có tồn tại hay không). Danh sách đặt làm hằng số trong backend, có comment trỏ tới migration.
- `PUT`: `upsert` theo `key`, cập nhật `updated_at = now()`. `key`: `^[a-z0-9_]{1,64}$` → khác thì 400 `VALIDATION_FAILED`.

## 5. Thay thế ở frontend
| Chỗ cũ | Thay bằng |
|---|---|
| `homepageShowcaseService.ts:361-365` | `getPublicSetting("homepage_showcase_config")` → dùng `data?.value` y như `data?.value` cũ; lỗi → đi tiếp nhánh fallback cũ |
| `homepageShowcaseService.ts:452-469` | `const { error } = await saveSetting("homepage_showcase_config", jsonStr); if (error) throw error;` |
| `vocabPacksService.ts:31-35` | `getPublicSetting("game_vocab_packs")` |
| `vocabPacksService.ts:100-120` | `saveSetting("game_vocab_packs", …)`, giữ cách xử lý lỗi cũ của hàm |
| `AdminSettings.tsx:121` | `listAdminSettings()` → `data ?? []` rồi giữ đoạn dựng `map` |
| `AdminSettings.tsx:150-160` (vòng lặp select/update/insert) | `for (const entry of entries) await saveSetting(entry.key, entry.value);` (cũ không kiểm lỗi từng lệnh — giữ) |

Adapter trong `src/lib/api/admin.ts`: `getPublicSetting(key)` (bóc `.setting`), `listAdminSettings()`, `saveSetting(key, value)`; trả `{ data, error }`, không ném.

## 6. Tiêu chí nghiệm thu
- [x] E2E: khách đọc được `homepage_showcase_config`; khách đọc key không công khai (vd. `secret_x` đã seed) → `{ setting: null }`; admin đọc tất cả; học viên gọi route admin → 403; không token → 401; PUT tạo mới rồi PUT lại cập nhật (1 dòng); key sai định dạng → 400
- [x] Sau PUT `homepage_showcase_config` với giá mới, `POST /payments/orders` của user mới dùng giá đó (chứng minh cùng nguồn)
- [x] Adapter test; `grep -rn "platform_settings" src --include=*.ts --include=*.tsx | grep -v "integrations/supabase/types.ts\|AdminBackup"` rỗng; `check-ui-diff` OK

## 7. Lệnh kiểm tra — dán **nguyên văn** output vào mục 8, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -rn "platform_settings" src --include=*.ts --include=*.tsx | grep -v "integrations/supabase/types.ts\|AdminBackup"
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 8. Kết quả (người làm điền)
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
PASS src/config/env.schema.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 21 passed, 21 total
Tests:       198 passed, 198 total
Snapshots:   0 total
Time:        2.782 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

PASS test/auth.e2e-spec.ts (17.122 s)
PASS test/learning-admin.e2e-spec.ts (5.142 s)
PASS test/assessment-full-test.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/health.e2e-spec.ts
PASS test/platform-settings.e2e-spec.ts
PASS test/payments-admin.e2e-spec.ts
PASS test/assessment-full-test-lists.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts

Test Suites: 15 passed, 15 total
Tests:       193 passed, 193 total
Snapshots:   0 total
Time:        67.053 s
Ran all test suites.

> backend@0.0.1 build
> nest build

$ cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
> vite_react_shadcn_ts@0.0.0 test
> vitest run

 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 44ms
 ✓ src/lib/api/client.test.ts (4 tests) 182ms
 ✓ src/lib/api/admin.test.ts (7 tests) 230ms
 ✓ src/lib/api/fullTest.test.ts (7 tests) 260ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 250ms
 ✓ src/lib/api/auth.test.ts (9 tests) 219ms
 ✓ src/lib/api/payments.test.ts (8 tests) 211ms
 ✓ src/lib/api/catalog.test.ts (19 tests) 272ms
 ✓ src/lib/api/learning.test.ts (43 tests) 183ms
 ✓ src/test/part2Audio.test.ts (3 tests) 527ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 36ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 6ms

 Test Files  12 passed (12)
      Tests  131 passed (131)
   Start at  00:31:24
   Duration  13.83s (transform 11.55s, setup 20.28s, collect 26.05s, tests 2.42s, environment 26.53s, prepare 3.21s)

> vite_react_shadcn_ts@0.0.0 build
> vite build

vite v5.4.19 building for production...
transforming...
✓ 2737 modules transformed.
rendering chunks...
computing gzip size...
✓ built in 41.80s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).

$ grep -rn "platform_settings" src --include=*.ts --include=*.tsx | grep -v "integrations/supabase/types.ts\|AdminBackup"
(empty - exit code 1)

$ git log --oneline -3 && git diff --stat refactor/nestjs-backend
128c6ed feat(admin): add platform settings API and migrate client callers
176e0c1 docs: record T-017 review PASS, update queue
581037e merge: T-017 full test lists via API (review PASS)
 backend/src/modules/admin/admin.controller.ts    |  34 ++-
 backend/src/modules/admin/admin.mapper.ts        |  15 +-
 backend/src/modules/admin/admin.module.ts        |   3 +-
 backend/src/modules/admin/admin.repository.ts    |  33 ++-
 backend/src/modules/admin/admin.service.spec.ts  |  93 +++++++++
 backend/src/modules/admin/admin.service.ts       |  38 +++-
 backend/src/modules/admin/dto/index.ts           |   1 +
 backend/src/modules/admin/dto/setting.dto.ts     |  28 +++
 backend/src/modules/admin/settings.constants.ts  |  19 ++
 backend/src/modules/admin/settings.controller.ts |  24 +++
 backend/test/platform-settings.e2e-spec.ts       | 252 +++++++++++++++++++++++
 src/lib/api/admin.test.ts                        |  55 ++++-
 src/lib/api/admin.ts                             |  42 ++++
 src/pages/admin/AdminSettings.tsx                |  14 +-
 src/services/homepageShowcaseService.ts          |  28 +--
 src/services/vocabPacksService.ts                |  44 +---
 16 files changed, 643 insertions(+), 80 deletions(-)
```

## 9. Câu hỏi (người làm điền khi bị chặn)

## 10. Review (Claude điền)
**PASS** (Claude, 2026-10-29) — merge vào `refactor/nestjs-backend`. Review trên `345b802`.
- Route công khai chỉ trả đúng 8 key như RLS, key khác `{ setting: null }` mà không gọi DB; admin đọc/ghi mọi key, upsert một lệnh; kiểm định dạng key. 3 chỗ gọi chỉ thay nguồn dữ liệu, giữ nhánh fallback/cache cũ. Không còn `platform_settings` trong `src/` (trừ types, AdminBackup).
- Chạy lại sau gộp: lint/typecheck sạch, unit 201/201, e2e 195/195, vitest 133/133, `check-ui-diff` OK, build OK.
