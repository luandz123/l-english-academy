import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addStudentNote,
  getAdminCourseEnrollments,
  getAdminQuestionsByIds,
  getAdminQuizScores,
  getAdminRecentEnrollments,
  getAdminRecentResults,
  getAdminStatsCounts,
  getAdminStudents,
  getAdminUserAnswers,
  getPublicSetting,
  listAdminSettings,
  listStudentNotes,
  saveSetting,
} from "./admin";
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

const NOTE = {
  id: 1,
  admin_id: "a-1",
  student_id: "s-1",
  content: "Ghi chú test",
  created_at: "2026-10-28T12:00:00.000Z",
};

const SETTING = {
  key: "homepage_showcase_config",
  value: '{"vip_combo":{"price":1750000}}',
  updated_at: "2026-10-28T12:00:00.000Z",
};

describe("admin adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("listStudentNotes gọi GET đúng URL và trả nguyên data", async () => {
    const fetchMock = mockFetch(200, [NOTE]);
    const { data, error } = await listStudentNotes("s-1");
    expect(error).toBeNull();
    expect(data).toEqual([NOTE]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/users/s-1/notes");
    expect(init?.method).toBe("GET");
  });

  it("addStudentNote gửi POST chỉ với { content } (không gửi admin_id)", async () => {
    const fetchMock = mockFetch(201, NOTE);
    const { data, error } = await addStudentNote("s-1", "Ghi chú test");
    expect(error).toBeNull();
    expect(data).toEqual(NOTE);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/admin/users/s-1/notes");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ content: "Ghi chú test" });
  });

  it("lỗi HTTP trả { data: null, error } và không ném", async () => {
    mockFetch(403, { statusCode: 403, code: "FORBIDDEN", message: "Forbidden" });
    const res1 = await listStudentNotes("s-1");
    expect(res1.data).toBeNull();
    expect(res1.error).toBeInstanceOf(ApiError);
    expect(res1.error?.status).toBe(403);

    mockFetch(404, { statusCode: 404, code: "USER_NOT_FOUND", message: "Not found" });
    const res2 = await addStudentNote("s-1", "x");
    expect(res2.data).toBeNull();
    expect(res2.error).toBeInstanceOf(ApiError);
    expect(res2.error?.code).toBe("USER_NOT_FOUND");
  });

  describe("platform settings", () => {
    it("getPublicSetting bóc .setting từ response { setting: SettingDto | null }", async () => {
      const fetchMock = mockFetch(200, { setting: SETTING });
      const { data, error } = await getPublicSetting("homepage_showcase_config");
      expect(error).toBeNull();
      expect(data).toEqual(SETTING);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/settings/homepage_showcase_config");
      expect(init?.method).toBe("GET");
    });

    it("getPublicSetting trả data: null khi server trả { setting: null }", async () => {
      mockFetch(200, { setting: null });
      const { data, error } = await getPublicSetting("secret_key");
      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("listAdminSettings gọi GET /admin/settings", async () => {
      const fetchMock = mockFetch(200, [SETTING]);
      const { data, error } = await listAdminSettings();
      expect(error).toBeNull();
      expect(data).toEqual([SETTING]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/settings");
      expect(init?.method).toBe("GET");
    });

    it("saveSetting gọi PUT /admin/settings/:key với body { value }", async () => {
      const fetchMock = mockFetch(200, SETTING);
      const { data, error } = await saveSetting("homepage_showcase_config", SETTING.value);
      expect(error).toBeNull();
      expect(data).toEqual(SETTING);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/settings/homepage_showcase_config");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({ value: SETTING.value });
    });
  });

  describe("admin stats (T-020)", () => {
    it("getAdminStatsCounts gọi GET /admin/stats/counts", async () => {
      const counts = { total_students: 10, total_courses: 5, total_quiz_attempts: 20 };
      const fetchMock = mockFetch(200, counts);
      const { data, error } = await getAdminStatsCounts();
      expect(error).toBeNull();
      expect(data).toEqual(counts);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/counts");
      expect(init?.method).toBe("GET");
    });

    it("getAdminRecentEnrollments gọi GET /admin/stats/recent-enrollments", async () => {
      const list = [{ id: 1, user_id: "u-1", course_id: 2, enrolled_at: null, expires_at: null, courses: null, profiles: null }];
      const fetchMock = mockFetch(200, list);
      const { data, error } = await getAdminRecentEnrollments();
      expect(error).toBeNull();
      expect(data).toEqual(list);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/recent-enrollments");
      expect(init?.method).toBe("GET");
    });

    it("getAdminRecentResults gọi GET /admin/stats/recent-results", async () => {
      const list = [{ id: 1, user_id: "u-1", quiz_id: 2, score: 9.0, correct_answers: 9, total_questions: 10, completed_at: null, quizzes: null, profiles: null }];
      const fetchMock = mockFetch(200, list);
      const { data, error } = await getAdminRecentResults();
      expect(error).toBeNull();
      expect(data).toEqual(list);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/recent-results");
      expect(init?.method).toBe("GET");
    });

    it("getAdminQuizScores gọi GET /admin/stats/quiz-scores", async () => {
      const scores = { quizzes: [{ id: 1, title: "Q1" }], results: [{ quiz_id: 1, score: 8.5 }] };
      const fetchMock = mockFetch(200, scores);
      const { data, error } = await getAdminQuizScores();
      expect(error).toBeNull();
      expect(data).toEqual(scores);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/quiz-scores");
      expect(init?.method).toBe("GET");
    });

    it("getAdminCourseEnrollments gọi GET /admin/stats/course-enrollments", async () => {
      const enrollments = { courses: [{ id: 1, title: "C1" }], enrollments: [{ course_id: 1 }] };
      const fetchMock = mockFetch(200, enrollments);
      const { data, error } = await getAdminCourseEnrollments();
      expect(error).toBeNull();
      expect(data).toEqual(enrollments);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/course-enrollments");
      expect(init?.method).toBe("GET");
    });

    it("getAdminUserAnswers gọi GET /admin/stats/answers", async () => {
      const answers = [{ question_id: 1, is_correct: true }];
      const fetchMock = mockFetch(200, answers);
      const { data, error } = await getAdminUserAnswers();
      expect(error).toBeNull();
      expect(data).toEqual(answers);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/answers");
      expect(init?.method).toBe("GET");
    });

    it("getAdminQuestionsByIds gọi GET /admin/stats/questions với query ids", async () => {
      const questions = [{ id: 10, question_text: "Text" }];
      const fetchMock = mockFetch(200, questions);
      const { data, error } = await getAdminQuestionsByIds([10, 20]);
      expect(error).toBeNull();
      expect(data).toEqual(questions);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/questions?ids=10,20");
      expect(init?.method).toBe("GET");
    });

    it("getAdminQuestionsByIds gọi không query khi mảng rỗng", async () => {
      const fetchMock = mockFetch(200, []);
      const { data, error } = await getAdminQuestionsByIds([]);
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/questions");
      expect(init?.method).toBe("GET");
    });

    it("getAdminStudents gọi GET /admin/stats/students", async () => {
      const students = {
        profiles: [
          {
            id: "p-1",
            user_id: "u-1",
            full_name: "A",
            avatar_url: null,
            email: "a@b.com",
            is_pro: false,
            pro_plan: null,
            pro_activated_at: null,
            created_at: null,
            updated_at: null,
          },
        ],
        enrollments: [{ user_id: "u-1", expires_at: null }],
      };
      const fetchMock = mockFetch(200, students);
      const { data, error } = await getAdminStudents();
      expect(error).toBeNull();
      expect(data).toEqual(students);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/admin/stats/students");
      expect(init?.method).toBe("GET");
    });
  });
});
