import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { LearningAdminController } from './learning-admin.controller';
import { LearningAdminService } from './learning-admin.service';
import { LearningController } from './learning.controller';
import { LearningMapper } from './learning.mapper';
import { LearningRepository } from './learning.repository';
import { LearningService } from './learning.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [LearningController, LearningAdminController],
  providers: [
    LearningService,
    LearningAdminService,
    LearningRepository,
    LearningMapper,
  ],
})
export class LearningModule {}
