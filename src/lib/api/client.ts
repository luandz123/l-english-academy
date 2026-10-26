/**
 * HTTP client duy nhất của frontend để gọi backend NestJS.
 * Component không gọi fetch trực tiếp — mỗi module có file src/lib/api/<module>.ts
 * dùng client này và trả về đúng shape dữ liệu cũ của Supabase.
 *
 * Base URL: VITE_API_URL, mặc định "/api/v1" (Vercel rewrite /api → backend,
 * nên cookie refresh token là cookie bên thứ nhất — DECISIONS D-12).
 */

const BASE_URL = (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/+$/, "");

/** Lỗi từ backend. `message` và `code` được getFriendlyErrorMessage đọc như lỗi Supabase cũ. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** false: không gắn access token, không tự refresh (dùng cho chính các route auth). */
  auth?: boolean;
}

/** Do src/lib/api/auth.ts đăng ký, để client không phụ thuộc vòng vào auth. */
interface AuthHooks {
  getAccessToken: () => Promise<string | null>;
  /** Gọi khi access token hết hạn; true nếu đã lấy được token mới. */
  refreshAccessToken: () => Promise<boolean>;
}

let authHooks: AuthHooks | null = null;

export function configureAuth(hooks: AuthHooks): void {
  authHooks = hooks;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${BASE_URL}/${path.replace(/^\/+/, "")}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (v !== undefined && v !== null) params.append(key, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const { query, body, headers, signal, auth = true } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const token = auth && authHooks ? await authHooks.getAccessToken() : null;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    // getFriendlyErrorMessage nhận diện "failed to fetch" là lỗi mạng
    throw new ApiError(0, "NETWORK_ERROR", "Failed to fetch");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const p = (payload ?? {}) as { code?: string; message?: string; details?: unknown };
    const error = new ApiError(res.status, p.code ?? String(res.status), p.message ?? res.statusText, p.details);

    // Access token hết hạn giữa chừng → làm mới một lần rồi gửi lại
    if (res.status === 401 && token && !retried && authHooks && error.code === "bad_jwt") {
      if (await authHooks.refreshAccessToken()) return request<T>(method, path, options, true);
    }
    throw error;
  }
  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};

/**
 * Bọc lời gọi API thành `{ data, error }` giống Supabase, để component đang viết
 * `const { data, error } = await supabase.from(...)` chỉ phải đổi đúng một dòng.
 */
export async function toResult<T>(promise: Promise<T>): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    return { data: await promise, error: null };
  } catch (err) {
    if (err instanceof ApiError) return { data: null, error: err };
    throw err;
  }
}
