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
  course_id: number | null;
  course_title: string | null;
  status: string | null;
  completed: boolean;
  paid_at: string | null;
  created_at: string | null;
}

export interface AdminPaymentProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export interface AdminPaymentOrderRow {
  id: string;
  user_id: string;
  order_code: string;
  plan_type: string | null;
  amount: number;
  status: string | null;
  payment_gateway: string | null;
  bank_transaction_id: string | null;
  transaction_content: string | null;
  paid_at: string | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
  profile: AdminPaymentProfile | null;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  order_code?: string | null;
}

/**
 * Tạo đơn mua một khóa học (server lấy giá khóa và dùng lại đơn pending cùng khóa trong 30 phút).
 * Lỗi: 409 ALREADY_ENROLLED (đã sở hữu), 400 COURSE_NOT_FOR_SALE (khóa miễn phí), 404.
 */
export async function createPaymentOrder(courseId: number): Promise<{
  data: PaymentOrderRow | null;
  error: ApiError | null;
}> {
  return toResult(apiClient.post<PaymentOrderRow>("payments/orders", { course_id: courseId }));
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

export async function listAdminPaymentOrders(): Promise<{
  data: AdminPaymentOrderRow[] | null;
  error: ApiError | null;
}> {
  return toResult(
    apiClient.get<AdminPaymentOrderRow[]>("payments/admin/orders"),
  );
}

export async function approvePaymentOrder(
  orderCode: string,
): Promise<{
  data: WebhookResult | null;
  error: ApiError | null;
}> {
  const result = await toResult(
    apiClient.post<WebhookResult>(
      `payments/admin/orders/${encodeURIComponent(orderCode)}/approve`,
    ),
  );
  if (result.data && result.data.success === false) {
    return {
      data: result.data,
      error: new ApiError(409, "PAYMENT_NOT_APPROVED", result.data.message),
    };
  }
  return result;
}

/**
 * Kiểm tra webhook SePay của backend còn sống: gửi request **không** có API key.
 * Server trả 401 WEBHOOK_UNAUTHORIZED = endpoint hoạt động và đang bắt buộc API key (đúng).
 */
export async function pingSepayWebhook(): Promise<{ online: boolean; message: string }> {
  try {
    await apiClient.post("payments/webhooks/sepay", {}, { auth: false });
    return { online: false, message: "Webhook nhận request không có API key — kiểm tra SEPAY_WEBHOOK_API_KEY trên server" };
  } catch (err) {
    if (err instanceof ApiError && err.code === "WEBHOOK_UNAUTHORIZED") {
      return { online: true, message: "Endpoint hoạt động và đang bắt buộc API key của SePay" };
    }
    return { online: false, message: err instanceof Error ? err.message : String(err) };
  }
}
