import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addStudentNote,
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
});

