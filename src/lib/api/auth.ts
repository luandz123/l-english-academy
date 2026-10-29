/**
 * Thay `supabase.auth` bằng backend NestJS (ADR 0002), giữ cùng chữ ký hàm và
 * cùng shape kết quả `{ data, error }` để component chỉ phải đổi
 * `supabase.auth.X(...)` thành `authClient.X(...)`.
 *
 * - Access token chỉ nằm trong bộ nhớ (không localStorage → XSS không đọc được lâu dài).
 * - Refresh token nằm trong cookie httpOnly; tải lại trang thì gọi /auth/refresh để khôi phục phiên.
 * - Tự làm mới token ~60 giây trước khi hết hạn và phát TOKEN_REFRESHED như Supabase.
 */
import { ApiError, apiClient, configureAuth } from "./client";

export interface AuthUser {
  id: string;
  aud: "authenticated";
  role: "authenticated";
  email: string;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
  last_sign_in_at: string | null;
  app_metadata: { provider: string; providers: string[] };
  // Cùng kiểu UserMetadata của supabase-js; component đọc trực tiếp avatar_url/full_name như chuỗi
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  /** Unix giây */
  expires_at: number;
  user: AuthUser;
}

export type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED";

type Listener = (event: AuthChangeEvent, session: AuthSession | null) => void | Promise<void>;

interface AuthResultBody {
  user: AuthUser;
  session: AuthSession | null;
}

let currentSession: AuthSession | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let inflightRefresh: Promise<AuthSession | null> | null = null;
let initialized: Promise<void> | null = null;
// Tăng mỗi khi phiên đổi do đăng nhập/đăng xuất; kết quả refresh cũ hơn bị bỏ qua
let sessionGeneration = 0;
const listeners = new Set<Listener>();

function emit(event: AuthChangeEvent, session: AuthSession | null): void {
  for (const listener of listeners) {
    // Như Supabase: callback chạy bất đồng bộ, lỗi trong callback không làm hỏng luồng auth
    Promise.resolve()
      .then(() => listener(event, session))
      .catch((err) => console.error("[auth] listener error:", err));
  }
}

function setSession(session: AuthSession | null, event?: AuthChangeEvent): void {
  currentSession = session;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (session) {
    const msUntilRefresh = session.expires_at * 1000 - Date.now() - 60_000;
    refreshTimer = setTimeout(() => void refreshSilently("TOKEN_REFRESHED"), Math.max(msUntilRefresh, 5_000));
  }
  if (event) emit(event, session);
}

/** Một lần refresh cho cả tab dù nhiều request cùng cần (tránh xoay vòng token song song). */
function refreshSilently(event: AuthChangeEvent | null): Promise<AuthSession | null> {
  if (!inflightRefresh) {
    const startedAt = sessionGeneration;
    inflightRefresh = apiClient
      .post<AuthResultBody>("auth/refresh", undefined, { auth: false })
      .then((body) => {
        // Người dùng vừa đăng nhập/đăng xuất trong lúc chờ → giữ phiên mới hơn
        if (startedAt !== sessionGeneration) return currentSession;
        setSession(body.session, event ?? undefined);
        return body.session;
      })
      .catch((err: unknown) => {
        if (startedAt !== sessionGeneration) return currentSession;
        // 401: không có/không còn phiên → đăng xuất cục bộ
        if (err instanceof ApiError && err.status === 401) {
          const hadSession = currentSession !== null;
          setSession(null, hadSession ? "SIGNED_OUT" : undefined);
          return null;
        }
        throw err;
      })
      .finally(() => {
        inflightRefresh = null;
      });
  }
  return inflightRefresh;
}

function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = refreshSilently(null)
      .then(() => undefined)
      .catch((err) => console.warn("[auth] Không khôi phục được phiên:", err));
  }
  return initialized;
}

configureAuth({
  getAccessToken: async () => {
    await ensureInitialized();
    return currentSession?.access_token ?? null;
  },
  refreshAccessToken: async () => (await refreshSilently("TOKEN_REFRESHED")) !== null,
});

