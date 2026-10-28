# T-015: PaymentsModule — admin xem và duyệt đơn (backend + frontend)

> **Người làm**: Antigravity · **Module**: Payments · **Nhánh**: `task/T-015-payments-admin`
> **Phụ thuộc**: không · **Ước lượng**: 2 giờ
> Đọc trước: `AGENTS.md`, OPEN_QUESTIONS #23, code `backend/src/modules/payments/` (Claude viết — **chỉ thêm**, không đổi hành vi route cũ), `src/lib/api/payments.ts`, file này.

## 1. Mục tiêu
Trang `/admin/enrollments` tab đơn hàng: đọc danh sách đơn và nút "Duyệt" đang gọi Supabase (`payment_orders` + RPC `complete_payment_order` từ trình duyệt). Chuyển sang API.

## 2. Phạm vi
**Được sửa/tạo**: `backend/src/modules/payments/**` (thêm controller admin `payments-admin.controller.ts`, method service/repository, DTO, spec); `backend/test/payments-admin.e2e-spec.ts`; `src/lib/api/payments.ts` + `.test.ts` (thêm hàm); **chỉ** thân `queryFn` `admin-payment-orders`, biểu thức RPC trong `handleApproveOrder` và `import` ở `src/pages/admin/AdminEnrollments.tsx`.
**Cấm**: JSX, câu chữ, `queryKey`, toast; query `admin-enrollments` (task T-016); đổi route/hành vi của `payments.controller.ts`, `PaymentsService.applyPayment`, `PaymentsRepository.completeOrder` (chỉ được thêm tham số tùy chọn `adminId`).

## 3. Hành vi cũ → mới
| PARITY | Chỗ cũ | Cũ | Mới |
|---|---|---|---|
| ADM-015 | `AdminEnrollments.tsx:34-60` | `payment_orders.select("*").order(created_at desc)` + `profiles.select("id, user_id, full_name, email").in(user_id)`, gắn `profile`; lỗi → `[]` | `listAdminPaymentOrders()` → `data ?? []` (lỗi không ném) |
| ADM-016 | `AdminEnrollments.tsx:103-140` | `rpc("complete_payment_order", { p_order_code, p_transfer_amount: amount, … })` — client gửi số tiền | `approvePaymentOrder(orderCode)` → `{ error }`; giữ nguyên nhánh `if (error) … else …` và toast. **Không** gửi số tiền |
| PAY-012 | `manually_upgrade_user_to_pro` | Không có chỗ nào ở giao diện gọi | Không làm; ghi "không dùng ở giao diện" ở mục 7 |

## 4. Đặc tả
Controller `@Controller('payments/admin')`, `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(AppRole.admin)` cấp class, `@ApiTags('payments-admin')`.
| Method | Route | Trả về |
|---|---|---|
| GET | `/payments/admin/orders` | `AdminPaymentOrderDto[]` order `created_at` desc, `id` desc |
| POST | `/payments/admin/orders/:orderCode/approve` | 200 `WebhookResultDto` (`success`, `message`, `order_code`) |

- `AdminPaymentOrderDto` = đủ cột `payment_orders` snake_case (`id, user_id, order_code, plan_type, amount (number), status, payment_gateway, bank_transaction_id, transaction_content, paid_at, metadata, created_at, updated_at`) + `profile: { id, user_id, full_name, email } | null` (join chỉ đọc `user → profile` trong `PaymentsRepository`, ghi chú lý do).
- `approve`: tìm đơn (không phân biệt hoa thường), không có → 404 `ORDER_NOT_FOUND`. Gọi lại đúng luồng `applyPayment` với `transferAmount = amount của đơn` (server lấy, không nhận từ client), `bankTxId = MANUAL_ADMIN_<timestamp>`, `transactionContent = ADMIN_MANUAL_APPROVE <code>`, `action = 'payment_manual_approve'`, và ghi `admin_id` (người gọi) vào `admin_activity_log`. Đơn đã completed → `success: true` "đã hoàn tất trước đó", không ghi lần 2.
- Adapter: `approvePaymentOrder` trả `{ data, error }`; nếu `data.success === false` → trả `error = new ApiError(409, "PAYMENT_NOT_APPROVED", data.message)` để nhánh `if (error)` cũ hiện toast lỗi.

