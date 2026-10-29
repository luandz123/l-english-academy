import { Injectable } from '@nestjs/common';
import type {
  StorageService,
  StorageUploadOptions,
  StorageUploadResult,
} from './storage.interface';

@Injectable()
export class InMemoryStorageService implements StorageService {
  private readonly files = new Map<
    string,
    { buffer: Buffer; contentType: string }
  >();
  private readonly baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = (options?.baseUrl || 'http://storage.local').replace(
      /\/+$/,
      '',
    );
  }

  getPublicUrl(bucket: string, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${this.baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  }

  upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const cleanPath = options.path.replace(/^\/+/, '');
    const key = `${options.bucket}/${cleanPath}`;
    this.files.set(key, {
      buffer: options.buffer,
      contentType: options.contentType,
    });

    return Promise.resolve({
      path: cleanPath,
      publicUrl: this.getPublicUrl(options.bucket, cleanPath),
    });
  }

  getFile(
    bucket: string,
    path: string,
  ): { buffer: Buffer; contentType: string } | undefined {
    const cleanPath = path.replace(/^\/+/, '');
    return this.files.get(`${bucket}/${cleanPath}`);
  }

  clear(): void {
    this.files.clear();
  }
}
