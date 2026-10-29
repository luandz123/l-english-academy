import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { AuthModule } from '../auth/auth.module';
import { MaterialsAdminController } from './materials-admin.controller';
import { MaterialsMapper } from './materials.mapper';
import { MaterialsRepository } from './materials.repository';
import { MaterialsService } from './materials.service';
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
  controllers: [MediaController, MaterialsAdminController],
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
    MaterialsRepository,
    MaterialsMapper,
    MaterialsService,
  ],
  exports: [
    MediaService,
    MaterialsRepository,
    MaterialsMapper,
    MaterialsService,
    STORAGE_SERVICE,
  ],
})
export class MediaModule {}
