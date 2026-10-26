import { afterEach, describe, expect, it, vi } from "vitest";
import {
  countCourses,
  getCourse,
  listCategories,
  listCourses,
} from "./catalog";
import { ApiError } from "./client";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
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
});
