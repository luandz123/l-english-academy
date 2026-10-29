import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFullTest,
  getFullTestQuestions,
  getFullTestResult,
  getLatestFullTestResult,
  listCourseFullTests,
  listFullTestAnswerDetails,
  listMyFullTestResults,
  submitFullTest,
} from "./fullTest";

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

const RESULT = { id: 9, total_score: 990, correct_answers: 200 };

describe("fullTest adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["getFullTestQuestions", () => getFullTestQuestions(3), "/api/v1/assessment/full-tests/3/questions"],
    ["listFullTestAnswerDetails", () => listFullTestAnswerDetails(9), "/api/v1/assessment/full-test-results/9/answers"],
  ])("%s gọi GET đúng URL", async (_n, call, url) => {
    const fetchMock = mockFetch(200, []);
    await expect(call()).resolves.toEqual({ data: [], error: null });
    expect(fetchMock.mock.calls[0][0]).toBe(url);
  });

  it("submitFullTest gửi đáp án + thông tin phiên, không gửi điểm", async () => {
    const fetchMock = mockFetch(201, RESULT);
    const input = {
      answers: [{ question_id: 1, selected_answer_id: 11 }],
      selected_parts: [5],
      test_mode: "exam" as const,
      time_spent_seconds: 60,
      pause_count: 0,
      time_allocated_minutes: 15,
      answers_map: { "0": 11 },
    };
    await expect(submitFullTest(3, input)).resolves.toEqual({ data: RESULT, error: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/assessment/full-tests/3/submit");
    expect(init?.method).toBe("POST");
    const sent = JSON.parse(init?.body as string);
    expect(sent).toEqual(input);
    expect(sent).not.toHaveProperty("total_score");
  });

  it("404 FULLTEST_NOT_FOUND / RESULT_NOT_FOUND → { data: null, error: null } như maybeSingle", async () => {
    mockFetch(404, { statusCode: 404, code: "FULLTEST_NOT_FOUND", message: "x" });
    await expect(getFullTest(1)).resolves.toEqual({ data: null, error: null });
    mockFetch(404, { statusCode: 404, code: "RESULT_NOT_FOUND", message: "x" });
    await expect(getFullTestResult(1)).resolves.toEqual({ data: null, error: null });
  });

  it("getLatestFullTestResult bóc .result; 403 FULLTEST_LOCKED trả error, không ném", async () => {
    mockFetch(200, { result: RESULT });
    await expect(getLatestFullTestResult(3)).resolves.toEqual({ data: RESULT, error: null });
    mockFetch(403, { statusCode: 403, code: "FULLTEST_LOCKED", message: "x" });
    const locked = await getFullTestQuestions(3);
    expect(locked.data).toBeNull();
    expect(locked.error?.code).toBe("FULLTEST_LOCKED");
  });

  it("listCourseFullTests gọi GET đúng URL", async () => {
    const tests = [{ id: 1, title: "Test 1" }];
    const fetchMock = mockFetch(200, tests);
    await expect(listCourseFullTests(42)).resolves.toEqual({ data: tests, error: null });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/assessment/courses/42/full-tests");
  });

  it("listMyFullTestResults gọi GET đúng URL và xử lý lỗi không ném", async () => {
    const results = [{ id: 10, total_score: 850, full_tests: { id: 1, title: "Test 1" } }];
    const fetchMock = mockFetch(200, results);
    await expect(listMyFullTestResults()).resolves.toEqual({ data: results, error: null });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/assessment/full-test-results/me");

    mockFetch(500, { statusCode: 500, message: "Internal server error" });
    const res = await listMyFullTestResults();
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
  });
});
