import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLessonQuizId,
  getLessonVocabWords,
  getVocabPool,
  listVocabCategories,
  listVocabQuizzes,
  listVocabWords,
} from "./vocab";
import { ApiError } from "./client";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const CATEGORY = {
  id: 1,
  course_id: 10,
  title: "Danh mục từ vựng",
  display_order: 1,
};

const QUIZ = {
  id: 100,
  category_id: 1,
  title: "Bài quiz từ vựng",
  total_questions: 10,
  display_order: 1,
  lesson_id: 50,
};

const WORD = {
  id: 1001,
  vocab_quiz_id: 100,
  word: "agenda",
  phonetic: "/əˈdʒen.də/",
  definition_en: "a list of matters",
  definition_vi: "lịch trình",
  example_sentence: "item on the agenda",
  image_url: null,
  audio_male_url: null,
  audio_female_url: null,
  wrong_answer_1: "a",
  wrong_answer_2: "b",
  wrong_answer_3: "c",
  display_order: 1,
  question_id: 42,
};

describe("vocab adapter (T-021)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listVocabCategories gọi GET /assessment/vocab/courses/:courseId/categories", async () => {
    const fetchMock = mockFetch(200, [CATEGORY]);
    const { data, error } = await listVocabCategories(10);
    expect(error).toBeNull();
    expect(data).toEqual([CATEGORY]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/courses/10/categories");
    expect(init?.method).toBe("GET");
  });

  it("listVocabQuizzes gọi GET /assessment/vocab/categories/:categoryId/quizzes", async () => {
    const fetchMock = mockFetch(200, [QUIZ]);
    const { data, error } = await listVocabQuizzes(1);
    expect(error).toBeNull();
    expect(data).toEqual([QUIZ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/categories/1/quizzes");
    expect(init?.method).toBe("GET");
  });

  it("listVocabWords gọi GET /assessment/vocab/quizzes/:vocabQuizId/words", async () => {
    const fetchMock = mockFetch(200, [WORD]);
    const { data, error } = await listVocabWords(100);
    expect(error).toBeNull();
    expect(data).toEqual([WORD]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/quizzes/100/words");
    expect(init?.method).toBe("GET");
  });

  it("getLessonVocabWords gọi GET /assessment/vocab/lessons/:ref/words không query", async () => {
    const fetchMock = mockFetch(200, [WORD]);
    const { data, error } = await getLessonVocabWords(50);
    expect(error).toBeNull();
    expect(data).toEqual([WORD]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/lessons/50/words");
    expect(init?.method).toBe("GET");
  });

  it("getLessonVocabWords gọi kèm query question_ids", async () => {
    const fetchMock = mockFetch(200, [WORD]);
    const { data, error } = await getLessonVocabWords(50, [42, 43]);
    expect(error).toBeNull();
    expect(data).toEqual([WORD]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/lessons/50/words?question_ids=42,43");
    expect(init?.method).toBe("GET");
  });

  it("getLessonQuizId bóc .lesson khi bài học tồn tại", async () => {
    const fetchMock = mockFetch(200, { lesson: { quiz_id: 99 } });
    const { data, error } = await getLessonQuizId(50);
    expect(error).toBeNull();
    expect(data).toEqual({ quiz_id: 99 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/lessons/50/quiz-id");
    expect(init?.method).toBe("GET");
  });

  it("getLessonQuizId trả data: null khi lesson: null", async () => {
    mockFetch(200, { lesson: null });
    const { data, error } = await getLessonQuizId(999);
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("getVocabPool gọi endpoint pool với limit", async () => {
    const fetchMock = mockFetch(200, [{ id: 1, word: "test", phonetic: null, definition_vi: "thử", audio_male_url: null }]);
    const { data, error } = await getVocabPool(50);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/vocab/pool?limit=50");
    expect(init?.method).toBe("GET");
  });

  it("lỗi HTTP trả { data: null, error }", async () => {
    mockFetch(400, { statusCode: 400, code: "VALIDATION_FAILED", message: "Error" });
    const res = await getLessonVocabWords(50);
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(ApiError);
    expect(res.error?.code).toBe("VALIDATION_FAILED");
  });
});
