import { describe, expect, it } from "vitest";
import { splitSentences } from "@/lib/transcript";

describe("splitSentences", () => {
  it("tách theo người nói và câu, giữ nhãn", () => {
    const out = splitSentences("W: Hi, Tom. Is the report ready?\nM: Almost. I need an hour.");
    expect(out).toEqual([
      { speaker: "W", text: "Hi, Tom." },
      { speaker: null, text: "Is the report ready?" },
      { speaker: "M", text: "Almost." },
      { speaker: null, text: "I need an hour." },
    ]);
  });

  it("tách đáp án Part 2 (A)(B)(C)", () => {
    const out = splitSentences("Where is the meeting? (A) In room B. (B) Yes, it is.");
    expect(out.map((s) => s.speaker)).toEqual([null, "(A)", "(B)"]);
  });
});
