import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Lỗi auth giữ đúng `message` tiếng Anh của Supabase Auth, vì
 * src/lib/errorHandler.ts (getFriendlyErrorMessage) nhận diện theo các chuỗi này
 * để hiện câu tiếng Việt như trước.
 */
export class AuthError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string) {
    super({ code, message }, status);
  }
}

export const AuthErrors = {
  invalidCredentials: () =>
    new AuthError(
      HttpStatus.BAD_REQUEST,
      'invalid_credentials',
      'Invalid login credentials',
    ),
  emailNotConfirmed: () =>
    new AuthError(
      HttpStatus.BAD_REQUEST,
      'email_not_confirmed',
      'Email not confirmed',
    ),
  userAlreadyExists: () =>
    new AuthError(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'user_already_exists',
      'User already registered',
    ),
  sessionMissing: () =>
    new AuthError(
      HttpStatus.UNAUTHORIZED,
      'session_not_found',
      'Auth session missing!',
    ),
  jwtExpired: () =>
    new AuthError(HttpStatus.UNAUTHORIZED, 'bad_jwt', 'JWT expired'),
  invalidJwt: () =>
    new AuthError(HttpStatus.UNAUTHORIZED, 'bad_jwt', 'Invalid JWT'),
  refreshTokenNotFound: () =>
    new AuthError(
      HttpStatus.UNAUTHORIZED,
      'refresh_token_not_found',
      'Invalid Refresh Token: Refresh Token Not Found',
    ),
  refreshTokenReused: () =>
    new AuthError(
      HttpStatus.UNAUTHORIZED,
      'refresh_token_already_used',
      'Invalid Refresh Token: Already Used',
    ),
  forbidden: () =>
    new AuthError(
      HttpStatus.FORBIDDEN,
      'forbidden',
      'Bạn không có quyền thực hiện thao tác này',
    ),
  googleNotConfigured: () =>
    new AuthError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'provider_disabled',
      'Unsupported provider: provider is not enabled',
    ),
  emailSendFailed: () =>
    new AuthError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'email_send_failed',
      'Error sending confirmation email',
    ),
};
