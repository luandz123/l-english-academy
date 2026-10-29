import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ALLOWED_MEDIA_FOLDERS,
  type UploadAvatarDto,
  type UploadMediaDto,
} from './dto';
import {
  STORAGE_SERVICE,
  type StorageService,
} from './storage/storage.interface';

export const BUCKET_MATERIALS = 'materials';
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export interface UploadFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async uploadMedia(
    file: UploadFileInput | undefined,
    dto: UploadMediaDto,
  ): Promise<{ path: string; public_url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Tệp tải lên là bắt buộc',
      });
    }

    if (file.size > MAX_MEDIA_FILE_SIZE) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Kích thước tệp vượt quá giới hạn cho phép (${MAX_MEDIA_FILE_SIZE / (1024 * 1024)}MB)`,
      });
    }

    const folder = dto.folder?.trim();
    if (
      !folder ||
      !(ALLOWED_MEDIA_FOLDERS as readonly string[]).includes(folder)
    ) {
      throw new BadRequestException({
        code: 'INVALID_FOLDER',
        message: `Thư mục tải lên không hợp lệ. Cho phép: ${ALLOWED_MEDIA_FOLDERS.join(', ')}`,
      });
    }

    let filename: string;
    if (dto.filename && dto.filename.trim()) {
      const sanitized = dto.filename.trim().replace(/[^a-zA-Z0-9.\-_]/g, '');
      filename = sanitized || `${Date.now()}_media`;
    } else {
      const rawOriginal = file.originalname || 'file';
      const sanitized = rawOriginal.replace(/[^a-zA-Z0-9.\-_]/g, '');
      filename = `${Date.now()}_${sanitized || 'media'}`;
    }

    const path = `${folder.replace(/^\/+|\/+$/g, '')}/${filename}`;
    const contentType = file.mimetype || 'application/octet-stream';

    const result = await this.storage.upload({
      bucket: BUCKET_MATERIALS,
      path,
      buffer: file.buffer,
      contentType,
      upsert: true,
    });

    return {
      path: result.path,
      public_url: result.publicUrl,
    };
  }

  async uploadAvatar(
    userId: string,
    file: UploadFileInput | undefined,
    dto?: UploadAvatarDto,
  ): Promise<{ path: string; public_url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Tệp hình ảnh là bắt buộc',
      });
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Kích thước ảnh vượt quá giới hạn cho phép (${MAX_AVATAR_FILE_SIZE / (1024 * 1024)}MB)`,
      });
    }

    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message:
          'Định dạng ảnh không hợp lệ (chỉ hỗ trợ JPG, PNG, WebP, GIF, SVG)',
      });
    }

    const subfolder = dto?.folder === 'covers' ? 'covers' : 'avatars';
    const rawExt = file.originalname?.split('.').pop() || '';
    const cleanExt =
      rawExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ||
      (file.mimetype === 'image/png' ? 'png' : 'jpg');
    const random = Math.random().toString(36).substring(2, 7);
    const filename = `${userId}-${Date.now()}-${random}.${cleanExt}`;
    const path = `profiles/${subfolder}/${filename}`;

    const result = await this.storage.upload({
      bucket: BUCKET_MATERIALS,
      path,
      buffer: file.buffer,
      contentType: file.mimetype,
      upsert: true,
    });

    return {
      path: result.path,
      public_url: result.publicUrl,
    };
  }
}