## 5. Tiêu chí nghiệm thu
- [x] E2E 3 vai (401/403/200) cho cả 2 route; học viên không duyệt được đơn của chính mình
- [x] E2E: danh sách có `profile.full_name`, `amount` là number, mới nhất trước; duyệt → đơn completed, `profiles.is_pro = true`, ghi danh các khóa đang mở, log `payment_manual_approve` có `admin_id`; duyệt lần 2 → không thêm log; mã lạ → 404
- [x] Adapter test: đúng URL/method, không gửi body số tiền; `success: false` → `error`
- [x] `grep -n 'payment_orders\|complete_payment_order' src/pages/admin/AdminEnrollments.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'payment_orders\|complete_payment_order' src/pages/admin/AdminEnrollments.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)
- **Backend (`backend/src/modules/payments/`)**:
  - Tạo controller `PaymentsAdminController` (`payments-admin.controller.ts`) dưới route `/api/v1/payments/admin` với guard `JwtAuthGuard` + `RolesGuard` (`@Roles(AppRole.admin)`) và `@ApiTags('payments-admin')`.
  - Route `GET /payments/admin/orders`: đọc danh sách đơn hàng kèm `profile: { id, user_id, full_name, email } | null` qua join chỉ đọc `user -> profile` trong `PaymentsRepository.findAllOrdersWithProfiles()`, sắp theo `created_at` desc, `id` desc, `amount` dạng `number`.
  - Route `POST /payments/admin/orders/:orderCode/approve`: tìm đơn (không phân biệt hoa thường), không có → 404 `ORDER_NOT_FOUND`. Gọi lại `applyPayment` với `transferAmount = Number(order.amount)` (server tự lấy, không nhận từ client), `bankTxId = MANUAL_ADMIN_<timestamp>`, `transactionContent = ADMIN_MANUAL_APPROVE <code>`, `action = 'payment_manual_approve'`, và ghi `admin_id` vào `admin_activity_log`. Đơn đã completed → trả `success: true` "đã hoàn tất trước đó", không kích hoạt hay ghi log lần 2.
  - Ghi nhận `PAY-012` (`manually_upgrade_user_to_pro`): không dùng ở giao diện.
- **Test backend**:
  - Bổ sung unit test trong `payments.service.spec.ts` cho `listAdminOrders` và các nhánh 404/thành công/đã completed của `approveOrder`.
  - Tạo e2e test `payments-admin.e2e-spec.ts` kiểm tra 3 vai trò (401/403/200), học viên không duyệt được đơn của chính mình, đơn completed, `profiles.is_pro = true`, ghi danh các khóa active, log `payment_manual_approve` có `admin_id`, duyệt lần 2 không thêm log, mã lạ 404.
- **Frontend (`src/lib/api/payments.ts`, `src/lib/api/payments.test.ts`, `src/pages/admin/AdminEnrollments.tsx`)**:
  - Thêm `listAdminPaymentOrders()` và `approvePaymentOrder(orderCode)` trong `payments.ts` (không gửi body số tiền, nếu `data.success === false` trả về `error = new ApiError(409, "PAYMENT_NOT_APPROVED", data.message)`), kèm bộ unit test trong `payments.test.ts`.
  - Cập nhật `AdminEnrollments.tsx`: thay thân `queryFn` `admin-payment-orders` bằng `listAdminPaymentOrders()` và thay RPC call trong `handleApproveOrder` bằng `approvePaymentOrder(orderCode)`. Giữ nguyên mọi JSX, câu chữ, queryKey và toast.

Output nguyên văn các lệnh ở mục 6:
```text
 Container l-english-academy-postgres-1  Running

