import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { AssessmentController } from './assessment.controller';
import { AssessmentMapper } from './assessment.mapper';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';
import { FullTestController } from './full-test.controller';
import { FullTestMapper } from './full-test.mapper';
import { FullTestRepository } from './full-test.repository';
import { FullTestService } from './full-test.service';
import { VocabController } from './vocab.controller';
import { VocabMapper } from './vocab.mapper';
import { VocabRepository } from './vocab.repository';
import { VocabService } from './vocab.service';

@Module({
  imports: [AuthModule, LearningModule],
  controllers: [AssessmentController, FullTestController, VocabController],
  providers: [
    AssessmentService,
    AssessmentRepository,
    AssessmentMapper,
    FullTestService,
    FullTestRepository,
    FullTestMapper,
    VocabService,
    VocabRepository,
    VocabMapper,
  ],
})
export class AssessmentModule {}
