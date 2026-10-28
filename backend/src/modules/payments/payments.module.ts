import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { PaymentsMapper } from './payments.mapper';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaymentsMapper],
})
export class PaymentsModule {}
