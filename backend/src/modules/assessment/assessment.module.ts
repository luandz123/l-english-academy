import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssessmentController } from './assessment.controller';
import { AssessmentMapper } from './assessment.mapper';
import { AssessmentRepository } from './assessment.repository';
import { AssessmentService } from './assessment.service';

@Module({
  imports: [AuthModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, AssessmentRepository, AssessmentMapper],
})
export class AssessmentModule {}
