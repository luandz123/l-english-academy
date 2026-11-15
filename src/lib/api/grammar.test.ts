import { afterEach, describe, expect, it, vi } from "vitest";
import {
  answerGrammarItem,
  foldVi,
  getQuestionTopic,
  grammarMistakesQuery,
  splitErrorPrompt,
  startExerciseSession,
} from "@/lib/api/grammar";

function mockFetch(...responses: Array<[number, unknown]>) {
  const fn = vi.fn();
  for (const [status, body] of responses) {
    fn.mockResolvedValueOnce(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("grammar → backend /api/v1/grammar", () => {
  it("bắt đầu lượt và trả lời chỉ gửi lựa chọn, không gửi điểm/đáp án", async () => {
    const f = mockFetch([200, { id: "s1", items: [] }], [200, { correct: true }]);
    await startExerciseSession("cau-bi-dong", { level: "basic", count: 10, kind: "all" });
    await answerGrammarItem("s1", { index: 2, choice: 1 });
    expect(f.mock.calls[0][0]).toBe("/api/v1/grammar/topics/cau-bi-dong/exercise-sessions");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ level: "basic", count: 10, kind: "all" });
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ index: 2, choice: 1 });
  });

  it("bộ lọc Sổ lỗi ngữ pháp", () => {
    expect(grammarMistakesQuery({})).toBe("grammar/mistakes");
    expect(grammarMistakesQuery({ source: "toeic", status: "improving", days: 7, repeated: true })).toBe(
      "grammar/mistakes?source=toeic&status=improving&days=7&repeated=true",
    );
  });

  it("chủ điểm của câu TOEIC: gom nhiều câu vào một lần gọi", async () => {
    const f = mockFetch([200, [{ question_id: 11, slug: "cau-bi-dong", name: "Câu bị động" }]]);
    const [a, b] = await Promise.all([getQuestionTopic(11), getQuestionTopic(12)]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][0]).toBe("/api/v1/grammar/question-topics?ids=11,12");
    expect(a).toEqual({ slug: "cau-bi-dong", name: "Câu bị động" });
    expect(b).toBeNull();
  });

  it("tách câu tìm lỗi sai và tìm không dấu", () => {
    expect(splitErrorPrompt("The [[report]] [[were]] sent [[by]] [[him]].")).toEqual([
      { text: "The ", seg: null },
      { text: "report", seg: 0 },
      { text: " ", seg: null },
      { text: "were", seg: 1 },
      { text: " sent ", seg: null },
      { text: "by", seg: 2 },
      { text: " ", seg: null },
      { text: "him", seg: 3 },
      { text: ".", seg: null },
    ]);
    expect(foldVi("Câu bị động")).toBe("cau bi dong");
  });
});
