import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countCourses,
  createCategory,
  createCourse,
  createModule,
  deleteCategory,
  deleteCourse,
  deleteModule,
  getAdminCourseModules,
  getCourse,
  importCourseJson,
  listAdminCategories,
  listAdminCourses,
  listCategories,
  listCourses,
  patchCourse,
  patchModule,
  reorderModules,
  setFreeModule,
  updateCategory,
  updateCourse,
  updateModule,
} from "./catalog";
import { ApiError } from "./client";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockImplementation(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("catalog adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listCategories", () => {
    it("gọi đúng URL và query khi truyền active: true", async () => {
      const fetchMock = mockFetch(200, [
        {
          id: 1,
          name: "TOEIC Căn Bản",
          slug: "toeic-can-ban",
          icon: null,
          display_order: 1,
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);

      const { data, error } = await listCategories({ active: true });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].slug).toBe("toeic-can-ban");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/categories?active=true");
    });

    it("gọi không có query khi không truyền params", async () => {
      const fetchMock = mockFetch(200, []);
      const { data, error } = await listCategories();

      expect(error).toBeNull();
      expect(data).toEqual([]);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/categories");
    });

    it("trả về ApiError khi có lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listCategories();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("listCourses", () => {
    it("gọi đúng URL với active và courseType", async () => {
      const fetchMock = mockFetch(200, [
        {
          id: 10,
          title: "Dictation 1",
          subtitle: null,
          description: null,
          course_type: "listening",
          category_id: 1,
          price: 0,
          duration_months: 6,
          thumbnail_url: null,
          instructor: null,
          is_active: true,
          is_free: true,
          display_order: 0,
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);

      const { data, error } = await listCourses({
        active: true,
        courseType: "listening",
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].course_type).toBe("listening");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/courses?active=true&courseType=listening");
    });

    it("trả về ApiError khi máy chủ lỗi", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });
      const { data, error } = await listCourses();

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe("countCourses", () => {
    it("gọi đúng URL và trả về { count, error: null }", async () => {
      const fetchMock = mockFetch(200, { count: 42 });

      const { count, error } = await countCourses({ active: true });

      expect(error).toBeNull();
      expect(count).toBe(42);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/courses/count?active=true");
    });

    it("trả về { count: null, error: ApiError } khi lỗi 500", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Server error" });

      const { count, error } = await countCourses();

      expect(count).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("getCourse", () => {
    it("gọi đúng URL và trả về { data, error: null } khi thành công", async () => {
      const fetchMock = mockFetch(200, {
        id: 7,
        title: "Khóa 7",
        subtitle: null,
        description: null,
        course_type: "fulltest",
        category_id: null,
        price: 0,
        duration_months: 1,
        thumbnail_url: null,
        instructor: null,
        is_active: true,
        is_free: true,
        display_order: 0,
        created_at: null,
      });

      const { data, error } = await getCourse(7);

      expect(error).toBeNull();
      expect(data?.id).toBe(7);
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/courses/7");
    });

    it("map 404 COURSE_NOT_FOUND thành { data: null, error: null } (hành vi maybeSingle)", async () => {
      mockFetch(404, {
        statusCode: 404,
        code: "COURSE_NOT_FOUND",
        message: "Khóa học không tồn tại",
      });

      const { data, error } = await getCourse(999999);

      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    it("trả về { data: null, error: ApiError } khi 404 với code khác (ví dụ NOT_FOUND do sai route)", async () => {
      mockFetch(404, {
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Cannot GET /api/v1/catalog/courses/999",
      });

      const { data, error } = await getCourse(999);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(404);
      expect(error?.code).toBe("NOT_FOUND");
    });

    it("trả về { data: null, error: ApiError } khi gặp lỗi khác 404 (ví dụ 500)", async () => {
      mockFetch(500, {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "DB connection failed",
      });

      const { data, error } = await getCourse(7);

      expect(data).toBeNull();
      expect(error).toBeInstanceOf(ApiError);
      expect(error?.status).toBe(500);
    });
  });

  describe("admin modules", () => {
    it("getAdminCourseModules gọi GET catalog/admin/courses/:id/modules và trả về modules kèm lessons, quizzes", async () => {
      const modules = [
        {
          id: 1,
          course_id: 5,
          title: "Part 1",
          description: null,
          display_order: 0,
          is_free: true,
          is_published: true,
          lessons: [],
          quizzes: [],
        },
      ];
      const fetchMock = mockFetch(200, modules);

      const { data, error } = await getAdminCourseModules(5);

      expect(error).toBeNull();
      expect(data).toEqual(modules);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/5/modules");
      expect(init?.method).toBe("GET");
    });

    it("createModule gọi POST catalog/admin/courses/:id/modules không gửi display_order, course_id", async () => {
      const created = {
        id: 2,
        course_id: 5,
        title: "Part 2",
        description: "Mô tả",
        display_order: 1,
        is_free: false,
        is_published: true,
      };
      const fetchMock = mockFetch(201, created);

      const { data, error } = await createModule(5, {
        title: "Part 2",
        description: "Mô tả",
        is_free: false,
      });

      expect(error).toBeNull();
      expect(data).toEqual(created);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/5/modules");
      expect(init?.method).toBe("POST");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed).toEqual({
        title: "Part 2",
        description: "Mô tả",
        is_free: false,
      });
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.course_id).toBeUndefined();
    });

    it("updateModule gọi PUT catalog/admin/modules/:id không gửi display_order, course_id", async () => {
      const updated = {
        id: 2,
        course_id: 5,
        title: "Part 2 Updated",
        description: null,
        display_order: 1,
        is_free: true,
        is_published: true,
      };
      const fetchMock = mockFetch(200, updated);

      const { data, error } = await updateModule(2, {
        title: "Part 2 Updated",
        description: null,
        is_free: true,
      });

      expect(error).toBeNull();
      expect(data).toEqual(updated);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/modules/2");
      expect(init?.method).toBe("PUT");
      const parsed = JSON.parse(init?.body as string);
      expect(parsed).toEqual({
        title: "Part 2 Updated",
        description: null,
        is_free: true,
      });
      expect(parsed.display_order).toBeUndefined();
      expect(parsed.course_id).toBeUndefined();
    });

    it("patchModule gọi PATCH catalog/admin/modules/:id", async () => {
      const patched = {
        id: 2,
        course_id: 5,
        title: "Part 2",
        description: null,
        display_order: 1,
        is_free: true,
        is_published: false,
      };
      const fetchMock = mockFetch(200, patched);

      const { data, error } = await patchModule(2, { is_published: false });

      expect(error).toBeNull();
      expect(data).toEqual(patched);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/modules/2");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(init?.body as string)).toEqual({ is_published: false });
    });

    it("deleteModule gọi DELETE catalog/admin/modules/:id", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await deleteModule(2);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/modules/2");
      expect(init?.method).toBe("DELETE");
    });

    it("reorderModules gọi PUT catalog/admin/courses/:id/module-order với { module_ids }", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await reorderModules(5, [3, 1, 2]);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/5/module-order");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({
        module_ids: [3, 1, 2],
      });
    });

    it("setFreeModule gọi PUT catalog/admin/courses/:id/free-module với { module_id }", async () => {
      const fetchMock = mockFetch(204);

      const { data, error } = await setFreeModule(5, 1);

      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/5/free-module");
      expect(init?.method).toBe("PUT");
      expect(JSON.parse(init?.body as string)).toEqual({ module_id: 1 });
    });

    it("các hàm admin module trả về { data: null, error } khi lỗi, không ném ngoại lệ", async () => {
      mockFetch(500, {
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Server error",
      });
      expect((await getAdminCourseModules(5)).error).toBeInstanceOf(ApiError);
      expect(
        (await createModule(5, { title: "A" })).error,
      ).toBeInstanceOf(ApiError);
      expect(
        (await updateModule(1, { title: "A" })).error,
      ).toBeInstanceOf(ApiError);
      expect(
        (await patchModule(1, { is_free: true })).error,
      ).toBeInstanceOf(ApiError);
      expect((await deleteModule(1)).error).toBeInstanceOf(ApiError);
      expect((await reorderModules(5, [1])).error).toBeInstanceOf(ApiError);
      expect((await setFreeModule(5, 1)).error).toBeInstanceOf(ApiError);
    });
  });

  describe("admin courses and categories adapter", () => {
    it("listAdminCourses gọi GET /catalog/admin/courses", async () => {
      const fetchMock = mockFetch(200, [{ id: 1, title: "Course 1" }]);
      const { data, error } = await listAdminCourses();
      expect(error).toBeNull();
      expect(data).toEqual([{ id: 1, title: "Course 1" }]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses");
      expect(init?.method).toBe("GET");
    });

    it("createCourse gọi POST /catalog/admin/courses", async () => {
      const payload = {
        title: "New Course",
        course_type: "video_quiz",
        price: 200000,
        is_free: false,
        is_active: true,
        display_order: 1,
      };
      const fetchMock = mockFetch(201, { id: 2, ...payload });
      const { data, error } = await createCourse(payload);
      expect(error).toBeNull();
      expect(data?.id).toBe(2);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(init?.body as string)).toEqual(payload);
    });

    it("updateCourse gọi PUT /catalog/admin/courses/:id", async () => {
      const payload = {
        title: "Updated Course",
        course_type: "video_quiz",
        price: 0,
        is_free: true,
        is_active: true,
        display_order: 1,
      };
      const fetchMock = mockFetch(200, { id: 2, ...payload });
      const { data, error } = await updateCourse(2, payload);
      expect(error).toBeNull();
      expect(data?.title).toBe("Updated Course");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/2");
      expect(init?.method).toBe("PUT");
    });

    it("patchCourse gọi PATCH /catalog/admin/courses/:id", async () => {
      const fetchMock = mockFetch(200, { id: 2, is_active: false });
      const { data, error } = await patchCourse(2, { is_active: false });
      expect(error).toBeNull();
      expect(data?.is_active).toBe(false);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/2");
      expect(init?.method).toBe("PATCH");
    });

    it("deleteCourse gọi DELETE /catalog/admin/courses/:id", async () => {
      const fetchMock = mockFetch(204);
      const { data, error } = await deleteCourse(2);
      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/2");
      expect(init?.method).toBe("DELETE");
    });

    it("listAdminCategories gọi GET /catalog/admin/categories", async () => {
      const fetchMock = mockFetch(200, [{ id: 1, name: "Category 1" }]);
      const { data, error } = await listAdminCategories();
      expect(error).toBeNull();
      expect(data).toEqual([{ id: 1, name: "Category 1" }]);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/categories");
      expect(init?.method).toBe("GET");
    });

    it("createCategory gọi POST /catalog/admin/categories", async () => {
      const payload = {
        name: "Cat New",
        slug: "cat-new",
        icon: "BookOpen",
        display_order: 1,
        is_active: true,
      };
      const fetchMock = mockFetch(201, { id: 1, ...payload });
      const { data, error } = await createCategory(payload);
      expect(error).toBeNull();
      expect(data?.id).toBe(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/categories");
      expect(init?.method).toBe("POST");
    });

    it("updateCategory gọi PUT /catalog/admin/categories/:id", async () => {
      const payload = {
        name: "Cat Edit",
        slug: "cat-edit",
        icon: "BookOpen",
        display_order: 1,
        is_active: true,
      };
      const fetchMock = mockFetch(200, { id: 1, ...payload });
      const { data, error } = await updateCategory(1, payload);
      expect(error).toBeNull();
      expect(data?.name).toBe("Cat Edit");
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/categories/1");
      expect(init?.method).toBe("PUT");
    });

    it("deleteCategory gọi DELETE /catalog/admin/categories/:id", async () => {
      const fetchMock = mockFetch(204);
      const { data, error } = await deleteCategory(1);
      expect(error).toBeNull();
      expect(data).toBeNull();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/categories/1");
      expect(init?.method).toBe("DELETE");
    });

    it("importCourseJson gọi POST /catalog/admin/courses/:courseId/import-json", async () => {
      const payload = {
        course_title: "Part 1",
        exams: [{ exam_title: "Test 1", questions: [] }],
      };
      const fetchMock = mockFetch(201, {
        module_id: 10,
        exams_count: 1,
        total_questions: 0,
      });
      const { data, error } = await importCourseJson(5, payload);
      expect(error).toBeNull();
      expect(data?.module_id).toBe(10);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/v1/catalog/admin/courses/5/import-json");
      expect(init?.method).toBe("POST");
    });

    it("lỗi HTTP trả { data: null, error } và không ném", async () => {
      mockFetch(500, { statusCode: 500, code: "INTERNAL_ERROR", message: "Error" });
      expect((await listAdminCourses()).error).toBeInstanceOf(ApiError);
      expect((await createCourse({
        title: "T",
        course_type: "video_quiz",
        price: 0,
        is_free: true,
        is_active: true,
        display_order: 1,
      })).error).toBeInstanceOf(ApiError);
      expect((await updateCourse(1, {
        title: "T",
        course_type: "video_quiz",
        price: 0,
        is_free: true,
        is_active: true,
        display_order: 1,
      })).error).toBeInstanceOf(ApiError);
      expect((await patchCourse(1, { is_active: true })).error).toBeInstanceOf(ApiError);
      expect((await deleteCourse(1)).error).toBeInstanceOf(ApiError);
      expect((await listAdminCategories()).error).toBeInstanceOf(ApiError);
      expect((await createCategory({
        name: "C",
        slug: "c",
        icon: "BookOpen",
        display_order: 1,
        is_active: true,
      })).error).toBeInstanceOf(ApiError);
      expect((await updateCategory(1, {
        name: "C",
        slug: "c",
        icon: "BookOpen",
        display_order: 1,
        is_active: true,
      })).error).toBeInstanceOf(ApiError);
      expect((await deleteCategory(1)).error).toBeInstanceOf(ApiError);
    });
  });
});
