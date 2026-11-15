import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { PracticeModule } from '../practice/practice.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { GrammarAdminController } from './grammar-admin.controller';
import { GrammarAdminService } from './grammar-admin.service';
import { GrammarMistakesService } from './grammar-mistakes.service';
import { GrammarSessionService } from './grammar-session.service';
import { GrammarTaggingService } from './grammar-tagging.service';
import { GrammarController } from './grammar.controller';
import { GrammarRepository } from './grammar.repository';
import { GrammarService } from './grammar.service';

/**
 * Ngữ pháp (D16): Grammar Center (G01–G04), cấp độ (G05), Sổ lỗi ngữ pháp (G07), ôn theo lịch (G08).
 */
@Module({
  // AnalyticsModule: điểm ước lượng (G05), đề có quyền. PracticeModule: lượt luyện câu TOEIC theo
  // chủ điểm (G04) và câu TOEIC trong phiên ôn. RoadmapModule: chặng hiện tại cho "Gợi ý cho bạn".
  imports: [AuthModule, AnalyticsModule, PracticeModule, RoadmapModule],
  controllers: [GrammarController, GrammarAdminController],
  providers: [
    GrammarService,
    GrammarSessionService,
    GrammarMistakesService,
    GrammarAdminService,
    GrammarTaggingService,
    GrammarRepository,
  ],
})
export class GrammarModule {}
