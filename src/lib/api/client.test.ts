import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, toResult } from "./client";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("ghép base URL, query và gửi cookie", async () => {
    const fetchMock = mockFetch(200, [{ id: 1 }]);
    const data = await apiClient.get("/courses", { query: { level: "A1", skip: undefined, ids: [1, 2] } });

    expect(data).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/courses?level=A1&ids=1&ids=2");
    expect(init).toMatchObject({ method: "GET", credentials: "include" });
  });

  it("ném ApiError mang code/message của backend", async () => {
    mockFetch(403, { statusCode: 403, code: "COURSE_LOCKED", message: "Khóa học PRO" });
    await expect(apiClient.get("/lessons/1")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      code: "COURSE_LOCKED",
      message: "Khóa học PRO",
    });
  });

  it("lỗi mạng trả về message 'Failed to fetch' như trước", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(apiClient.get("/x")).rejects.toMatchObject({ code: "NETWORK_ERROR", message: "Failed to fetch" });
  });

  it("toResult trả về { data, error } giống Supabase", async () => {
    mockFetch(404, { code: "NOT_FOUND", message: "Không tìm thấy" });
    const { data, error } = await toResult(apiClient.get("/courses/x"));
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(ApiError);
    expect(error?.code).toBe("NOT_FOUND");
  });
});