function toError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(0, "UNKNOWN", err instanceof Error ? err.message : String(err));
}

export const authClient = {
  async getSession(): Promise<{ data: { session: AuthSession | null }; error: ApiError | null }> {
    try {
      await ensureInitialized();
      if (currentSession && currentSession.expires_at * 1000 - Date.now() < 10_000) {
        await refreshSilently("TOKEN_REFRESHED");
      }
      return { data: { session: currentSession }, error: null };
    } catch (err) {
      return { data: { session: null }, error: toError(err) };
    }
  },

  async getUser(): Promise<{ data: { user: AuthUser | null }; error: ApiError | null }> {
    try {
      await ensureInitialized();
      if (!currentSession) return { data: { user: null }, error: null };
      const body = await apiClient.get<{ user: AuthUser }>("auth/me");
      return { data: { user: body.user }, error: null };
    } catch (err) {
      return { data: { user: null }, error: toError(err) };
    }
  },

  async refreshSession(): Promise<{ data: { session: AuthSession | null; user: AuthUser | null }; error: ApiError | null }> {
    try {
      const session = await refreshSilently("TOKEN_REFRESHED");
      return { data: { session, user: session?.user ?? null }, error: null };
    } catch (err) {
      return { data: { session: null, user: null }, error: toError(err) };
    }
  },

  onAuthStateChange(callback: Listener): { data: { subscription: { unsubscribe: () => void } } } {
    listeners.add(callback);
    // Như Supabase: người đăng ký mới nhận INITIAL_SESSION sau khi khôi phục phiên xong
    void ensureInitialized().then(() => {
      if (listeners.has(callback)) void Promise.resolve(callback("INITIAL_SESSION", currentSession)).catch(() => {});
    });
    return { data: { subscription: { unsubscribe: () => void listeners.delete(callback) } } };
  },

  async signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ data: { user: AuthUser | null; session: AuthSession | null }; error: ApiError | null }> {
    try {
      const body = await apiClient.post<AuthResultBody>("auth/login", credentials, { auth: false });
      sessionGeneration += 1;
      setSession(body.session, "SIGNED_IN");
      return { data: body, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: toError(err) };
    }
  },

  async signUp(params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }): Promise<{ data: { user: AuthUser | null; session: AuthSession | null }; error: ApiError | null }> {
    try {
      const body = await apiClient.post<AuthResultBody>(
        "auth/register",
        {
          email: params.email,
          password: params.password,
          data: params.options?.data,
          redirect_to: params.options?.emailRedirectTo,
        },
        { auth: false },
      );
      if (body.session) {
        sessionGeneration += 1;
        setSession(body.session, "SIGNED_IN");
      }
      return { data: body, error: null };
    } catch (err) {
      return { data: { user: null, session: null }, error: toError(err) };
    }
  },

  async signOut(): Promise<{ error: ApiError | null }> {
    try {
      await apiClient.post<void>("auth/logout", undefined, { auth: false });
      return { error: null };
    } catch (err) {
      return { error: toError(err) };
    } finally {
      // Như Supabase: xóa phiên cục bộ kể cả khi gọi server lỗi
      sessionGeneration += 1;
      setSession(null, "SIGNED_OUT");
    }
  },

  async resetPasswordForEmail(
    email: string,
    options?: { redirectTo?: string },
  ): Promise<{ data: Record<string, never> | null; error: ApiError | null }> {
    try {
      await apiClient.post("auth/recover", { email, redirect_to: options?.redirectTo }, { auth: false });
      return { data: {}, error: null };
    } catch (err) {
      return { data: null, error: toError(err) };
    }
  },

  async updateUser(attributes: {
    password?: string;
    data?: Record<string, unknown>;
  }): Promise<{ data: { user: AuthUser | null }; error: ApiError | null }> {
    try {
      const body = await apiClient.patch<{ user: AuthUser }>("auth/me", attributes);
      if (currentSession) setSession({ ...currentSession, user: body.user }, "USER_UPDATED");
      return { data: { user: body.user }, error: null };
    } catch (err) {
      return { data: { user: null }, error: toError(err) };
    }
  },

  /** Chuyển hẳn trang sang backend → Google; quay về redirectTo với cookie phiên. */
  async signInWithOAuth(params: {
    provider: "google";
    options?: { redirectTo?: string; queryParams?: Record<string, string> };
  }): Promise<{ data: { provider: string; url: string }; error: ApiError | null }> {
    const query = new URLSearchParams({
      ...(params.options?.redirectTo ? { redirect_to: params.options.redirectTo } : {}),
      ...(params.options?.queryParams?.prompt ? { prompt: params.options.queryParams.prompt } : {}),
    });
    const base = (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/+$/, "");
    const url = `${base}/auth/${params.provider}?${query.toString()}`;
    window.location.assign(url);
    return { data: { provider: params.provider, url }, error: null };
  },

  /**
   * Luồng PKCE của Supabase (?code=...) không còn: backend đã đặt cookie trước khi
   * chuyển về /auth/callback. Giữ hàm để AuthCallback không phải đổi logic.
   */
  async exchangeCodeForSession(_url: string): Promise<{ data: { session: AuthSession | null }; error: ApiError | null }> {
    return authClient.getSession();
  },
};

