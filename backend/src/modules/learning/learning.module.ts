import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { LearningController } from './learning.controller';
import { LearningMapper } from './learning.mapper';
import { LearningRepository } from './learning.repository';
import { LearningService } from './learning.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [LearningController],
  providers: [LearningService, LearningRepository, LearningMapper],
})
export class LearningModule {}
