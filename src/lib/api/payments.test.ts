import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPaymentOrder,
  getPaymentOrder,
  simulatePayment,
  watchPaymentOrder,
} from "./payments";

const ORDER = {
  id: "o1",
  order_code: "LEA12345",
  amount: 1750000,
  plan_type: "vip_combo",
  status: "pending",
  completed: false,
  paid_at: null,
  created_at: "2026-10-28T10:00:00.000Z",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(...responses: Array<[number, unknown]>) {
  const fn = vi.fn();
  for (const [status, body] of responses) {
    fn.mockResolvedValueOnce(jsonResponse(status, body));
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("payments adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("createPaymentOrder gửi POST chỉ với plan_type, không gửi số tiền hay mã đơn", async () => {
    const fetchMock = mockFetch([201, ORDER]);
    const { data, error } = await createPaymentOrder();
    expect(error).toBeNull();
    expect(data).toEqual(ORDER);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/payments/orders");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ plan_type: "vip_combo" });
  });

  it("getPaymentOrder / simulatePayment gọi đúng URL; lỗi không ném", async () => {
    const fetchMock = mockFetch(
      [200, ORDER],
      [403, { statusCode: 403, code: "PAYMENT_SIMULATION_DISABLED", message: "Tắt" }],
    );
    await expect(getPaymentOrder("LEA12345")).resolves.toEqual({ data: ORDER, error: null });
    const sim = await simulatePayment("LEA12345");
    expect(sim.data).toBeNull();
    expect(sim.error?.code).toBe("PAYMENT_SIMULATION_DISABLED");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/payments/orders/LEA12345");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/payments/orders/LEA12345/simulate");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
  });

  it("watchPaymentOrder hỏi tới khi completed thì gọi onCompleted đúng một lần", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([200, ORDER], [200, { ...ORDER, completed: true, status: "completed" }]);
    const onCompleted = vi.fn();
    watchPaymentOrder("LEA12345", onCompleted, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(onCompleted).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(onCompleted).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("watchPaymentOrder dừng khi 404 (mã tạm chưa thành đơn); hàm hủy dừng ngay", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([404, { statusCode: 404, code: "ORDER_NOT_FOUND", message: "x" }]);
    watchPaymentOrder("LEA00000", vi.fn(), 1000);
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const fetch2 = mockFetch([200, ORDER]);
    const stop = watchPaymentOrder("LEA12345", vi.fn(), 1000);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch2).not.toHaveBeenCalled();
  });
});
