import { afterEach, describe, expect, it, vi } from "vitest";
import { getMyRoadmap, getRoadmapPlacement, isPlacementQuiz, markPlacementStarted, saveMyRoadmap } from "@/lib/api/roadmap";

function mockFetch(...responses: Array<[number, unknown]>) {
  const fn = vi.fn();
  for (const [status, body] of responses) {
    fn.mockResolvedValueOnce(
      new Response(body === null ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
    );
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("roadmap → backend /api/v1/roadmap", () => {
  it("getMyRoadmap bóc lớp { roadmap }", async () => {
    const fetchMock = mockFetch([200, { roadmap: null }], [200, { roadmap: { id: "r1" } }]);
    expect(await getMyRoadmap()).toBeNull();
    expect(await getMyRoadmap()).toEqual({ id: "r1" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/roadmap/me");
  });

  it("saveMyRoadmap gửi PUT đúng các lựa chọn, không gửi số liệu tính toán", async () => {
    const fetchMock = mockFetch([200, { id: "r1" }]);
    await saveMyRoadmap({
      current_mode: "placement",
      target_score: 650,
      purpose: "job",
      duration_weeks: 12,
      minutes_per_day: 60,
      days_per_week: 5,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/roadmap/me");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      current_mode: "placement",
      target_score: 650,
      purpose: "job",
      duration_weeks: 12,
      minutes_per_day: 60,
      days_per_week: 5,
    });
  });

  it("lỗi server ném ApiError có mã", async () => {
    mockFetch([400, { code: "TARGET_NOT_ABOVE_CURRENT", message: "x" }]);
    await expect(getRoadmapPlacement()).rejects.toMatchObject({ code: "TARGET_NOT_ABOVE_CURRENT", status: 400 });
  });

  it("cờ bài test nhanh theo quiz id", () => {
    markPlacementStarted(42);
    expect(isPlacementQuiz("42")).toBe(true);
    expect(isPlacementQuiz(7)).toBe(false);
  });
});
