/**
 * Adapter thanh toán gọi backend NestJS thay cho Supabase (insert đơn, Realtime, RPC).
 * Giá và trạng thái đơn do server quyết; client không gửi số tiền (OPEN_QUESTIONS #23).
 */
import { apiClient, toResult, ApiError } from "./client";

export interface PaymentOrderRow {
  id: string;
  order_code: string;
  amount: number;
  plan_type: string | null;
  status: string | null;
  completed: boolean;
  paid_at: string | null;
  created_at: string | null;
}

/** Tạo đơn VIP (server dùng lại đơn pending của mình trong 30 phút). */
export async function createPaymentOrder(): Promise<{
  data: PaymentOrderRow | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.post<PaymentOrderRow>("payments/orders", { plan_type: "vip_combo" }),
  );
}

export async function getPaymentOrder(
  orderCode: string,
): Promise<{ data: PaymentOrderRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.get<PaymentOrderRow>(`payments/orders/${encodeURIComponent(orderCode)}`),
  );
}

/** Chỉ chạy khi server bật PAYMENT_SIMULATION_ENABLED (staging/dev). */
export async function simulatePayment(
  orderCode: string,
): Promise<{ data: PaymentOrderRow | null; error: ApiError | null }> {
  return toResult(
    apiClient.post<PaymentOrderRow>(
      `payments/orders/${encodeURIComponent(orderCode)}/simulate`,
    ),
  );
}

export const PAYMENT_POLL_INTERVAL_MS = 3000;

/**
 * Thay kênh Supabase Realtime: hỏi trạng thái mỗi 3 giây, gọi `onCompleted` một lần khi
 * đơn hoàn tất rồi dừng; dừng luôn khi 401/403/404, lỗi mạng/5xx thì hỏi tiếp.
 * Trả hàm hủy (thay `supabase.removeChannel`).
 */
export function watchPaymentOrder(
  orderCode: string,
  onCompleted: () => void | Promise<void>,
  intervalMs: number = PAYMENT_POLL_INTERVAL_MS,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    const { data, error } = await getPaymentOrder(orderCode);
    if (stopped) return;
    // Chưa đăng nhập, mã tạm chưa thành đơn, hoặc đơn không phải của mình → không hỏi nữa
    if (error && [401, 403, 404].includes(error.status)) {
      stopped = true;
      return;
    }
    if (data?.completed) {
      stopped = true;
      await onCompleted();
      return;
    }
    timer = setTimeout(tick, intervalMs);
  };
  timer = setTimeout(tick, intervalMs);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
