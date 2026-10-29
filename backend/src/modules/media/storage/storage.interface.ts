export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface StorageUploadOptions {
  bucket: string;
  path: string;
  buffer: Buffer;
  contentType: string;
  upsert?: boolean;
}

export interface StorageUploadResult {
  path: string;
  publicUrl: string;
}

export interface StorageService {
  upload(options: StorageUploadOptions): Promise<StorageUploadResult>;
  getPublicUrl(bucket: string, path: string): string;
}

