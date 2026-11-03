import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { SpeakingController } from './speaking.controller';
import { SpeakingMapper } from './speaking.mapper';
import { SpeakingRepository } from './speaking.repository';
import { SpeakingService } from './speaking.service';

@Module({
  // JwtModule riêng (không secret mặc định): ký token LiveKit bằng LIVEKIT_API_SECRET
  imports: [AuthModule, JwtModule.register({})],
  controllers: [SpeakingController],
  providers: [SpeakingService, SpeakingRepository, SpeakingMapper],
})
export class SpeakingModule {}
