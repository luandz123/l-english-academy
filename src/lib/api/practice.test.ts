import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPracticeSession,
  getActivePracticeSession,
  listExamLibrary,
  listMistakes,
  savePracticeAnswer,
  setExamFavorite,
  setQuestionBookmark,
} from "@/lib/api/practice";

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

describe("practice → backend /api/v1/practice", () => {
  it("tạo lượt chỉ gửi cấu hình, không gửi điểm/đáp án", async () => {
    const fetchMock = mockFetch([201, { id: "s1" }]);
    await createPracticeSession({ kind: "question_type", parts: [2], categories: ["wh"], count: 10, mode: "practice", feedback: "immediate" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/practice/sessions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ kind: "question_type", parts: [2], categories: ["wh"], count: 10, mode: "practice", feedback: "immediate" });
  });

  it("lưu câu trả lời gửi question_id + selected_answer_id", async () => {
    const fetchMock = mockFetch([200, { saved: true, locked: false, feedback: null }]);
    await savePracticeAnswer("s1", 5, 9);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/practice/sessions/s1/answers");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ question_id: 5, selected_answer_id: 9 });
  });

  it("bóc lớp { session } của lượt đang làm", async () => {
    mockFetch([200, { session: null }]);
    expect(await getActivePracticeSession()).toBeNull();
  });

  it("bộ lọc thư viện và sổ câu sai gửi dạng danh sách cách dấu phẩy", async () => {
    const fetchMock = mockFetch([200, { items: [] }], [200, { items: [] }]);
    await listExamLibrary({ years: ["2025", "older"], parts: [5, 7], verified: "verified", q: "  ", sort: "popular" });
    await listMistakes({ parts: [2], statuses: ["fixed"], bookmarked: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/practice/library/exams?years=2025%2Colder&parts=5%2C7&verified=verified&sort=popular");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/practice/mistakes?parts=2&statuses=fixed&bookmarked=true");
  });

  it("yêu thích / bookmark dùng PUT để bật, DELETE để tắt", async () => {
    const fetchMock = mockFetch([200, {}], [200, {}], [200, {}]);
    await setExamFavorite(3, true);
    await setExamFavorite(3, false);
    await setQuestionBookmark(8, true);
    expect(fetchMock.mock.calls.map((c) => [c[0], c[1].method])).toEqual([
      ["/api/v1/practice/favorites/3", "PUT"],
      ["/api/v1/practice/favorites/3", "DELETE"],
      ["/api/v1/practice/mistakes/bookmarks/8", "PUT"],
    ]);
  });

  it("thiếu câu → ApiError kèm details.available", async () => {
    mockFetch([422, { code: "INSUFFICIENT_QUESTIONS", message: "Chỉ có 3 câu", details: { available: 3 } }]);
    await expect(createPracticeSession({ kind: "mini_test", skill: "reading", count: 10, mode: "test" })).rejects.toMatchObject({
      code: "INSUFFICIENT_QUESTIONS",
      details: { available: 3 },
    });
  });
});
