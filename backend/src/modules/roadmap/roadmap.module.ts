import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { RoadmapController } from './roadmap.controller';
import { RoadmapMapper } from './roadmap.mapper';
import { RoadmapRepository } from './roadmap.repository';
import { RoadmapService } from './roadmap.service';

@Module({
  // LearningModule: canTakeQuiz để chỉ mời làm bài test nhanh khi học viên có quyền làm quiz đó
  imports: [AuthModule, LearningModule],
  controllers: [RoadmapController],
  providers: [RoadmapService, RoadmapRepository, RoadmapMapper],
})
export class RoadmapModule {}
