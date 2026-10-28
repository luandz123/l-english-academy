import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavorite,
  addNote,
  getCurriculum,
  getMyEnrollment,
  listLessonMaterials,
  listLessonPractices,
  listMyFavorites,
  listMyNotes,
  listMyProgress,
  listMyProgressRows,
  removeFavorite,
  setLessonProgress,
} from "./learning";
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

describe("learning adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getCurriculum", () => {
    it("gọi đúng URL và method GET", async () => {
      const mockModules = [
        {
          id: 1,
          course_id: 5,
          title: "Chương 1",
          description: null,
          display_order: 1,
          is_free: false,
          is_published: true,
          lessons: [
            {
              id: 10,
              module_id: 1,
              title: "Bài 1",
              video_url: "https://video.mp4",
              duration_seconds: 300,
              display_order: 1,
              is_live: false,
              live_time: null,
              lesson_type: "video",
              quiz_id: null,
              pdf_url: null,
              is_free: false,
              is_published: true,
            },
          ],
        },
      ];
      const fetchMock = mockFetch(200, mockModules);

      const { data, error } = await getCurriculum(5);

      expect(error).toBeNull();
      expect(data).toEqual(mockModules);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/courses/5/curriculum");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi 500", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await getCurriculum(5);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("getMyEnrollment", () => {
    it("bóc đúng .enrollment khi có bản ghi ghi danh", async () => {
      const enrollmentObj = {
        id: 7,
        user_id: "user-uuid-123",
        course_id: 3,
        enrolled_at: "2026-01-01T00:00:00.000Z",
        expires_at: null,
      };
      const fetchMock = mockFetch(200, { enrollment: enrollmentObj });

      const { data, error } = await getMyEnrollment(3);

      expect(error).toBeNull();
      expect(data).toEqual(enrollmentObj);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/courses/3/enrollment");
      expect(init?.method).toBe("GET");
    });

    it("bóc đúng null khi .enrollment là null", async () => {
      mockFetch(200, { enrollment: null });

      const { data, error } = await getMyEnrollment(3);

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it("trả về ApiError khi 401 Unauthorized, không ném ngoại lệ", async () => {
      mockFetch(401, { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" });

      const { data, error } = await getMyEnrollment(3);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(401);
    });

    it("trả về ApiError khi lỗi 500", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });

      const { data, error } = await getMyEnrollment(3);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("listLessonMaterials", () => {
    it("gọi đúng URL và method GET", async () => {
      const materials = [
        {
          id: 1,
          lesson_id: 12,
          quiz_id: null,
          course_id: 3,
          title: "Tài liệu 1.pdf",
          file_url: "https://example.com/doc.pdf",
          file_type: "pdf",
          display_order: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          folder_path: "/",
        },
      ];
      const fetchMock = mockFetch(200, materials);

      const { data, error } = await listLessonMaterials(12);

      expect(error).toBeNull();
      expect(data).toEqual(materials);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/12/materials");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi 500", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listLessonMaterials(12);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("listMyProgress", () => {
    it("gọi đúng URL và method GET", async () => {
      const progress = [
        {
          id: 1,
          user_id: "user-1",
          lesson_id: 10,
          is_completed: true,
          last_watched_at: "2026-01-01T00:00:00.000Z",
          watch_duration_seconds: 120,
        },
      ];
      const fetchMock = mockFetch(200, progress);

      const { data, error } = await listMyProgress();

      expect(error).toBeNull();
      expect(data).toEqual(progress);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/progress");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi 401 hoặc 500", async () => {
      mockFetch(401, { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" });
      const { data, error } = await listMyProgress();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(401);
    });
  });

  describe("listMyProgressRows", () => {
    it("gọi GET learning/progress, gán created_at = completed_at = last_watched_at (kể cả null), updated_at = null, giữ các trường gốc và giữ nguyên thứ tự", async () => {
      const progress = [
        {
          id: 2,
          user_id: "user-1",
          lesson_id: 20,
          is_completed: true,
          last_watched_at: "2026-10-28T08:00:00.000Z",
          watch_duration_seconds: 180,
        },
        {
          id: 1,
          user_id: "user-1",
          lesson_id: 10,
          is_completed: false,
          last_watched_at: null,
          watch_duration_seconds: null,
        },
      ];
      const fetchMock = mockFetch(200, progress);

      const { data, error } = await listMyProgressRows();

      expect(error).toBeNull();
      expect(data).toEqual([
        {
          id: 2,
          user_id: "user-1",
          lesson_id: 20,
          is_completed: true,
          last_watched_at: "2026-10-28T08:00:00.000Z",
          watch_duration_seconds: 180,
          created_at: "2026-10-28T08:00:00.000Z",
          completed_at: "2026-10-28T08:00:00.000Z",
          updated_at: null,
        },
        {
          id: 1,
          user_id: "user-1",
          lesson_id: 10,
          is_completed: false,
          last_watched_at: null,
          watch_duration_seconds: null,
          created_at: null,
          completed_at: null,
          updated_at: null,
        },
      ]);
      expect(Object.keys(data![0])).toEqual(
        expect.arrayContaining(["created_at", "completed_at", "updated_at"]),
      );
      expect(Object.keys(data![1])).toEqual(
        expect.arrayContaining(["created_at", "completed_at", "updated_at"]),
      );
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/progress");
      expect(init?.method).toBe("GET");
    });

    it("trả về { data: null, error } khi lỗi 401 hoặc 500, không ném ngoại lệ", async () => {
      mockFetch(401, { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" });
      const res401 = await listMyProgressRows();
      expect(res401.data).toBeNull();
      expect(res401.error).toBeInstanceOf(ApiError);
      expect(res401.error?.status).toBe(401);

      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const res500 = await listMyProgressRows();
      expect(res500.data).toBeNull();
      expect(res500.error).toBeInstanceOf(ApiError);
      expect(res500.error?.status).toBe(500);
    });
  });

  describe("setLessonProgress", () => {
    it("gọi đúng URL, method PUT và body { is_completed }", async () => {
      const updated = {
        id: 1,
        user_id: "user-1",
        lesson_id: 15,
        is_completed: true,
        last_watched_at: null,
        watch_duration_seconds: null,
      };
      const fetchMock = mockFetch(200, updated);

      const { data, error } = await setLessonProgress(15, true);

      expect(error).toBeNull();
      expect(data).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/15/progress");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({ is_completed: true });
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await setLessonProgress(15, false);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("listMyFavorites", () => {
    it("gọi đúng URL và method GET", async () => {
      const favorites = [
        {
          id: 1,
          user_id: "user-1",
          lesson_id: 20,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      const fetchMock = mockFetch(200, favorites);

      const { data, error } = await listMyFavorites();

      expect(error).toBeNull();
      expect(data).toEqual(favorites);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/favorites");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listMyFavorites();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("addFavorite", () => {
    it("gọi đúng URL và method PUT", async () => {
      const favorite = {
        id: 2,
        user_id: "user-1",
        lesson_id: 25,
        created_at: "2026-01-01T00:00:00.000Z",
      };
      const fetchMock = mockFetch(200, favorite);

      const { data, error } = await addFavorite(25);

      expect(error).toBeNull();
      expect(data).toEqual(favorite);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/25/favorite");
      expect(init?.method).toBe("PUT");
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await addFavorite(25);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("removeFavorite", () => {
    it("gọi đúng URL, method DELETE và xử lý 204 No Content", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await removeFavorite(30);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/30/favorite");
      expect(init?.method).toBe("DELETE");
    });

    it("trả về ApiError khi lỗi 500", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await removeFavorite(30);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("listMyNotes", () => {
    it("gọi đúng URL và method GET", async () => {
      const notes = [
        {
          id: 1,
          user_id: "user-1",
          lesson_id: 40,
          content: "Lưu ý câu hỏi 3",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ];
      const fetchMock = mockFetch(200, notes);

      const { data, error } = await listMyNotes(40);

      expect(error).toBeNull();
      expect(data).toEqual(notes);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/40/notes");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listMyNotes(40);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("addNote", () => {
    it("gọi đúng URL, method POST và body { content }", async () => {
      const note = {
        id: 5,
        user_id: "user-1",
        lesson_id: 45,
        content: "Ghi chú ngữ pháp",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      const fetchMock = mockFetch(201, note);

      const { data, error } = await addNote(45, "Ghi chú ngữ pháp");

      expect(error).toBeNull();
      expect(data).toEqual(note);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/45/notes");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({ content: "Ghi chú ngữ pháp" });
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(400, { statusCode: 400, code: "VALIDATION_FAILED", message: "Content cannot be empty" });
      const { data, error } = await addNote(45, "   ");

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(400);
    });
  });

  describe("listLessonPractices", () => {
    it("gọi đúng URL và method GET", async () => {
      const practices = [
        {
          id: 1,
          lesson_id: 50,
          quiz_id: 100,
          trigger_at_seconds: 180,
          title: "Mini Quiz 1",
          display_order: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          quizzes: {
            id: 100,
            title: "Quiz 1",
            total_questions: 5,
          },
        },
      ];
      const fetchMock = mockFetch(200, practices);

      const { data, error } = await listLessonPractices(50);

      expect(error).toBeNull();
      expect(data).toEqual(practices);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/lessons/50/practices");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listLessonPractices(50);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });
});
