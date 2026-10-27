import { createTransport, type Transporter } from 'nodemailer';
import type { MailTransport, OutgoingMail } from './mail-transport';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

export class SmtpMailTransport implements MailTransport {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor(options: SmtpOptions) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user
        ? { user: options.user, pass: options.pass }
        : undefined,
      // Mặc định của Nodemailer chờ tới 2 phút; cổng SMTP bị chặn thì request đăng ký treo.
      // Báo lỗi sau ~15 giây để AuthService rollback và trả lỗi cho người dùng.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  async send(mail: OutgoingMail): Promise<void> {
    await this.transporter.sendMail(mail);
  }
}
