import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { LibraryRepository } from './library.repository';
import { LibraryService } from './library.service';
import { MistakesRepository } from './mistakes.repository';
import { MistakesService } from './mistakes.service';
import { PracticeAccessService } from './practice-access.service';
import { PracticeAdminController } from './practice-admin.controller';
import { PracticeController } from './practice.controller';
import { PracticeMapper } from './practice.mapper';
import { PracticeRepository } from './practice.repository';
import { PracticeService } from './practice.service';
import { QuestionTaggingService } from './question-tagging.service';

/**
 * Luyện đề: theo dạng câu, Mini Test, Daily Challenge, sổ câu sai, thư viện đề có bộ lọc,
 * yêu thích, đề đã xác minh. Export MistakesService để AssessmentModule ghi câu sai khi nộp Full Test.
 */
@Module({
  // LearningModule: canAccessCourse — quyền với câu = quyền với đề nguồn
  imports: [AuthModule, LearningModule],
  controllers: [PracticeController, PracticeAdminController],
  providers: [
    PracticeService,
    PracticeRepository,
    PracticeMapper,
    PracticeAccessService,
    MistakesService,
    MistakesRepository,
    LibraryService,
    LibraryRepository,
    QuestionTaggingService,
  ],
  exports: [MistakesService],
})
export class PracticeModule {}
