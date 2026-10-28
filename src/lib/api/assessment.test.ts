import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLatestQuizResult,
  getQuiz,
  getQuizResult,
  getQuizReview,
  listQuizQuestions,
  listResultAnswers,
  submitQuiz,
} from "./assessment";
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

const RESULT = {
  id: 100,
  user_id: "u1",
  quiz_id: 5,
  score: 6.67,
  correct_answers: 2,
  total_questions: 3,
  time_spent_seconds: 42,
  completed_at: "2026-10-28T10:00:00.000Z",
};

describe("assessment adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["getQuiz", () => getQuiz(5), "/api/v1/assessment/quizzes/5"],
    ["listQuizQuestions", () => listQuizQuestions(5), "/api/v1/assessment/quizzes/5/questions"],
    ["getQuizReview", () => getQuizReview(5), "/api/v1/assessment/quizzes/5/review"],
    ["listResultAnswers", () => listResultAnswers(100), "/api/v1/assessment/results/100/answers"],
  ])("%s gọi GET đúng URL và trả nguyên data", async (_name, call, url) => {
    const fetchMock = mockFetch(200, [{ id: 1 }]);
    const { data, error } = await call();
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }]);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(init?.method).toBe("GET");
  });

  it("submitQuiz gửi POST chỉ với đáp án đã chọn và thời gian, không gửi điểm", async () => {
    const fetchMock = mockFetch(201, { result: RESULT, is_first_attempt: true });
    const answers = [
      { question_id: 1, selected_answer_id: 11 },
      { question_id: 2, selected_answer_id: null },
    ];
    const { data, error } = await submitQuiz(5, answers, 42);
    expect(error).toBeNull();
    expect(data).toEqual({ result: RESULT, is_first_attempt: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/quizzes/5/submit");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ answers, time_spent_seconds: 42 });
  });

  it("getQuizResult: RESULT_NOT_FOUND → { data: null, error: null } như maybeSingle", async () => {
    mockFetch(404, { statusCode: 404, code: "RESULT_NOT_FOUND", message: "x" });
    await expect(getQuizResult(100)).resolves.toEqual({ data: null, error: null });
  });

  it("getQuizResult: 404 khác (sai route) vẫn trả error", async () => {
    mockFetch(404, { statusCode: 404, code: "NOT_FOUND", message: "Cannot GET" });
    const { data, error } = await getQuizResult(100);
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(ApiError);
  });

  it("getLatestQuizResult bóc .result (bản ghi và null)", async () => {
    mockFetch(200, { result: RESULT });
    await expect(getLatestQuizResult(5)).resolves.toEqual({ data: RESULT, error: null });
    mockFetch(200, { result: null });
    await expect(getLatestQuizResult(5)).resolves.toEqual({ data: null, error: null });
  });

  it("getQuizReview chưa nộp → 403 trả error, không ném", async () => {
    mockFetch(403, { statusCode: 403, code: "QUIZ_NOT_ATTEMPTED", message: "x" });
    const { data, error } = await getQuizReview(5);
    expect(data).toBeNull();
    expect(error?.code).toBe("QUIZ_NOT_ATTEMPTED");
  });

  it("lỗi 500 khi nộp → { data: null, error }, không ném", async () => {
    mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "x" });
    const { data, error } = await submitQuiz(5, [], 1);
    expect(data).toBeNull();
    expect(error?.status).toBe(500);
  });
});
