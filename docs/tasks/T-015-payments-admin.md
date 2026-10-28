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
- [ ] E2E 3 vai (401/403/200) cho cả 2 route; học viên không duyệt được đơn của chính mình
- [ ] E2E: danh sách có `profile.full_name`, `amount` là number, mới nhất trước; duyệt → đơn completed, `profiles.is_pro = true`, ghi danh các khóa đang mở, log `payment_manual_approve` có `admin_id`; duyệt lần 2 → không thêm log; mã lạ → 404
- [ ] Adapter test: đúng URL/method, không gửi body số tiền; `success: false` → `error`
- [ ] `grep -n 'payment_orders\|complete_payment_order' src/pages/admin/AdminEnrollments.tsx` rỗng; `check-ui-diff` OK

## 6. Lệnh kiểm tra — dán **nguyên văn** output vào mục 7, chạy **sau commit cuối**
```bash
docker compose up -d postgres
cd backend && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
cd .. && npm test && npm run build && node scripts/check-ui-diff.mjs refactor/nestjs-backend
grep -n 'payment_orders\|complete_payment_order' src/pages/admin/AdminEnrollments.tsx
git log --oneline -3 && git diff --stat refactor/nestjs-backend
```

## 7. Kết quả (người làm điền)

## 8. Câu hỏi (người làm điền khi bị chặn)

## 9. Review (Claude điền)
