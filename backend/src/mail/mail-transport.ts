export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface OutgoingMail extends MailMessage {
  /** Ví dụ: `L-English Academy <no-reply@example.com>` */
  from: string;
}

/**
 * Cách gửi thư. Hai implementation thật (AGENTS.md: chỉ tách interface khi có ≥ 2):
 * - SmtpMailTransport: dev (Mailpit) và nơi mở được cổng SMTP
 * - GmailApiMailTransport: Render free (chặn cổng SMTP) — gửi qua HTTPS
 */
export interface MailTransport {
  readonly name: string;
  send(mail: OutgoingMail): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
