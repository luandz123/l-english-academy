import { Injectable } from '@nestjs/common';
import type {
  StorageService,
  StorageUploadOptions,
  StorageUploadResult,
} from './storage.interface';

@Injectable()
export class SupabaseStorageService implements StorageService {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(options: { supabaseUrl: string; serviceRoleKey: string }) {
    this.baseUrl = options.supabaseUrl.replace(/\/+$/, '');
    this.serviceRoleKey = options.serviceRoleKey;
  }

  /** Supabase Storage: POST /object/upload/sign → `{ url: "/object/upload/sign/...?token=..." }` (hạn 2 giờ). */
  async createSignedUploadUrl(bucket: string, path: string): Promise<string> {
    const cleanPath = path.replace(/^\/+/, '');
    const res = await fetch(
      `${this.baseUrl}/storage/v1/object/upload/sign/${bucket}/${cleanPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.serviceRoleKey}`,
          apikey: this.serviceRoleKey,
          'Content-Type': 'application/json',
          'x-upsert': 'true',
        },
        body: '{}',
      },
    );
    if (!res.ok) {
      throw new Error(
        `Supabase signed upload URL failed (${res.status}): ${await res.text()}`,
      );
    }
    const data = (await res.json()) as { url?: string };
    if (!data.url) throw new Error('Supabase signed upload URL missing');
    return `${this.baseUrl}/storage/v1${data.url}`;
  }

  getPublicUrl(bucket: string, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return `${this.baseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
  }

  async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const cleanPath = options.path.replace(/^\/+/, '');
    const url = `${this.baseUrl}/storage/v1/object/${options.bucket}/${cleanPath}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      'Content-Type': options.contentType,
      'x-upsert': options.upsert !== false ? 'true' : 'false',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: new Uint8Array(options.buffer),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        `Supabase storage upload failed (${res.status}): ${errText}`,
      );
    }

    return {
      path: cleanPath,
      publicUrl: this.getPublicUrl(options.bucket, cleanPath),
    };
  }
}
