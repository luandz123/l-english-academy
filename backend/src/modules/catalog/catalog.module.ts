import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { CatalogService } from './catalog.service';
import { CatalogAdminService } from './catalog-admin.service';
import { CatalogRepository } from './catalog.repository';
import { CatalogMapper } from './catalog.mapper';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController, CatalogAdminController],
  providers: [
    CatalogService,
    CatalogAdminService,
    CatalogRepository,
    CatalogMapper,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
