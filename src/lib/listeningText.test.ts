import { describe, expect, it } from "vitest";
import {
  buildPassageSentences,
  findAnswerSentence,
  isBlankCorrect,
  pickBlanks,
  questionCategory,
  questionKeywords,
  speakerLabel,
  splitSentences,
  tokenizeForBlanks,
} from "./listeningText";
import { buildListeningUnits, normalizeLegacySteps, progressKeyOf } from "@/data/listeningUnits";
import type { Part2Cluster, Part2CoachQuestion } from "@/types/part2Coach";

describe("splitSentences / speakerLabel", () => {
  it("không cắt ở Mr. và a.m.", () => {
    expect(splitSentences("Mr. Kim called at 9 a.m. today. He left a message!")).toEqual([
      "Mr. Kim called at 9 a.m. today.",
      "He left a message!",
    ]);
  });
  it("đổi mã người nói", () => {
    expect(speakerLabel("W1")).toBe("Nữ 1");
    expect(speakerLabel("M")).toBe("Nam");
  });
});

describe("buildPassageSentences", () => {
  it("tách theo lượt nói và câu, ghép bản dịch theo câu", () => {
    const s = buildPassageSentences(
      "W1: Hi, good morning. My heater stopped working.\nM1: I'm sorry to hear that.",
      "W1: Xin chào. Máy sưởi của tôi bị hỏng.\nM1: Tôi rất tiếc.",
    );
    expect(s.map((x) => [x.speaker, x.text, x.translation])).toEqual([
      ["Nữ 1", "Hi, good morning.", "Xin chào."],
      ["Nữ 1", "My heater stopped working.", "Máy sưởi của tôi bị hỏng."],
      ["Nam 1", "I'm sorry to hear that.", "Tôi rất tiếc."],
    ]);
  });
  it("số câu dịch không khớp: gắn bản dịch cả lượt vào câu cuối", () => {
    const s = buildPassageSentences("M: One. Two.", "M: Một và hai.");
    expect(s[0].translation).toBeUndefined();
    expect(s[1]).toMatchObject({ translation: "Một và hai.", translationIsTurn: true });
  });
});

describe("pickBlanks", () => {
  it("ưu tiên từ trong danh sách từ vựng, câu ngắn 1 ô", () => {
    const text = "Some bicycles are parked in a rack.";
    const tokens = tokenizeForBlanks(text);
    const idx = pickBlanks(text, ["rack"]);
    expect(idx.map((i) => tokens[i])).toEqual(["rack"]);
  });
  it("câu dài 2 ô, không chọn tên riêng", () => {
    const text = "PulsePoint Fitness is opening a brand-new studio on Chestnut Avenue this Saturday.";
    const tokens = tokenizeForBlanks(text);
    const words = pickBlanks(text).map((i) => tokens[i]);
    expect(words).toHaveLength(2);
    expect(words.some((w) => /^[A-Z]/.test(w))).toBe(false);
  });
  it("so đáp án không phân biệt hoa thường, dấu câu", () => {
    expect(isBlankCorrect(" Rack. ", "rack")).toBe(true);
    expect(isBlankCorrect("", "rack")).toBe(false);
  });
});

describe("findAnswerSentence", () => {
  it("tìm câu trùng nhiều từ với đáp án, không chắc thì -1", () => {
    const sentences = ["Hi, good morning.", "I'm having a problem with my heater.", "It just stopped working."];
    expect(findAnswerSentence(sentences, "To report a problem with a heater")).toBe(1);
    expect(findAnswerSentence(sentences, "To complain about a neighbor")).toBe(-1);
  });
});

describe("questionCategory / questionKeywords", () => {
  it("phân dạng câu hỏi Part 3/4", () => {
    expect(questionCategory("What will the man most likely do next?").label).toBe("Hành động tiếp theo");
    expect(questionCategory("Look at the graphic. Which room will they use?").label).toBe("Câu hỏi biểu đồ");
    expect(questionCategory("Who most likely is the woman?").label).toBe("Người nói / nơi chốn");
    expect(questionCategory("What does the woman ask the man to do?").label).toBe("Yêu cầu / đề nghị");
    expect(questionCategory("What is the conversation mainly about?").label).toBe("Chủ đề / mục đích");
    expect(questionCategory("Why has the woman come to the office?").label).toBe("Chủ đề / mục đích");
    expect(questionCategory("When will the shipment arrive?").label).toBe("Chi tiết");
  });
  it("bỏ từ để hỏi và từ chung chung", () => {
    expect(questionKeywords("Why has the woman come to the office?")).toEqual(["office"]);
  });
});

const q = (id: number, n: number, audio: string): Part2CoachQuestion =>
  ({ id, questionNumber: n, audioUrl: audio, part: "part3" }) as Part2CoachQuestion;

describe("listeningUnits", () => {
  it("Part 3/4: tách bài thành từng đoạn audio, mã mới theo số câu", () => {
    const cluster = {
      id: "study4-c1-t1-p3-q32-q37",
      part: "part3",
      title: "Study4 Collection 1 - Test 01 (Part 3): Câu 32 – 37",
      description: "Luyện nghe Part 3 (Hội thoại ngắn · 6 câu)",
      questions: [q(1, 32, "a"), q(2, 33, "a"), q(3, 34, "a"), q(4, 35, "b"), q(5, 36, "b"), q(6, 37, "b")],
    } as Part2Cluster;
    const units = buildListeningUnits([cluster]);
    expect(units.map((u) => [u.id, u.title.slice(-11), u.questions.length, u.parentId])).toEqual([
      ["study4-c1-t1-p3-q32-q34", "Câu 32 – 34", 3, cluster.id],
      ["study4-c1-t1-p3-q35-q37", "Câu 35 – 37", 3, cluster.id],
    ]);
    expect(units[0].description).toContain("· 3 câu");
  });
  it("khóa tiến độ và quy đổi bước cũ của Part 2", () => {
    expect(progressKeyOf({ id: "x-p1-q1-q6", part: "part1" })).toBe("v2-x-p1-q1-q6");
    expect(progressKeyOf({ id: "x-q7-q11", part: "part2" })).toBe("x-q7-q11");
    expect(normalizeLegacySteps("part2", [1, 2, 6, 7], 6)).toEqual([1, 2, 6]);
    expect(normalizeLegacySteps("part3", [1, 7], 6)).toEqual([1]);
  });
});
