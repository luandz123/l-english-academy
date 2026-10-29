import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema';
import {
  MAIL_TRANSPORT,
  type MailMessage,
  type MailTransport,
} from './mail-transport';

export type { MailMessage } from './mail-transport';

/**
 * Điểm gửi thư duy nhất của app. Cách gửi (SMTP hay Gmail API) chọn bằng MAIL_PROVIDER
 * trong MailModule; nơi gọi (AuthService…) không biết và không cần biết.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    config: ConfigService<Env, true>,
  ) {
    this.from = config.get('MAIL_FROM', { infer: true });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.send({ from: this.from, ...message });
    this.logger.log(
      `Đã gửi email "${message.subject}" qua ${this.transport.name}`,
    );
  }
}
