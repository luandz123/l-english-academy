import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Env } from '../../config/env.schema';
import { AuthAdminController } from './auth-admin.controller';
import { AuthController } from './auth.controller';
import { ProfilesController } from './profiles.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google/google-auth.guard';
import { GoogleStrategy } from './google/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TokenService } from './token.service';

/**
 * Module khác bảo vệ route bằng `@UseGuards(JwtAuthGuard, RolesGuard)` sau khi
 * import AuthModule — không truy cập AuthRepository trực tiếp.
 */
@Module({
  imports: [
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', issuer: 'lenglish-api' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'lenglish-api' },
      }),
    }),
  ],
  controllers: [AuthController, AuthAdminController, ProfilesController],
  providers: [
    AuthRepository,
    AuthService,
    TokenService,
    JwtAuthGuard,
    RolesGuard,
    GoogleStrategy,
    GoogleAuthGuard,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
