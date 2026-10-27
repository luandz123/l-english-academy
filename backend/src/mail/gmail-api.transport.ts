import MailComposer from 'nodemailer/lib/mail-composer';
import type { MailTransport, OutgoingMail } from './mail-transport';

export interface GmailApiOptions {
  clientId: string;
  clientSecret: string;
  /** Refresh token cấp cho scope https://www.googleapis.com/auth/gmail.send */
  refreshToken: string;
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const TIMEOUT_MS = 15_000;

/**
 * Gửi thư bằng Gmail API qua HTTPS (cổng 443) — dùng trên Render free vì nền tảng
 * chặn mọi cổng SMTP ra ngoài. Thư do Google gửi từ chính hộp Gmail của chủ dự án nên
 * qua được kiểm tra SPF/DKIM/DMARC (khác với dịch vụ trung gian mạo danh @gmail.com).
 *
 * Luồng: refresh token → access token (cache tới gần hết hạn) → MIME (MailComposer
 * của Nodemailer) → base64url → POST users/me/messages/send.
 */
export class GmailApiMailTransport implements MailTransport {
  readonly name = 'gmail_api';
  private accessToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly options: GmailApiOptions,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async send(mail: OutgoingMail): Promise<void> {
    const raw = await buildRawMessage(mail);
    const token = await this.getAccessToken();
    const res = await this.fetchFn(SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 401) {
      // Token bị thu hồi giữa chừng: lấy token mới ở lần gửi sau
      this.accessToken = null;
    }
    if (!res.ok) {
      throw new Error(
        `Gmail API gửi thất bại: HTTP ${res.status} ${await safeText(res)}`,
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now()) {
      return this.accessToken.value;
    }
    const res = await this.fetchFn(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // invalid_grant: refresh token hết hạn/bị thu hồi (app OAuth để ở chế độ "Testing" chỉ sống 7 ngày)
      throw new Error(
        `Không lấy được access token Gmail: HTTP ${res.status} ${await safeText(res)}`,
      );
    }
    const body = (await res.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.accessToken = {
      value: body.access_token,
      // Trừ 60 giây để không dùng token sát lúc hết hạn
      expiresAt: Date.now() + (body.expires_in - 60) * 1000,
    };
    return body.access_token;
  }
}

function buildRawMessage(mail: OutgoingMail): Promise<string> {
  return new Promise((resolve, reject) => {
    new MailComposer(mail).compile().build((err, message) => {
      if (err) reject(err);
      else resolve(message.toString('base64url'));
    });
  });
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return '';
  }
}
