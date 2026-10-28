import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LearningModule } from '../learning/learning.module';
import { AssessmentController } from './assessment.controller';
import { AssessmentMapper } from './assessment.mapper';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [AuthModule, LearningModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentRepository, AssessmentMapper],
})
export class AssessmentModule {}
