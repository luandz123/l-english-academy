import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bulkDeleteAdminFullTests,
  createAdminFullTestQuestion,
  createLessonQuiz,
  createModuleQuiz,
  createQuizQuestion,
  deleteAdminFullTest,
  deleteAdminFullTestQuestion,
  deleteModuleQuiz,
  deleteQuizQuestion,
  deleteQuizQuestions,
  duplicateAdminFullTestQuestion,
  getAdminFullTestDetail,
  getAdminFullTestQuestions,
  getDictationAnswers,
  getDictationLesson,
  getDictationQuiz,
  getDictationVocab,
  getLatestQuizResult,
  getOrCreateDictationResult,
  getQuiz,
  getQuizResult,
  getQuizReview,
  importAdminFullTestQuestions,
  listAdminQuizQuestions,
  listMyQuizResults,
  listQuizQuestions,
  listResultAnswers,
  listUserQuizResults,
  markDictationQuestionDone,
  packageImportAdminFullTests,
  patchQuiz,
  reorderQuizQuestions,
  resetDictation,
  setQuizQuestionImages,
  submitQuiz,
  syncDictationSession,
  unmarkDictationQuestionDone,
  updateAdminFullTest,
  updateAdminFullTestQuestion,
  updateAdminQuestionGroup,
  updateModuleQuiz,
  updateQuizQuestion,
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
    ["listMyQuizResults", () => listMyQuizResults(), "/api/v1/assessment/results/me"],
    ["listUserQuizResults", () => listUserQuizResults("u-123"), "/api/v1/assessment/admin/users/u-123/results"],
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

  it("listMyQuizResults và listUserQuizResults gặp lỗi → trả { data: null, error }, không ném", async () => {
    mockFetch(401, { statusCode: 401, code: "UNAUTHORIZED", message: "Chưa đăng nhập" });
    const res1 = await listMyQuizResults();
    expect(res1.data).toBeNull();
    expect(res1.error).toBeInstanceOf(ApiError);
    expect(res1.error?.status).toBe(401);

    mockFetch(403, { statusCode: 403, code: "FORBIDDEN", message: "Không phải admin" });
    const res2 = await listUserQuizResults("u-123");
    expect(res2.data).toBeNull();
    expect(res2.error).toBeInstanceOf(ApiError);
    expect(res2.error?.status).toBe(403);
  });

  describe("admin assessment adapters (T-023)", () => {
    it("listAdminQuizQuestions gọi GET /api/v1/assessment/admin/quizzes/:quizId/questions", async () => {
      const mockQuestions = [{ id: 1, question_text: "Q1" }];
      const fetchMock = mockFetch(200, mockQuestions);
      const { data, error } = await listAdminQuizQuestions(10);
      expect(error).toBeNull();
      expect(data).toEqual(mockQuestions);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10/questions");
      expect(init?.method).toBe("GET");
    });

    it("createQuizQuestion gọi POST /api/v1/assessment/admin/quizzes/:quizId/questions", async () => {
      const body = {
        question_text: "Q1",
        answers: [{ answer_text: "A", is_correct: true }],
      };
      const fetchMock = mockFetch(201, { id: 1, ...body });
      const { data, error } = await createQuizQuestion(10, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10/questions");
      expect(init?.method).toBe("POST");
    });

    it("updateQuizQuestion gọi PUT /api/v1/assessment/admin/questions/:id", async () => {
      const body = {
        question_text: "Q1 updated",
        answers: [{ answer_text: "B", is_correct: true }],
      };
      const fetchMock = mockFetch(200, { id: 5, ...body });
      const { data, error } = await updateQuizQuestion(5, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(5);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/questions/5");
      expect(init?.method).toBe("PUT");
    });

    it("deleteQuizQuestion gọi DELETE /api/v1/assessment/admin/questions/:id", async () => {
      const fetchMock = mockFetch(204);
      const { error } = await deleteQuizQuestion(5);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/questions/5");
      expect(init?.method).toBe("DELETE");
    });

    it("deleteQuizQuestions gọi POST /api/v1/assessment/admin/quizzes/:quizId/questions/bulk-delete", async () => {
      const fetchMock = mockFetch(204);
      const { error } = await deleteQuizQuestions(10, [1, 2]);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10/questions/bulk-delete");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({ question_ids: [1, 2] });
    });

    it("reorderQuizQuestions gọi PUT /api/v1/assessment/admin/quizzes/:quizId/question-order", async () => {
      const fetchMock = mockFetch(204);
      const { error } = await reorderQuizQuestions(10, [2, 1]);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10/question-order");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({ question_ids: [2, 1] });
    });

    it("setQuizQuestionImages gọi PUT /api/v1/assessment/admin/quizzes/:quizId/question-images", async () => {
      const items = [{ question_id: 1, image_url: "img.png" }];
      const fetchMock = mockFetch(204);
      const { error } = await setQuizQuestionImages(10, items);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10/question-images");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({ items });
    });

    it("patchQuiz gọi PATCH /api/v1/assessment/admin/quizzes/:quizId", async () => {
      const fetchMock = mockFetch(200, { id: 10, audio_url: "audio.mp3" });
      const { data, error } = await patchQuiz(10, { audio_url: "audio.mp3" });
      expect(error).toBeNull();
      expect(data?.audio_url).toBe("audio.mp3");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/10");
      expect(init?.method).toBe("PATCH");
    });

    it("createModuleQuiz gọi POST /api/v1/assessment/admin/modules/:moduleId/quizzes", async () => {
      const body = { title: "New Quiz", total_questions: 10, time_limit_seconds: 600 };
      const fetchMock = mockFetch(201, { id: 20, ...body });
      const { data, error } = await createModuleQuiz(3, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(20);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/modules/3/quizzes");
      expect(init?.method).toBe("POST");
    });

    it("updateModuleQuiz gọi PUT /api/v1/assessment/admin/quizzes/:id", async () => {
      const body = { title: "Updated Quiz", total_questions: 15, time_limit_seconds: 900 };
      const fetchMock = mockFetch(200, { id: 20, ...body });
      const { data, error } = await updateModuleQuiz(20, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(20);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/20");
      expect(init?.method).toBe("PUT");
    });

    it("deleteModuleQuiz gọi DELETE /api/v1/assessment/admin/quizzes/:id", async () => {
      const fetchMock = mockFetch(204);
      const { error } = await deleteModuleQuiz(20);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/quizzes/20");
      expect(init?.method).toBe("DELETE");
    });

    it("createLessonQuiz gọi POST /api/v1/assessment/admin/lessons/:lessonId/quiz", async () => {
      const fetchMock = mockFetch(201, { id: 30, title: "Quiz - Lesson" });
      const { data, error } = await createLessonQuiz(7);
      expect(error).toBeNull();
      expect(data?.id).toBe(30);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/lessons/7/quiz");
      expect(init?.method).toBe("POST");
    });

    it("getAdminFullTestDetail gọi GET /api/v1/assessment/admin/full-tests/:testId", async () => {
      const fetchMock = mockFetch(200, { id: 5, title: "Full Test 1", courses: { id: 1, title: "Course 1" } });
      const { data, error } = await getAdminFullTestDetail(5);
      expect(error).toBeNull();
      expect(data?.id).toBe(5);
      expect(data?.courses?.title).toBe("Course 1");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/full-tests/5");
      expect(init?.method).toBe("GET");
    });

    it("getAdminFullTestQuestions gọi GET /api/v1/assessment/admin/full-tests/:testId/questions", async () => {
      const fetchMock = mockFetch(200, [{ id: 10, part_number: 1, question_text: "Q1" }]);
      const { data, error } = await getAdminFullTestQuestions(5);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].part_number).toBe(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/full-tests/5/questions");
      expect(init?.method).toBe("GET");
    });

    it("updateAdminFullTest gọi PUT /api/v1/assessment/admin/full-tests/:testId", async () => {
      const body = { title: "Updated Title", description: "Desc" };
      const fetchMock = mockFetch(200, { id: 5, ...body });
      const { data, error } = await updateAdminFullTest(5, body);
      expect(error).toBeNull();
      expect(data?.title).toBe("Updated Title");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/full-tests/5");
      expect(init?.method).toBe("PUT");
    });

    it("createAdminFullTestQuestion gọi POST /api/v1/assessment/admin/full-tests/:testId/questions", async () => {
      const body = {
        part_number: 2,
        display_order: 10,
        question_text: "New Q",
        answers: [{ answer_text: "A", is_correct: true }],
      };
      const fetchMock = mockFetch(201, { id: 15, ...body });
      const { data, error } = await createAdminFullTestQuestion(5, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(15);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/full-tests/5/questions");
      expect(init?.method).toBe("POST");
    });

    it("updateAdminFullTestQuestion gọi PUT /api/v1/assessment/admin/fulltest-questions/:id", async () => {
      const body = {
        display_order: 1,
        question_text: "Updated Q",
        answers: [{ id: 1, answer_text: "A", is_correct: true }],
      };
      const fetchMock = mockFetch(200, { id: 15, ...body });
      const { data, error } = await updateAdminFullTestQuestion(15, body);
      expect(error).toBeNull();
      expect(data?.id).toBe(15);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/fulltest-questions/15");
      expect(init?.method).toBe("PUT");
    });

    it("deleteAdminFullTestQuestion gọi DELETE /api/v1/assessment/admin/fulltest-questions/:id", async () => {
      const fetchMock = mockFetch(204);
      const { error } = await deleteAdminFullTestQuestion(15);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/fulltest-questions/15");
      expect(init?.method).toBe("DELETE");
    });

    it("duplicateAdminFullTestQuestion gọi POST /api/v1/assessment/admin/fulltest-questions/:id/duplicate", async () => {
      const fetchMock = mockFetch(201, { id: 16, question_text: "Q (Bản sao)" });
      const { data, error } = await duplicateAdminFullTestQuestion(15);
      expect(error).toBeNull();
      expect(data?.id).toBe(16);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/fulltest-questions/15/duplicate");
      expect(init?.method).toBe("POST");
    });

    it("updateAdminQuestionGroup gọi PUT /api/v1/assessment/admin/full-tests/:testId/question-group", async () => {
      const body = { question_ids: [1, 2], group_id: "grp" };
      const fetchMock = mockFetch(204);
      const { error } = await updateAdminQuestionGroup(5, body);
      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/assessment/admin/full-tests/5/question-group");
      expect(init?.method).toBe("PUT");
    });

    it("lỗi 500 khi gọi adapter → trả { error: ApiError }, không ném", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const res = await listAdminQuizQuestions(1);
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(ApiError);
      expect(res.error?.status).toBe(500);
    });

    describe("dictation APIs (T-025)", () => {
      it("getDictationQuiz gọi GET /api/v1/assessment/dictation/quizzes/:quizId", async () => {
        const payload = { quiz: { id: 1 }, questions: [] };
        const fetchMock = mockFetch(200, payload);
        const { data, error } = await getDictationQuiz(1);
        expect(error).toBeNull();
        expect(data).toEqual(payload);
        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1");
      });

      it("getDictationLesson gọi GET /api/v1/assessment/dictation/quizzes/:quizId/lesson", async () => {
        const fetchMock = mockFetch(200, { id: 42 });
        const { data, error } = await getDictationLesson(1);
        expect(error).toBeNull();
        expect(data).toEqual({ id: 42 });
        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/lesson");
      });

      it("getDictationVocab gọi GET /api/v1/assessment/dictation/quizzes/:quizId/vocab", async () => {
        const fetchMock = mockFetch(200, [{ word: "hello" }]);
        const { data, error } = await getDictationVocab(1);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/vocab");
      });

      it("getOrCreateDictationResult gọi GET /api/v1/assessment/dictation/quizzes/:quizId/result", async () => {
        const fetchMock = mockFetch(200, { id: 10, score: 0 });
        const { data, error } = await getOrCreateDictationResult(1);
        expect(error).toBeNull();
        expect(data?.score).toBe(0);
        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/result");
      });

      it("getDictationAnswers gọi GET /api/v1/assessment/dictation/quizzes/:quizId/answers", async () => {
        const fetchMock = mockFetch(200, [{ id: 1, question_id: 101, is_correct: true }]);
        const { data, error } = await getDictationAnswers(1);
        expect(error).toBeNull();
        expect(data).toHaveLength(1);
        const [url] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/answers");
      });

      it("markDictationQuestionDone gọi PUT /api/v1/assessment/dictation/quizzes/:quizId/questions/:questionId/done", async () => {
        const fetchMock = mockFetch(200, { score: 1, correct_answers: 1, total_questions: 2 });
        const { data, error } = await markDictationQuestionDone(1, 101);
        expect(error).toBeNull();
        expect(data?.score).toBe(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/questions/101/done");
        expect(init?.method).toBe("PUT");
      });

      it("unmarkDictationQuestionDone gọi DELETE /api/v1/assessment/dictation/quizzes/:quizId/questions/:questionId/done", async () => {
        const fetchMock = mockFetch(200, { score: 0, correct_answers: 0, total_questions: 2 });
        const { data, error } = await unmarkDictationQuestionDone(1, 101);
        expect(error).toBeNull();
        expect(data?.score).toBe(0);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/questions/101/done");
        expect(init?.method).toBe("DELETE");
      });

      it("syncDictationSession gọi POST /api/v1/assessment/dictation/quizzes/:quizId/sync", async () => {
        const fetchMock = mockFetch(200, { score: 2, correct_answers: 2, total_questions: 2 });
        const { data, error } = await syncDictationSession(1, [101, 102]);
        expect(error).toBeNull();
        expect(data?.score).toBe(2);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/sync");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({ question_ids: [101, 102] });
      });

      it("resetDictation gọi POST /api/v1/assessment/dictation/quizzes/:quizId/reset", async () => {
        const fetchMock = mockFetch(200, { score: 0, correct_answers: 0, total_questions: 2 });
        const { data, error } = await resetDictation(1);
        expect(error).toBeNull();
        expect(data?.score).toBe(0);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/dictation/quizzes/1/reset");
        expect(init?.method).toBe("POST");
      });

      it("deleteAdminFullTest gọi DELETE /api/v1/assessment/admin/full-tests/:id", async () => {
        const fetchMock = mockFetch(204);
        const { error } = await deleteAdminFullTest(10);
        expect(error).toBeNull();
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/admin/full-tests/10");
        expect(init?.method).toBe("DELETE");
      });

      it("bulkDeleteAdminFullTests gọi POST /api/v1/assessment/admin/full-tests/bulk-delete", async () => {
        const fetchMock = mockFetch(200, { count: 3 });
        const { data, error } = await bulkDeleteAdminFullTests([1, 2, 3]);
        expect(error).toBeNull();
        expect(data?.count).toBe(3);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/admin/full-tests/bulk-delete");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({ test_ids: [1, 2, 3] });
      });

      it("importAdminFullTestQuestions gọi POST /api/v1/assessment/admin/full-tests/:testId/import-questions", async () => {
        const fetchMock = mockFetch(201, { test_id: 10, imported_questions: 5 });
        const { data, error } = await importAdminFullTestQuestions(10, [{ question_text: "Q1" }]);
        expect(error).toBeNull();
        expect(data?.imported_questions).toBe(5);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/admin/full-tests/10/import-questions");
        expect(init?.method).toBe("POST");
      });

      it("packageImportAdminFullTests gọi POST /api/v1/assessment/admin/full-tests/package-import", async () => {
        const fetchMock = mockFetch(201, { course_id: 5, exams_imported: 2 });
        const { data, error } = await packageImportAdminFullTests({
          course_id: 5,
          exams: [{ exam_title: "Exam 1", questions: [] }],
        });
        expect(error).toBeNull();
        expect(data?.exams_imported).toBe(2);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/v1/assessment/admin/full-tests/package-import");
        expect(init?.method).toBe("POST");
      });
    });
  });
});
