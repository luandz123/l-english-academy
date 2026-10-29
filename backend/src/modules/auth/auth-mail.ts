import type { MailMessage } from '../../mail/mail.service';

/** Nội dung email xác nhận đăng ký và đặt lại mật khẩu (thay template của Supabase). */
export function verificationMail(to: string, link: string): MailMessage {
  return {
    to,
    subject: 'Xác nhận đăng ký tài khoản L-English',
    text: `Chào bạn,\n\nBấm vào liên kết sau để xác nhận email và kích hoạt tài khoản L-English:\n${link}\n\nLiên kết có hiệu lực trong 24 giờ. Nếu bạn không đăng ký, hãy bỏ qua email này.`,
    html: `<p>Chào bạn,</p><p>Bấm vào liên kết sau để xác nhận email và kích hoạt tài khoản L-English:</p><p><a href="${link}">Xác nhận email</a></p><p>Liên kết có hiệu lực trong 24 giờ. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>`,
  };
}

export function recoveryMail(to: string, link: string): MailMessage {
  return {
    to,
    subject: 'Đặt lại mật khẩu L-English',
    text: `Chào bạn,\n\nBấm vào liên kết sau để đặt lại mật khẩu:\n${link}\n\nLiên kết có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<p>Chào bạn,</p><p>Bấm vào liên kết sau để đặt lại mật khẩu:</p><p><a href="${link}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
  };
}
