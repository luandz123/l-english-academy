import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  AllExceptionsFilter,
  type ErrorResponseBody,
} from './all-exceptions.filter';

function mockHost() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const req = { originalUrl: '/api/v1/test' };
  const host = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('giữ code tùy chỉnh do service ném ra', () => {
    const { host, res } = mockHost();
    filter.catch(
      new ForbiddenException({
        code: 'COURSE_LOCKED',
        message: 'Khóa học PRO',
      }),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'COURSE_LOCKED',
        message: 'Khóa học PRO',
      }),
    );
  });

  it('gom lỗi ValidationPipe vào details', () => {
    const { host, res } = mockHost();
    filter.catch(new BadRequestException(['email must be an email']), host);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        details: ['email must be an email'],
      }),
    );
  });

  it('xử lý MulterError LIMIT_FILE_SIZE thành 400 FILE_TOO_LARGE', () => {
    const { host, res } = mockHost();
    const multerError = Object.assign(new Error('File too large'), {
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE',
    });
    filter.catch(multerError, host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
        message: 'Kích thước tệp vượt quá giới hạn cho phép',
      }),
    );
  });

  it('không lộ chi tiết lỗi không xác định', () => {
    const { host, res } = mockHost();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    filter.catch(new Error('connection string leaked'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    const [[body]] = res.json.mock.calls as [[ErrorResponseBody]];
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('leaked');
  });
});
