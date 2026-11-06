import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { TranscriptionService } from './transcription.service';

const URL = 'https://stt.example/v1/audio/transcriptions';

function makeService(apiKey: string | undefined) {
  const values: Record<string, string | undefined> = {
    STT_API_KEY: apiKey,
    STT_API_URL: URL,
    STT_MODEL: 'whisper-large-v3-turbo',
  };
  const config = {
    get: (key: string) => values[key],
  } as unknown as ConfigService<Env, true>;
  return new TranscriptionService(config);
}

const audio = (mimetype = 'audio/webm;codecs=opus', size = 4) => ({
  buffer: Buffer.alloc(size, 1),
  mimetype,
  originalname: 'speech.webm',
  size,
});

describe('TranscriptionService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());

  it('thiếu file hoặc file rỗng → 400 AUDIO_REQUIRED, không gọi dịch vụ', async () => {
    const svc = makeService('key');
    await expect(svc.transcribe(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(svc.transcribe(audio('audio/webm', 0))).rejects.toMatchObject({
      response: { code: 'AUDIO_REQUIRED' },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('không phải audio → 400 AUDIO_INVALID_TYPE', async () => {
    await expect(
      makeService('key').transcribe(audio('application/pdf')),
    ).rejects.toMatchObject({ response: { code: 'AUDIO_INVALID_TYPE' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chưa cấu hình key → 503 STT_NOT_CONFIGURED', async () => {
    await expect(
      makeService(undefined).transcribe(audio()),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('gửi đúng model/ngôn ngữ kèm Bearer key, trả chữ đã trim', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ text: '  Where is the bus stop? ' }), {
        status: 200,
      }),
    );
    await expect(makeService('key').transcribe(audio())).resolves.toEqual({
      text: 'Where is the bus stop?',
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(URL);
    expect(init.headers).toEqual({ Authorization: 'Bearer key' });
    const form = init.body as FormData;
    expect(form.get('model')).toBe('whisper-large-v3-turbo');
    expect(form.get('language')).toBe('en');
    const file = form.get('file') as File;
    expect(file.name).toBe('speech.webm');
    expect(file.type).toBe('audio/webm');
  });

  it('dịch vụ trả lỗi hoặc không kết nối được → 502 STT_UNAVAILABLE', async () => {
    const svc = makeService('key');
    fetchMock.mockResolvedValueOnce(new Response('quota', { status: 429 }));
    await expect(svc.transcribe(audio())).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'));
    await expect(svc.transcribe(audio())).rejects.toMatchObject({
      response: { code: 'STT_UNAVAILABLE' },
    });
  });

  it('phản hồi thiếu text → chuỗi rỗng', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(makeService('key').transcribe(audio())).resolves.toEqual({
      text: '',
    });
  });
});
