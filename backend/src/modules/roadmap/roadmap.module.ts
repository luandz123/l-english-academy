import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { RoadmapController } from './roadmap.controller';
import { RoadmapMapper } from './roadmap.mapper';
import { RoadmapRepository } from './roadmap.repository';
import { RoadmapService } from './roadmap.service';

@Module({
  // LearningModule: canTakeQuiz để chỉ mời làm bài test nhanh khi học viên có quyền làm quiz đó
  // AnalyticsModule: điểm yếu (P11), điểm ước lượng, bài chẩn đoán cho lộ trình cá nhân hóa (P03)
  imports: [AuthModule, LearningModule, AnalyticsModule],
  controllers: [RoadmapController],
  providers: [RoadmapService, RoadmapRepository, RoadmapMapper],
})
export class RoadmapModule {}
