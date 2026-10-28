import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addFavorite,
  addNote,
  createLesson,
  createPractice,
  deleteLesson,
  deletePractice,
  getCurriculum,
  getMyEnrollment,
  listLessonMaterials,
  listLessonPractices,
  listMyFavorites,
  listMyNotes,
  listMyProgress,
  listMyProgressRows,
  listUserEnrollments,
  addUserEnrollment,
  patchLesson,
  removeEnrollment,
  removeFavorite,
  reorderLessons,
  setLessonProgress,
  updateLesson,
  updatePractice,
} from "./learning";
import { ApiError } from "./client";
import { getFriendlyErrorMessage } from "../errorHandler";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
      }),
    ),
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

  describe("listUserEnrollments", () => {
    it("gọi đúng URL learning/admin/users/:userId/enrollments và method GET", async () => {
      const enrollments = [
        {
          id: 1,
          user_id: "user-uuid-1",
          course_id: 2,
          enrolled_at: "2026-01-01T00:00:00.000Z",
          expires_at: "2026-07-01T00:00:00.000Z",
          courses: { title: "TOEIC 450+" },
        },
      ];
      const fetchMock = mockFetch(200, enrollments);

      const { data, error } = await listUserEnrollments("user-uuid-1");

      expect(error).toBeNull();
      expect(data).toEqual(enrollments);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/users/user-uuid-1/enrollments");
      expect(init?.method).toBe("GET");
    });

    it("trả về ApiError khi lỗi 500, không ném ngoại lệ", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listUserEnrollments("user-uuid-1");

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("addUserEnrollment", () => {
    it("gọi POST learning/admin/users/:userId/enrollments với body { course_id, expires_in_days }", async () => {
      const created = {
        id: 10,
        user_id: "user-uuid-1",
        course_id: 3,
        enrolled_at: "2026-10-28T00:00:00.000Z",
        expires_at: "2026-11-27T00:00:00.000Z",
        courses: { title: "TOEIC 650+" },
      };
      const fetchMock = mockFetch(201, created);

      const { data, error } = await addUserEnrollment("user-uuid-1", 3, 30);

      expect(error).toBeNull();
      expect(data).toEqual(created);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/users/user-uuid-1/enrollments");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual({
        course_id: 3,
        expires_in_days: 30,
      });
    });

    it("addUserEnrollment(..., null) gửi \"expires_in_days\": null (không bỏ khóa)", async () => {
      const created = {
        id: 11,
        user_id: "user-uuid-1",
        course_id: 4,
        enrolled_at: "2026-10-28T00:00:00.000Z",
        expires_at: null,
        courses: { title: "TOEIC 800+" },
      };
      const fetchMock = mockFetch(201, created);

      const { data, error } = await addUserEnrollment("user-uuid-1", 4, null);

      expect(error).toBeNull();
      expect(data).toEqual(created);
      const [, init] = fetchMock.mock.calls[0];
      const rawBody = init?.body as string;
      expect(rawBody).toContain('"expires_in_days":null');
      const parsed = JSON.parse(rawBody) as Record<string, unknown>;
      expect(Object.prototype.hasOwnProperty.call(parsed, "expires_in_days")).toBe(true);
      expect(parsed.expires_in_days).toBeNull();
    });

    it("đổi mã lỗi ENROLLMENT_EXISTS sang code = \"23505\" để getFriendlyErrorMessage trả đúng câu trùng lặp", async () => {
      mockFetch(409, {
        statusCode: 409,
        code: "ENROLLMENT_EXISTS",
        message: "Học viên đã được ghi danh vào khóa học này",
      });

      const { data, error } = await addUserEnrollment("user-uuid-1", 3, 30);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(409);
      expect(error?.code).toBe("23505");
      expect(getFriendlyErrorMessage(error)).toBe(
        "Dữ liệu này đã tồn tại trên hệ thống (bị trùng lặp). Vui lòng đổi tên hoặc kiểm tra lại.",
      );
    });

    it("giữ nguyên lỗi khác (vd: 500 INTERNAL_ERROR), không ném ngoại lệ", async () => {
      mockFetch(500, {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Đã có lỗi xảy ra",
      });

      const { data, error } = await addUserEnrollment("user-uuid-1", 3, 30);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
      expect(error?.code).toBe("INTERNAL_ERROR");
    });
  });

  describe("removeEnrollment", () => {
    it("gọi đúng URL learning/admin/enrollments/:id và method DELETE, xử lý 204 No Content", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await removeEnrollment(99);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/enrollments/99");
      expect(init?.method).toBe("DELETE");
    });

    it("trả về ApiError khi lỗi 500, không ném ngoại lệ", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });

      const { data, error } = await removeEnrollment(99);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("admin lessons & practices", () => {
    it("createLesson gọi POST learning/admin/modules/:moduleId/lessons không gửi display_order, module_id, quiz_id", async () => {
      const lesson = {
        id: 100,
        module_id: 10,
        title: "Bài 1",
        video_url: "https://example.com/v.mp4",
        duration_seconds: 600,
        display_order: 0,
        is_live: false,
        live_time: null,
        lesson_type: "video",
        quiz_id: null,
        pdf_url: null,
        is_free: false,
        is_published: true,
      };
      const fetchMock = mockFetch(201, lesson);

      const { data, error } = await createLesson(10, {
        title: "Bài 1",
        lesson_type: "video",
        video_url: "https://example.com/v.mp4",
        pdf_url: null,
        duration_seconds: 600,
      });

      expect(error).toBeNull();
      expect(data).toEqual(lesson);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/modules/10/lessons");
      expect(init?.method).toBe("POST");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed).toEqual({
        title: "Bài 1",
        lesson_type: "video",
        video_url: "https://example.com/v.mp4",
        pdf_url: null,
        duration_seconds: 600,
      });
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.module_id).toBeUndefined();
    });

    it("updateLesson gọi PUT learning/admin/lessons/:id không gửi display_order, module_id", async () => {
      const lesson = {
        id: 100,
        module_id: 10,
        title: "Bài 1 sửa",
        video_url: null,
        duration_seconds: 300,
        display_order: 0,
        is_live: false,
        live_time: null,
        lesson_type: "exam",
        quiz_id: 50,
        pdf_url: null,
        is_free: false,
        is_published: true,
      };
      const fetchMock = mockFetch(200, lesson);

      const { data, error } = await updateLesson(100, {
        title: "Bài 1 sửa",
        lesson_type: "exam",
        video_url: null,
        pdf_url: null,
        duration_seconds: 300,
      });

      expect(error).toBeNull();
      expect(data).toEqual(lesson);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/lessons/100");
      expect(init?.method).toBe("PUT");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.module_id).toBeUndefined();
    });

    it("patchLesson gọi PATCH learning/admin/lessons/:id", async () => {
      const fetchMock = mockFetch(200, { id: 100, is_free: true });

      const { error } = await patchLesson(100, { is_free: true });

      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/lessons/100");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(init?.body as string)).toEqual({ is_free: true });
    });

    it("deleteLesson gọi DELETE learning/admin/lessons/:id", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await deleteLesson(100);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/lessons/100");
      expect(init?.method).toBe("DELETE");
    });

    it("reorderLessons gọi PUT learning/admin/modules/:moduleId/lesson-order với { lesson_ids }", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await reorderLessons(10, [102, 100, 101]);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/modules/10/lesson-order");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({
        lesson_ids: [102, 100, 101],
      });
    });

    it("createPractice gọi POST learning/admin/lessons/:lessonId/practices không gửi display_order, lesson_id", async () => {
      const practice = {
        id: 1,
        lesson_id: 100,
        quiz_id: 50,
        trigger_at_seconds: 120,
        title: "Popup 1",
        display_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        quizzes: { id: 50, title: "Q1", total_questions: 5 },
      };
      const fetchMock = mockFetch(201, practice);

      const { data, error } = await createPractice(100, {
        quiz_id: 50,
        trigger_at_seconds: 120,
        title: "Popup 1",
      });

      expect(error).toBeNull();
      expect(data).toEqual(practice);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/lessons/100/practices");
      expect(init?.method).toBe("POST");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed).toEqual({
        quiz_id: 50,
        trigger_at_seconds: 120,
        title: "Popup 1",
      });
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.lesson_id).toBeUndefined();
    });

    it("updatePractice gọi PUT learning/admin/practices/:id không gửi display_order, lesson_id", async () => {
      const fetchMock = mockFetch(200, { id: 1 });

      const { error } = await updatePractice(1, {
        quiz_id: 50,
        trigger_at_seconds: 180,
        title: "Popup 1 sửa",
      });

      expect(error).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/practices/1");
      expect(init?.method).toBe("PUT");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.lesson_id).toBeUndefined();
    });

    it("deletePractice gọi DELETE learning/admin/practices/:id", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await deletePractice(1);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/learning/admin/practices/1");
      expect(init?.method).toBe("DELETE");
    });

    it("các hàm admin lesson/practice trả về { data: null, error } khi lỗi, không ném ngoại lệ", async () => {
      mockFetch(500, {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Server error",
      });
      expect(
        (
          await createLesson(10, {
            title: "A",
            lesson_type: "video",
            duration_seconds: 60,
          })
        ).error,
      ).toBeInstanceOf(ApiError);
      expect(
        (
          await updateLesson(1, {
            title: "A",
            lesson_type: "video",
            duration_seconds: 60,
          })
        ).error,
      ).toBeInstanceOf(ApiError);
      expect(
        (await patchLesson(1, { is_free: true })).error,
      ).toBeInstanceOf(ApiError);
      expect((await deleteLesson(1)).error).toBeInstanceOf(ApiError);
      expect((await reorderLessons(10, [1])).error).toBeInstanceOf(ApiError);
      expect(
        (
          await createPractice(1, {
            quiz_id: 1,
            trigger_at_seconds: 10,
            title: "P",
          })
        ).error,
      ).toBeInstanceOf(ApiError);
      expect(
        (
          await updatePractice(1, {
            quiz_id: 1,
            trigger_at_seconds: 10,
            title: "P",
          })
        ).error,
      ).toBeInstanceOf(ApiError);
      expect((await deletePractice(1)).error).toBeInstanceOf(ApiError);
    });
  });
});
