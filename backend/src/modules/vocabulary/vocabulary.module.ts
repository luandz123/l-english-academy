import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  VocabularyAdminController,
  VocabularyController,
} from './vocabulary.controller';
import { VocabularyRepository } from './vocabulary.repository';
import { VocabularyService } from './vocabulary.service';

/**
 * Từ vựng cá nhân (Ưu tiên 3, D15): kho từ theo Part/cấp độ, sổ từ, ôn SRS SM-2, lưu từ từ bài
 * nghe/đọc. Khác AssessmentModule (bộ flashcard theo khóa) — module này chỉ đọc vocab_questions để tra nghĩa.
 */
@Module({
  imports: [AuthModule],
  controllers: [VocabularyController, VocabularyAdminController],
  providers: [VocabularyService, VocabularyRepository],
})
export class VocabularyModule {}
