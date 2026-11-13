import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { CompareService } from './compare.service';
import { RecommendationService } from './recommendation.service';

/**
 * Phân tích & cá nhân hóa (P11 điểm yếu, P10 tiến độ, E09 so sánh, E10 đề xuất). Export
 * AnalyticsService để RoadmapModule (P03) đọc kết luận điểm yếu — nguồn duy nhất.
 */
@Module({
  // LearningModule: canAccessCourse — câu/đề đề xuất phải thuộc đề học viên có quyền
  imports: [AuthModule, LearningModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRepository,
    CompareService,
    RecommendationService,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
