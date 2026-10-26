import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogRepository } from './catalog.repository';
import { CatalogMapper } from './catalog.mapper';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository, CatalogMapper],
  exports: [CatalogService],
})
export class CatalogModule {}