> backend@0.0.1 lint
> eslint "{src,test}/**/*.ts"


> backend@0.0.1 typecheck
> tsc --noEmit -p tsconfig.json


> backend@0.0.1 test
> node --experimental-vm-modules node_modules/jest/bin/jest.js

PASS src/config/env.schema.spec.ts
PASS src/mail/gmail-api.transport.spec.ts
PASS src/modules/assessment/toeic-scoring.spec.ts
PASS src/modules/assessment/quiz-grading.spec.ts
PASS src/modules/catalog/catalog.mapper.spec.ts
PASS src/modules/learning/learning.mapper.spec.ts
PASS src/common/filters/all-exceptions.filter.spec.ts
PASS src/modules/learning/lesson-access.spec.ts
PASS src/common/transforms/to-optional-boolean.spec.ts
PASS src/modules/auth/auth.mapper.spec.ts
PASS src/modules/payments/payment-rules.spec.ts
PASS src/modules/auth/guards/jwt-auth.guard.spec.ts
PASS src/modules/auth/guards/optional-jwt-auth.guard.spec.ts
PASS src/modules/admin/admin.service.spec.ts
PASS src/modules/catalog/catalog-admin.service.spec.ts
PASS src/modules/payments/payments.service.spec.ts
PASS src/modules/learning/learning-quiz-access.spec.ts
PASS src/modules/assessment/assessment.service.spec.ts
PASS src/modules/catalog/catalog.service.spec.ts
PASS src/modules/learning/learning-admin.service.spec.ts
PASS src/modules/learning/learning.service.spec.ts

Test Suites: 21 passed, 21 total
Tests:       192 passed, 192 total
Snapshots:   0 total
Time:        2.401 s, estimated 18 s
Ran all test suites.

> backend@0.0.1 test:e2e
> node --experimental-vm-modules node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand

(node:14112) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
PASS test/payments-admin.e2e-spec.ts
[Nest] 14112  - 10/28/2026, 11:18:31 PM   ERROR [AllExceptionsFilter] AuthError: Unsupported provider: provider is not enabled
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
PASS test/auth.e2e-spec.ts
PASS test/admin-notes.e2e-spec.ts
PASS test/learning-admin.e2e-spec.ts
PASS test/assessment-quiz.e2e-spec.ts
PASS test/catalog-admin.e2e-spec.ts
PASS test/learning-user-data.e2e-spec.ts
PASS test/assessment-full-test.e2e-spec.ts
PASS test/assessment-results.e2e-spec.ts
PASS test/payments.e2e-spec.ts
PASS test/learning-access.e2e-spec.ts
PASS test/catalog.e2e-spec.ts
PASS test/health.e2e-spec.ts

Test Suites: 13 passed, 13 total
Tests:       174 passed, 174 total
Snapshots:   0 total
Time:        19.772 s, estimated 79 s
Ran all test suites.

> backend@0.0.1 build
> nest build


> vite_react_shadcn_ts@0.0.0 test
> vitest run


 RUN  v3.2.4 C:/Users/lenovo/l-english-academy

 ✓ src/test/example.test.ts (1 test) 4ms
 ✓ src/lib/api/admin.test.ts (3 tests) 12ms
 ✓ src/lib/api/client.test.ts (4 tests) 16ms
 ✓ src/lib/api/fullTest.test.ts (5 tests) 18ms
 ✓ src/lib/api/payments.test.ts (8 tests) 26ms
 ✓ src/lib/api/auth.test.ts (9 tests) 23ms
 ✓ src/lib/api/assessment.test.ts (13 tests) 20ms
 ✓ src/lib/api/catalog.test.ts (11 tests) 16ms
