import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { TranscriptionDto } from './dto/transcription.dto';

/** Bản ghi shadowing tối đa 10 giây (~100–200KB); 5MB đủ dư cho mọi trình duyệt. */
export const MAX_SPEECH_FILE_SIZE = 5 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 20_000;

export interface SpeechFileInput {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
}

/**
 * Chuyển giọng nói thành chữ bằng Whisper qua API dạng OpenAI (`/audio/transcriptions`;
 * mặc định Groq). Dùng khi Web Speech API của trình duyệt không chạy (lỗi `network`, Firefox...).
 * Chỉ trả chữ; việc so với câu mẫu vẫn như cũ ở client vì điểm shadowing không lưu ở đâu.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async transcribe(
    file: SpeechFileInput | undefined,
  ): Promise<TranscriptionDto> {
    if (!file || file.size === 0) {
      throw new BadRequestException({
        code: 'AUDIO_REQUIRED',
        message: 'Thiếu file ghi âm',
      });
    }
    const mime = file.mimetype.split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('audio/') && mime !== 'video/webm') {
      throw new BadRequestException({
        code: 'AUDIO_INVALID_TYPE',
        message: 'File ghi âm không hợp lệ',
      });
    }

    const apiKey = this.config.get('STT_API_KEY', { infer: true });
    if (!apiKey) {
      throw new ServiceUnavailableException({
        code: 'STT_NOT_CONFIGURED',
        message: 'Chưa cấu hình dịch vụ nhận giọng nói',
      });
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: mime }),
      file.originalname || 'speech.webm',
    );
    form.append('model', this.config.get('STT_MODEL', { infer: true }));
    form.append('language', 'en');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    let res: Response;
    try {
      res = await fetch(this.config.get('STT_API_URL', { infer: true }), {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(`STT request failed: ${(err as Error).message}`);
      throw unavailable();
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 200);
      this.logger.warn(`STT upstream ${res.status}: ${detail}`);
      throw unavailable();
    }

    const body = (await res.json().catch(() => ({}))) as { text?: unknown };
    return { text: typeof body.text === 'string' ? body.text.trim() : '' };
  }
}

const unavailable = () =>
  new BadGatewayException({
    code: 'STT_UNAVAILABLE',
    message: 'Dịch vụ nhận giọng nói đang lỗi, thử lại sau',
  });
