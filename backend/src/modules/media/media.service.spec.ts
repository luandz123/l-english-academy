import { MediaService } from './media.service';
import { InMemoryStorageService } from './storage/in-memory-storage.service';

describe('MediaService', () => {
  let service: MediaService;
  let storage: InMemoryStorageService;

  beforeEach(() => {
    storage = new InMemoryStorageService({
      baseUrl: 'https://test.supabase.co',
    });
    service = new MediaService(storage);
  });

  describe('uploadMedia', () => {
    it('ném lỗi FILE_REQUIRED khi không có file', async () => {
      await expect(
        service.uploadMedia(undefined, { folder: 'lesson_pdfs' }),
      ).rejects.toMatchObject({
        response: { code: 'FILE_REQUIRED' },
      });
    });

    it('ném lỗi FILE_TOO_LARGE khi file > 50MB', async () => {
      const file = {
        originalname: 'big.pdf',
        mimetype: 'application/pdf',
        size: 51 * 1024 * 1024,
        buffer: Buffer.from('data'),
      };
      await expect(
        service.uploadMedia(file, { folder: 'lesson_pdfs' }),
      ).rejects.toMatchObject({
        response: { code: 'FILE_TOO_LARGE' },
      });
    });

    it('ném lỗi INVALID_FOLDER khi folder không nằm trong whitelist', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('data'),
      };
      await expect(
        service.uploadMedia(file, {
          folder: 'forbidden/folder',
        }),
      ).rejects.toMatchObject({
        response: { code: 'INVALID_FOLDER' },
      });
    });

    it('upload media thành công với filename tùy chọn đã sanitize', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 100,
        buffer: Buffer.from('content-pdf'),
      };
      const result = await service.uploadMedia(file, {
        folder: 'lesson_pdfs',
        filename: 'my file!@#$.pdf',
      });

      expect(result.path).toBe('lesson_pdfs/myfile.pdf');
      expect(result.public_url).toBe(
        'https://test.supabase.co/storage/v1/object/public/materials/lesson_pdfs/myfile.pdf',
      );
      expect(
        storage
          .getFile('materials', 'lesson_pdfs/myfile.pdf')
          ?.buffer.toString(),
      ).toBe('content-pdf');
    });

    it('upload media thành công với tên tự sinh khi không có filename', async () => {
      const file = {
        originalname: 'audio file.mp3',
        mimetype: 'audio/mpeg',
        size: 200,
        buffer: Buffer.from('audio-data'),
      };
      const result = await service.uploadMedia(file, {
        folder: 'quiz_audio',
      });

      expect(result.path).toMatch(/^quiz_audio\/\d+_audiofile\.mp3$/);
      expect(result.public_url).toContain(
        'https://test.supabase.co/storage/v1/object/public/materials/quiz_audio/',
      );
    });
  });

  describe('uploadAvatar', () => {
    const userId = 'user-uuid-123';

    it('ném lỗi FILE_REQUIRED khi không có file', async () => {
      await expect(
        service.uploadAvatar(userId, undefined),
      ).rejects.toMatchObject({
        response: { code: 'FILE_REQUIRED' },
      });
    });

    it('ném lỗi FILE_TOO_LARGE khi ảnh > 5MB', async () => {
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 6 * 1024 * 1024,
        buffer: Buffer.from('data'),
      };
      await expect(service.uploadAvatar(userId, file)).rejects.toMatchObject({
        response: { code: 'FILE_TOO_LARGE' },
      });
    });

    it('ném lỗi INVALID_FILE_TYPE khi MIME type không phải ảnh', async () => {
      const file = {
        originalname: 'script.sh',
        mimetype: 'text/x-shellscript',
        size: 100,
        buffer: Buffer.from('echo hello'),
      };
      await expect(service.uploadAvatar(userId, file)).rejects.toMatchObject({
        response: { code: 'INVALID_FILE_TYPE' },
      });
    });

    it('ném lỗi INVALID_FILE_TYPE khi MIME là image/svg+xml (SVG bị cấm)', async () => {
      const file = {
        originalname: 'vector.svg',
        mimetype: 'image/svg+xml',
        size: 100,
        buffer: Buffer.from('<svg></svg>'),
      };
      await expect(service.uploadAvatar(userId, file)).rejects.toMatchObject({
        response: { code: 'INVALID_FILE_TYPE' },
      });
    });

    it('ném lỗi INVALID_FILE_TYPE khi phần mở rộng không khớp MIME (vd: .svg với image/png)', async () => {
      const file = {
        originalname: 'sneaky.svg',
        mimetype: 'image/png',
        size: 100,
        buffer: Buffer.from('fake-png'),
      };
      await expect(service.uploadAvatar(userId, file)).rejects.toMatchObject({
        response: { code: 'INVALID_FILE_TYPE' },
      });
    });

    it('upload avatar mặc định vào profiles/avatars/ với userId', async () => {
      const file = {
        originalname: 'my-avatar.png',
        mimetype: 'image/png',
        size: 500,
        buffer: Buffer.from('png-bytes'),
      };
      const result = await service.uploadAvatar(userId, file);

      expect(result.path).toMatch(
        /^profiles\/avatars\/user-uuid-123-\d+-[a-z0-9]+\.png$/,
      );
      expect(result.public_url).toContain('/profiles/avatars/user-uuid-123-');
      expect(storage.getFile('materials', result.path)?.buffer.toString()).toBe(
        'png-bytes',
      );
    });

    it('upload cover vào profiles/covers/ khi folder=covers', async () => {
      const file = {
        originalname: 'banner.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
        buffer: Buffer.from('jpg-bytes'),
      };
      const result = await service.uploadAvatar(userId, file, {
        folder: 'covers',
      });

      expect(result.path).toMatch(
        /^profiles\/covers\/user-uuid-123-\d+-[a-z0-9]+\.jpg$/,
      );
      expect(result.public_url).toContain('/profiles/covers/user-uuid-123-');
    });
  });
});
