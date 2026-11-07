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
  /**
   * URL ký tạm để trình duyệt tải tệp THẲNG lên kho (không đi qua Vercel/Render, tránh giới hạn
   * dung lượng body và bộ nhớ). `null` khi kho không hỗ trợ (vd. kho trong bộ nhớ khi dev/test).
   */
  createSignedUploadUrl(bucket: string, path: string): Promise<string | null>;
}
