import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.schema';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Gửi email qua SMTP. Một implementation duy nhất (DECISIONS D-08):
 * đổi nhà cung cấp (Mailpit → Gmail → Resend) chỉ bằng biến SMTP_*.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    const user = config.get('SMTP_USER', { infer: true });
    this.transporter = createTransport({
      host: config.get('SMTP_HOST', { infer: true }),
      port: config.get('SMTP_PORT', { infer: true }),
      secure: config.get('SMTP_SECURE', { infer: true }),
      auth: user
        ? { user, pass: config.get('SMTP_PASS', { infer: true }) }
        : undefined,
      // Mặc định của Nodemailer chờ tới 2 phút; cổng SMTP bị chặn (Render free) thì request
      // đăng ký treo. Báo lỗi sau ~15 giây để AuthService rollback và trả lỗi cho người dùng.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, ...message });
    this.logger.log(`Đã gửi email "${message.subject}"`);
  }
}