stdout | src/test/part2Audio.test.ts > SoundAudioPlayer playback and sequence behavior > checks what happens when speakSequence is called again during sequence pause
Played URLs when restarted in pause: [
  '/api/tts?q=Question%201',
  '/api/tts?q=Question%201',
  '/api/tts?q=(A)%20Option%20A'
]

 ✓ src/lib/api/learning.test.ts (34 tests) 37ms
 ✓ src/test/part2Audio.test.ts (3 tests) 378ms
 ✓ src/test/speakingRooms.test.ts (11 tests) 13ms
 ✓ src/test/audioUrlAndDictation.test.ts (6 tests) 3ms

 Test Files  12 passed (12)
      Tests  108 passed (108)
   Start at  23:19:13
   Duration  36.36s (transform 2.73s, setup 43.32s, collect 9.89s, tests 565ms, environment 195.19s, prepare 5.73s)


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
dist/assets/googleOAuth-BVjgGUHg.js                    0.25 kB │ gzip:   0.22 kB
dist/assets/index-BTxtO8UQ.js                          0.27 kB │ gzip:   0.23 kB
dist/assets/audioUrl-DTWUyGYG.js                       0.29 kB │ gzip:   0.24 kB
dist/assets/textarea-Cc0giZFx.js                       0.56 kB │ gzip:   0.36 kB
dist/assets/label-BXXHJyGo.js                          0.63 kB │ gzip:   0.42 kB
dist/assets/input-DvNf_9iF.js                          0.66 kB │ gzip:   0.39 kB
dist/assets/Logo-788t6NDe.js                           0.80 kB │ gzip:   0.47 kB
dist/assets/fullTest-ComjgEXr.js                       0.86 kB │ gzip:   0.34 kB
dist/assets/payments-CS-D24_e.js                       0.91 kB │ gzip:   0.49 kB
dist/assets/assessment-C3ebkcOA.js                     0.97 kB │ gzip:   0.39 kB
dist/assets/ErrorState-TSPkp0Yd.js                     1.15 kB │ gzip:   0.69 kB
dist/assets/EmptyState-B69_LuO6.js                     1.15 kB │ gzip:   0.60 kB
dist/assets/card-CpvKnleN.js                           1.15 kB │ gzip:   0.46 kB
dist/assets/button-Ba2L26Ek.js                         1.43 kB │ gzip:   0.71 kB
dist/assets/badge-BPqi9N1u.js                          1.48 kB │ gzip:   0.59 kB
dist/assets/PageHeader-4rELG9fi.js                     1.65 kB │ gzip:   0.81 kB
dist/assets/learning-DlD4fFrJ.js                       1.84 kB │ gzip:   0.63 kB
dist/assets/NotFound-lPv1I_Z9.js                       1.84 kB │ gzip:   0.92 kB
dist/assets/progress-jI6hcLIZ.js                       1.98 kB │ gzip:   0.99 kB
dist/assets/errorHandler-DK3FuJhu.js                   2.07 kB │ gzip:   1.16 kB
dist/assets/LibraryPage-byuQlpc4.js                    2.16 kB │ gzip:   1.26 kB
dist/assets/FullTestsPage-BRHCPm4R.js                  2.24 kB │ gzip:   1.31 kB
dist/assets/ListeningPage-CesOHN-p.js                  2.25 kB │ gzip:   1.29 kB
dist/assets/sheet-C_6hS9HZ.js                          2.34 kB │ gzip:   0.92 kB
dist/assets/dialog-BD_LxMQd.js                         2.34 kB │ gzip:   0.94 kB
dist/assets/AuthCallback-DGkXuyxJ.js                   2.54 kB │ gzip:   1.25 kB
dist/assets/switch-COt9jsX1.js                         2.56 kB │ gzip:   1.28 kB
dist/assets/tabs-C3qY_5S_.js                           3.37 kB │ gzip:   1.41 kB
dist/assets/PasswordStrengthIndicator-C0P_5LG8.js      3.40 kB │ gzip:   1.09 kB
dist/assets/index-Df6aem-S.js                          3.60 kB │ gzip:   1.63 kB
dist/assets/checkbox-YbSvTgGV.js                       3.98 kB │ gzip:   1.76 kB
dist/assets/AdminReports-Cc9RqGDj.js                   4.37 kB │ gzip:   1.82 kB
dist/assets/alert-dialog-CxCtvUrB.js                   4.89 kB │ gzip:   1.80 kB
dist/assets/ForgotPassword-mqY1iWg9.js                 4.97 kB │ gzip:   2.10 kB
dist/assets/MysteryChestModal-o5jY3gtm.js              5.03 kB │ gzip:   2.13 kB
dist/assets/CourseCard-BJFntnVR.js                     5.19 kB │ gzip:   1.99 kB
dist/assets/index-B1zfz4R5.js                          5.36 kB │ gzip:   2.07 kB
dist/assets/FullTestList-D_iGM1vR.js                   5.90 kB │ gzip:   2.50 kB
dist/assets/ResetPassword-D_wR8khz.js                  5.95 kB │ gzip:   2.26 kB
dist/assets/StickyPartAudioPlayer-DeyZDie1.js          6.10 kB │ gzip:   2.26 kB
dist/assets/AdminStudents-CpizFKy2.js                  6.71 kB │ gzip:   2.37 kB
dist/assets/accordion-CA-ORdsx.js                      6.75 kB │ gzip:   2.50 kB
dist/assets/AdminLayout-C7NaLmDJ.js                    7.48 kB │ gzip:   2.58 kB
dist/assets/AdminCourseJsonImport-UYyijHVl.js          7.82 kB │ gzip:   3.37 kB
dist/assets/AdminDashboard-D5ulPNtM.js                 7.88 kB │ gzip:   2.45 kB
dist/assets/Register-Du004DNR.js                       8.20 kB │ gzip:   3.24 kB
dist/assets/Login-CyxVnzoa.js                          9.79 kB │ gzip:   3.80 kB
dist/assets/AdminCourses-CpAjcGkL.js                   9.96 kB │ gzip:   3.34 kB
dist/assets/AdminEnrollments-OPNIPm3M.js              10.15 kB │ gzip:   3.16 kB
dist/assets/useGamification-D6mqSVYB.js               10.50 kB │ gzip:   4.05 kB
dist/assets/AdminCourseNew-CQPfz-LZ.js                10.89 kB │ gzip:   3.68 kB
dist/assets/AdminStudentDetail-CRV4n4ZC.js            12.29 kB │ gzip:   3.48 kB
dist/assets/homepageShowcaseService-68o7rjrI.js       13.69 kB │ gzip:   5.61 kB
dist/assets/VocabPage-DmIWQ191.js                     14.30 kB │ gzip:   4.02 kB
dist/assets/AdminCategories-DGlpPx96.js               14.73 kB │ gzip:   4.74 kB
dist/assets/AdminMaterials-BbiLTniC.js                15.16 kB │ gzip:   4.73 kB
dist/assets/Combination-C7jSY4L7.js                   15.85 kB │ gzip:   6.00 kB
dist/assets/VocabLessonPage-DjSMf570.js               18.57 kB │ gzip:   5.66 kB
dist/assets/StudentLayout-DGX0h_39.js                 19.23 kB │ gzip:   5.59 kB
dist/assets/MyCoursesPage-DC0nFXq9.js                 19.28 kB │ gzip:   5.85 kB
dist/assets/select-_mx5VvqR.js                        21.25 kB │ gzip:   7.40 kB
dist/assets/AdminFullTestManager-BPqTDKW0.js          22.88 kB │ gzip:   7.21 kB
dist/assets/AdminBackup-Fx9rA0l8.js                   24.93 kB │ gzip:   7.63 kB
dist/assets/FullTestResult-CSqjHVX3.js                25.08 kB │ gzip:   7.31 kB
dist/assets/AdminGamesConfig-BS3I2v6G.js              25.47 kB │ gzip:   7.55 kB
dist/assets/QuizPage-DApxFyz3.js                      25.96 kB │ gzip:   7.79 kB
dist/assets/QuizResult-BlKbIHE2.js                    28.03 kB │ gzip:   7.84 kB
dist/assets/AdminVocabPacks-BJA1Mc0B.js               37.48 kB │ gzip:   9.91 kB
dist/assets/GamesHub-PpJE-iCf.js                      37.69 kB │ gzip:   9.45 kB
dist/assets/AdminSettings-DmH5uY8M.js                 39.77 kB │ gzip:   8.79 kB
dist/assets/Profile-DKTlxq0Y.js                       40.67 kB │ gzip:  10.43 kB
dist/assets/UpgradeProModal-B_5g0xm4.js               40.84 kB │ gzip:  11.73 kB
dist/assets/LearnPage-DrHSnVsh.js                     40.85 kB │ gzip:  11.22 kB
dist/assets/AdminFullTestQuestions-CmXbXdks.js        43.64 kB │ gzip:   9.67 kB
dist/assets/WordShooterLeaderboardModal-BYio0qFs.js   48.07 kB │ gzip:  12.76 kB
dist/assets/FullTestExam-DvnKxNvQ.js                  55.36 kB │ gzip:  14.18 kB
dist/assets/Index-C0hpaDrw.js                         59.67 kB │ gzip:  15.43 kB
dist/assets/DashboardPage-BnC63J-0.js                 67.55 kB │ gzip:  15.24 kB
dist/assets/WordDefenseGame-BqgJErtj.js               73.11 kB │ gzip:  18.42 kB
dist/assets/WordShooterGame-TL9Wgyxb.js               78.44 kB │ gzip:  21.36 kB
dist/assets/vendor-ui-DFkus0iB.js                     80.01 kB │ gzip:  18.41 kB
dist/assets/index-sA4BvIRw.js                         95.95 kB │ gzip:  33.20 kB
dist/assets/DictationPage-CHOBcuBF.js                110.43 kB │ gzip:  26.51 kB
dist/assets/vocabPacksService-BH9PTNFm.js            124.37 kB │ gzip:  39.89 kB
dist/assets/vendor-react-zEA-uSLV.js                 162.92 kB │ gzip:  53.16 kB
dist/assets/AdminCourseDetail-CdI2UgBB.js            186.86 kB │ gzip:  50.43 kB
dist/assets/vendor-query-CH3OBSVQ.js                 234.42 kB │ gzip:  62.91 kB
dist/assets/Part2CoachPage-DwmNn-_Y.js               338.91 kB │ gzip:  55.22 kB
dist/assets/vendor-charts-D4lgbj5e.js                399.38 kB │ gzip: 107.95 kB
dist/assets/SpeakingRoomsPage-BiLOnwvP.js            651.46 kB │ gzip: 172.97 kB
✓ built in 29.01s
check-ui-diff: OK — không có thay đổi giao diện trong src/**/*.tsx (so với refactor/nestjs-backend).
bda3c00 feat(payments): add admin payment orders and approve endpoints, migrate AdminEnrollments (T-015)
d6b7d5c docs: record T-014 review PASS, Claude takes T-013
7ba4d0b merge: T-014 admin student notes (review PASS)
 backend/src/modules/payments/dto/admin-payment-order.dto.ts |  82 ++++++++++++++++++++++
 backend/src/modules/payments/payments-admin.controller.ts |  64 +++++++++++++++++
 backend/src/modules/payments/payments.mapper.ts           |  39 +++++++++++
 backend/src/modules/payments/payments.module.ts           |   3 +-
 backend/src/modules/payments/payments.repository.ts       |  26 +++++++
 backend/src/modules/payments/payments.service.spec.ts     |  83 +++++++++++++++++++++++
 backend/src/modules/payments/payments.service.ts          |  35 ++++++++++
 backend/test/payments-admin.e2e-spec.ts                   | 306 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/lib/api/payments.test.ts                              |  87 ++++++++++++++++++++++++
 src/lib/api/payments.ts                                   |  59 ++++++++++++++++
 src/pages/admin/AdminEnrollments.tsx                      |  36 +++-------
 11 files changed, 789 insertions(+), 31 deletions(-)
```

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
