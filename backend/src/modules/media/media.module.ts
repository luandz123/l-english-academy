import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { AuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { InMemoryStorageService } from './storage/in-memory-storage.service';
import {
  STORAGE_SERVICE,
  type StorageService,
} from './storage/storage.interface';
import { SupabaseStorageService } from './storage/supabase-storage.service';

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): StorageService => {
        const provider = config.get('STORAGE_PROVIDER', { infer: true });
        const supabaseUrl = config.get('SUPABASE_URL', { infer: true });
        const serviceRoleKey = config.get('SUPABASE_SERVICE_ROLE_KEY', {
          infer: true,
        });

        if (provider === 'supabase' && supabaseUrl && serviceRoleKey) {
          return new SupabaseStorageService({
            supabaseUrl,
            serviceRoleKey,
          });
        }

        return new InMemoryStorageService();
      },
    },
    MediaService,
  ],
  exports: [MediaService, STORAGE_SERVICE],
})
export class MediaModule {}
