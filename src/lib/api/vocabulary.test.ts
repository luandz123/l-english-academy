import { afterEach, describe, expect, it, vi } from "vitest";
import { listNotebook, lookupWord, reviewCard, saveWord, wordKeyOf } from "@/lib/api/vocabulary";

function mockFetch(...responses: Array<[number, unknown]>) {
  const fn = vi.fn();
  for (const [status, body] of responses) {
    fn.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("vocabulary → backend /api/v1/vocabulary", () => {
  it("tra từ và lọc sổ gửi đúng tham số", async () => {
    const f = mockFetch([200, {}], [200, { items: [] }]);
    await lookupWord("agreements");
    await listNotebook({ sources: ["reading", "listening"], states: ["new"], due: true, page: 2 });
    expect(f.mock.calls[0][0]).toBe("/api/v1/vocabulary/lookup?word=agreements");
    expect(f.mock.calls[1][0]).toBe("/api/v1/vocabulary/notebook?sources=reading%2Clistening&states=new&due=true&page=2");
  });

  it("lưu từ và chấm thẻ chỉ gửi nội dung/nút đánh giá, không gửi lịch ôn", async () => {
    const f = mockFetch([200, { word: {}, already: false }], [200, {}]);
    await saveWord({ word: "ledger", source: "reading", example: "Check the ledger." });
    await reviewCard(5, "good");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ word: "ledger", source: "reading", example: "Check the ledger." });
    expect([f.mock.calls[1][0], JSON.parse(f.mock.calls[1][1].body)]).toEqual(["/api/v1/vocabulary/review/5", { rating: "good" }]);
  });

  it("khóa từ khớp backend", () => {
    expect(wordKeyOf("  Agreement, ")).toBe("agreement");
  });
});
