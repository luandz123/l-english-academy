import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminMapper } from './admin.mapper';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, SettingsController],
  providers: [AdminService, AdminRepository, AdminMapper],
})
export class AdminModule {}