/** Admin tạo học viên (thay client Supabase tạm ở AdminStudents.tsx:38). */
export async function adminCreateStudent(params: {
  email: string;
  password: string;
  options?: { data?: Record<string, unknown> };
}): Promise<{ data: { user: AuthUser | null }; error: ApiError | null }> {
  try {
    const body = await apiClient.post<{ user: AuthUser }>("auth/admin/users", {
      email: params.email,
      password: params.password,
      data: params.options?.data,
    });
    return { data: body, error: null };
  } catch (err) {
    return { data: { user: null }, error: toError(err) };
  }
}

/** Vai trò admin của người dùng hiện tại — thay `user_roles ... eq('role','admin').maybeSingle()`. */
export async function getMyAdminRole(): Promise<{ data: { role: "admin" } | null; error: ApiError | null }> {
  try {
    const body = await apiClient.get<{ roles: string[] }>("auth/me/roles");
    return { data: body.roles.includes("admin") ? { role: "admin" } : null, error: null };
  } catch (err) {
    return { data: null, error: toError(err) };
  }
}

export interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_pro: boolean | null;
  pro_plan: string | null;
  pro_activated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Hồ sơ của chính mình — thay `profiles ... eq('user_id', uid).maybeSingle()` (404 → null). */
export async function getMyProfile(): Promise<{ data: ProfileRow | null; error: ApiError | null }> {
  try {
    return { data: await apiClient.get<ProfileRow>("profiles/me"), error: null };
  } catch (err) {
    if (err instanceof ApiError && err.code === "PROFILE_NOT_FOUND") return { data: null, error: null };
    return { data: null, error: toError(err) };
  }
}

/** Sửa tên/ảnh đại diện — thay `profiles.update(...)` / `upsert(...)` theo user_id của mình. */
export async function updateMyProfile(patch: {
  full_name?: string;
  avatar_url?: string | null;
}): Promise<{ data: ProfileRow | null; error: ApiError | null }> {
  try {
    return { data: await apiClient.patch<ProfileRow>("profiles/me", patch), error: null };
  } catch (err) {
    return { data: null, error: toError(err) };
  }
}

/** Admin lấy hồ sơ học viên theo user_id (ADM-003) — trả về { profile } bóc ra profile. */
export async function getStudentProfile(
  userId: string,
): Promise<{ data: ProfileRow | null; error: ApiError | null }> {
  try {
    const res = await apiClient.get<{ profile: ProfileRow | null }>(
      `auth/admin/users/${userId}/profile`,
    );
    return { data: res.profile ?? null, error: null };
  } catch (err) {
    return { data: null, error: toError(err) };
  }
}

/** Chỉ dùng trong test: đưa module về trạng thái ban đầu. */
export function __resetAuthForTests(): void {
  setSession(null);
  listeners.clear();
  initialized = null;
  inflightRefresh = null;
}
