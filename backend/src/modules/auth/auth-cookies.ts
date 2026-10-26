import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'lenglish_rt';
export const OAUTH_STATE_COOKIE = 'lenglish_oauth_state';

// Cookie chỉ gửi kèm các route /api/v1/auth (refresh, logout), không đi theo mọi request
const REFRESH_PATH = '/api/v1/auth';
const OAUTH_PATH = '/api/v1/auth/google';

function base(secure: boolean): CookieOptions {
  // SameSite=Lax: trình duyệt không gửi cookie trong POST từ site khác (chống CSRF);
  // vẫn gửi khi quay về từ Google (điều hướng GET cấp cao nhất).
  return { httpOnly: true, secure, sameSite: 'lax' };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
  secure: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    ...base(secure),
    path: REFRESH_PATH,
    maxAge: maxAgeMs,
  });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE, { ...base(secure), path: REFRESH_PATH });
}

export function setOAuthStateCookie(
  res: Response,
  nonce: string,
  secure: boolean,
): void {
  res.cookie(OAUTH_STATE_COOKIE, nonce, {
    ...base(secure),
    path: OAUTH_PATH,
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthStateCookie(res: Response, secure: boolean): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { ...base(secure), path: OAUTH_PATH });
}
