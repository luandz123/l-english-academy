import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetAuthForTests, authClient, getMyAdminRole, getMyProfile, getStudentProfile } from "./auth";
import { apiClient } from "./client";

const user = {
  id: "u1",
  aud: "authenticated",
  role: "authenticated",
  email: "a@x.com",
  email_confirmed_at: null,
  confirmed_at: null,
  last_sign_in_at: null,
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "A" },
  created_at: "",
  updated_at: "",
};
const session = (token: string) => ({
  access_token: token,
  token_type: "bearer",
  expires_in: 900,
  expires_at: Math.floor(Date.now() / 1000) + 900,
  user,
});

type Route = (init: RequestInit) => { status: number; body?: unknown };

function mockServer(routes: Record<string, Route>) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      const key = `${init.method} ${url.split("?")[0]}`;
      const route = routes[key];
      if (!route) throw new Error(`Không mock: ${key}`);
      const { status, body } = route(init);
      return new Response(body === undefined ? null : JSON.stringify(body), { status });
    }),
  );
  return calls;
}

const authHeader = (init: RequestInit) => (init.headers as Record<string, string>).Authorization;

describe("authClient", () => {
  beforeEach(() => __resetAuthForTests());
  afterEach(() => vi.unstubAllGlobals());

  it("khôi phục phiên từ cookie khi tải trang và phát INITIAL_SESSION", async () => {
    mockServer({ "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }) });
    const events: string[] = [];
    authClient.onAuthStateChange((event, s) => void events.push(`${event}:${s?.access_token ?? "null"}`));

    const { data, error } = await authClient.getSession();
    expect(error).toBeNull();
    expect(data.session?.access_token).toBe("t1");
    await vi.waitFor(() => expect(events).toContain("INITIAL_SESSION:t1"));
  });

  it("không có cookie → session null, không báo lỗi (như Supabase)", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 401, body: { code: "refresh_token_not_found", message: "x" } }),
    });
    const { data, error } = await authClient.getSession();
    expect(data.session).toBeNull();
    expect(error).toBeNull();
  });

  it("đăng nhập: phát SIGNED_IN và các request sau gắn Bearer token", async () => {
    const calls = mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 401, body: { code: "refresh_token_not_found" } }),
      "POST /api/v1/auth/login": () => ({ status: 200, body: { user, session: session("t-login") } }),
      "GET /api/v1/courses": () => ({ status: 200, body: [] }),
    });
    const events: string[] = [];
    authClient.onAuthStateChange((e) => void events.push(e));

    const { data, error } = await authClient.signInWithPassword({ email: "a@x.com", password: "p" });
    expect(error).toBeNull();
    expect(data.user?.email).toBe("a@x.com");
    await vi.waitFor(() => expect(events).toContain("SIGNED_IN"));

    await apiClient.get("courses");
    expect(authHeader(calls.at(-1)!.init)).toBe("Bearer t-login");
    // Không gửi token lên chính route đăng nhập
    expect(authHeader(calls.find((c) => c.url.endsWith("/auth/login"))!.init)).toBeUndefined();
  });

  it("đăng nhập sai trả error có message Supabase để getFriendlyErrorMessage dịch", async () => {
    mockServer({
      "POST /api/v1/auth/login": () => ({
        status: 400,
        body: { code: "invalid_credentials", message: "Invalid login credentials" },
      }),
    });
    const { data, error } = await authClient.signInWithPassword({ email: "a@x.com", password: "sai" });
    expect(data).toEqual({ user: null, session: null });
    expect(error?.message).toBe("Invalid login credentials");
  });

  it("access token hết hạn giữa chừng → tự refresh một lần rồi gửi lại", async () => {
    let refreshCount = 0;
    const calls = mockServer({
      "POST /api/v1/auth/refresh": () => {
        refreshCount += 1;
        return { status: 200, body: { user, session: session(`t${refreshCount}`) } };
      },
      "GET /api/v1/profiles/me": (init) =>
        authHeader(init) === "Bearer t1"
          ? { status: 401, body: { code: "bad_jwt", message: "JWT expired" } }
          : { status: 200, body: { id: "p1", user_id: "u1", full_name: "A" } },
    });

    const { data, error } = await getMyProfile();
    expect(error).toBeNull();
    expect(data?.full_name).toBe("A");
    expect(refreshCount).toBe(2);
    expect(calls.filter((c) => c.url.endsWith("/profiles/me"))).toHaveLength(2);
  });

  it("nhiều request cùng lúc chỉ gọi refresh một lần khi khởi tạo", async () => {
    let refreshCount = 0;
    mockServer({
      "POST /api/v1/auth/refresh": () => {
        refreshCount += 1;
        return { status: 200, body: { user, session: session("t1") } };
      },
      "GET /api/v1/x": () => ({ status: 200, body: {} }),
    });
    await Promise.all([apiClient.get("x"), apiClient.get("x"), authClient.getSession()]);
    expect(refreshCount).toBe(1);
  });

  it("đăng xuất: xóa phiên cục bộ và phát SIGNED_OUT kể cả khi server lỗi", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "POST /api/v1/auth/logout": () => ({ status: 500, body: { code: "INTERNAL_ERROR", message: "x" } }),
    });
    await authClient.getSession();
    const events: string[] = [];
    authClient.onAuthStateChange((e) => void events.push(e));

    await authClient.signOut();
    await vi.waitFor(() => expect(events).toContain("SIGNED_OUT"));
    mockServer({ "POST /api/v1/auth/refresh": () => ({ status: 401, body: {} }) });
    __resetAuthForTests();
    expect((await authClient.getSession()).data.session).toBeNull();
  });

  it("getMyProfile: chưa có hàng profile → data null, error null (như maybeSingle)", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "GET /api/v1/profiles/me": () => ({ status: 404, body: { code: "PROFILE_NOT_FOUND", message: "x" } }),
    });
    expect(await getMyProfile()).toEqual({ data: null, error: null });
  });

  it("getMyAdminRole trả { role: 'admin' } hoặc null như truy vấn user_roles cũ", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "GET /api/v1/auth/me/roles": () => ({ status: 200, body: { roles: ["student", "admin"] } }),
    });
    expect(await getMyAdminRole()).toEqual({ data: { role: "admin" }, error: null });
  });

  it("getStudentProfile: gọi GET /api/v1/auth/admin/users/:userId/profile, bóc .profile", async () => {
    const profileData = {
      id: "prof-1",
      user_id: "user-1",
      full_name: "Nguyen Van A",
      avatar_url: null,
      email: "a@x.com",
      is_pro: true,
      pro_plan: "pro",
      pro_activated_at: null,
      created_at: null,
      updated_at: null,
    };
    const calls = mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "GET /api/v1/auth/admin/users/user-1/profile": () => ({
        status: 200,
        body: { profile: profileData },
      }),
    });

    const { data, error } = await getStudentProfile("user-1");
    expect(error).toBeNull();
    expect(data).toEqual(profileData);
    expect(calls.some((c) => c.url.endsWith("/auth/admin/users/user-1/profile"))).toBe(true);
  });

  it("getStudentProfile: server trả { profile: null } → data null, error null", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "GET /api/v1/auth/admin/users/user-2/profile": () => ({
        status: 200,
        body: { profile: null },
      }),
    });

    const { data, error } = await getStudentProfile("user-2");
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("getStudentProfile: lỗi 500 → data null, error ApiError, không ném ngoại lệ", async () => {
    mockServer({
      "POST /api/v1/auth/refresh": () => ({ status: 200, body: { user, session: session("t1") } }),
      "GET /api/v1/auth/admin/users/user-3/profile": () => ({
        status: 500,
        body: { code: "INTERNAL_ERROR", message: "Server error" },
      }),
    });

    const { data, error } = await getStudentProfile("user-3");
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });
});
