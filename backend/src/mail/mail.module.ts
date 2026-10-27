import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import { GmailApiMailTransport } from './gmail-api.transport';
import { MAIL_TRANSPORT, type MailTransport } from './mail-transport';
import { MailService } from './mail.service';
import { SmtpMailTransport } from './smtp.transport';

@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): MailTransport => {
        if (config.get('MAIL_PROVIDER', { infer: true }) === 'gmail_api') {
          // env.schema đã bắt buộc đủ 3 biến khi MAIL_PROVIDER=gmail_api
          return new GmailApiMailTransport({
            clientId: config.get('GMAIL_CLIENT_ID', { infer: true }),
            clientSecret: config.get('GMAIL_CLIENT_SECRET', { infer: true }),
            refreshToken: config.get('GMAIL_REFRESH_TOKEN', { infer: true }),
          });
        }
        return new SmtpMailTransport({
          host: config.get('SMTP_HOST', { infer: true }),
          port: config.get('SMTP_PORT', { infer: true }),
          secure: config.get('SMTP_SECURE', { infer: true }),
          user: config.get('SMTP_USER', { infer: true }),
          pass: config.get('SMTP_PASS', { infer: true }),
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
