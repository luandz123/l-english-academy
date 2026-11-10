import { afterEach, describe, expect, it, vi } from "vitest";
import { compareAttempts, getWeaknesses, skipRecommendation, startDiagnostic } from "@/lib/api/analytics";
import { createPracticeSession } from "@/lib/api/practice";

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

describe("analytics → backend /api/v1/analytics", () => {
  it("điểm yếu gửi cửa sổ và kỹ năng", async () => {
    const f = mockFetch([200, { state: "empty" }]);
    await getWeaknesses("90", "reading");
    expect(f.mock.calls[0][0]).toBe("/api/v1/analytics/weaknesses?window=90&skill=reading");
  });

  it("so sánh gửi danh sách id; bỏ qua đề xuất dùng POST", async () => {
    const f = mockFetch([200, {}], [204, null]);
    await compareAttempts([3, 7]);
    await skipRecommendation(12);
    expect(f.mock.calls[0][0]).toBe("/api/v1/analytics/compare?ids=3%2C7");
    expect([f.mock.calls[1][0], f.mock.calls[1][1].method]).toEqual(["/api/v1/analytics/recommendations/12/skip", "POST"]);
  });

  it("bắt đầu bài kiểm tra trình độ và luyện câu chưa làm không gửi điểm", async () => {
    const f = mockFetch([200, { id: "s" }], [201, { id: "p" }]);
    await startDiagnostic(true);
    await createPracticeSession({ kind: "question_type", parts: [5], categories: ["pronoun"], count: 10, mode: "practice", unseen_only: true });
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ restart: true });
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({
      kind: "question_type",
      parts: [5],
      categories: ["pronoun"],
      count: 10,
      mode: "practice",
      unseen_only: true,
    });
  });
});
