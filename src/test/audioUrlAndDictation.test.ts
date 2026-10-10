import { describe, it, expect } from "vitest";
import { formatAudioUrl } from "../utils/audioUrl";
import { isQuestionValidForMode } from "../pages/DictationPage";

describe("formatAudioUrl", () => {
  it("normalizes defunct supabase audio urls to working GCS sound endpoints", () => {
    const deadUrl =
      "https://squqwkxgsxqojhqmdvbo.supabase.co/storage/v1/object/public/materials/quiz_media/1779349402913_Q1_644291768-1597982561718-etstoeic_2020_0101.01.mp3";
    const result = formatAudioUrl(deadUrl);
    expect(result).toBe(
      "https://storage.googleapis.com/comaiphuong-edu-media/sound/644291768-1597982561718-etstoeic_2020_0101.01.mp3"
    );
  });

  it("leaves standard valid storage urls untouched", () => {
    const validUrl =
      "https://storage.googleapis.com/comaiphuong-edu-media/sound/401133352-1692677907165-part2mp32.mp3";
    expect(formatAudioUrl(validUrl)).toBe(validUrl);
  });

  it("handles null and empty strings gracefully", () => {
    expect(formatAudioUrl("")).toBe("");
    expect(formatAudioUrl(null)).toBe("");
    expect(formatAudioUrl(undefined)).toBe("");
  });
});

describe("isQuestionValidForMode", () => {
  it("accepts questions with legacy audio URLs once normalized", () => {
    const question = {
      id: 1,
      question_text: "Where is the meeting?",
      dictation_keywords: ["meeting"],
      audio_url:
        "https://squqwkxgsxqojhqmdvbo.supabase.co/storage/v1/object/public/materials/quiz_media/1779349402913_Q1_644291768-1597982561718-etstoeic_2020_0101.01.mp3",
      answers: [{ answer_text: "In room B", display_order: 1 }],
    };
    const check = isQuestionValidForMode(question, "drag");
    expect(check.isValid).toBe(true);
  });

  it("allows questions with text/transcript even if audio is missing (plays via TTS)", () => {
    const question = {
      id: 2,
      question_text: "Welcome to the international conference [___]",
      audio_url: null,
      answers: [{ answer_text: "today", display_order: 1 }],
    };
    const check = isQuestionValidForMode(question, "drag");
    expect(check.isValid).toBe(true);
  });

  it("rejects questions with no audio and no question text or transcript", () => {
    const question = {
      id: 3,
      question_text: "",
      transcript: "",
      audio_url: "",
      answers: [],
    };
    const check = isQuestionValidForMode(question, "drag");
    expect(check.isValid).toBe(false);
  });
});
