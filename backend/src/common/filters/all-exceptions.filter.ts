import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Định dạng lỗi thống nhất cho mọi endpoint. `code` là mã ổn định để
 * src/lib/api map về đúng câu chữ mà giao diện cũ đang hiển thị.
 */
export interface ErrorResponseBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'FILE_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const body = this.toBody(exception, req.originalUrl ?? req.url);
    if (body.statusCode >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, path: string): ErrorResponseBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      let message = exception.message;
      let code = DEFAULT_CODES[statusCode] ?? 'ERROR';
      let details: unknown;

      if (typeof payload === 'object' && payload !== null) {
        const p = payload as Record<string, unknown>;
        if (typeof p.code === 'string') code = p.code;
        // ValidationPipe trả message là mảng lỗi từng trường
        if (Array.isArray(p.message)) {
          code = 'VALIDATION_FAILED';
          message = 'Dữ liệu không hợp lệ';
          details = p.message;
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
      }
      return { statusCode, code, message, details, path, timestamp };
    }

    if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      (exception as Record<string, unknown>).code === 'LIMIT_FILE_SIZE'
    ) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'FILE_TOO_LARGE',
        message: 'Kích thước tệp vượt quá giới hạn cho phép',
        path,
        timestamp,
      };
    }

    if (
      exception &&
      typeof exception === 'object' &&
      'name' in exception &&
      (exception as Record<string, unknown>).name === 'MulterError'
    ) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'BAD_REQUEST',
        message: (exception as Error).message || 'Lỗi tải lên tệp',
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Đã có lỗi xảy ra',
      path,
      timestamp,
    };
  }
}
