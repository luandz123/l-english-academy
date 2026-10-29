import { GmailApiMailTransport } from './gmail-api.transport';

const OPTIONS = {
  clientId: 'cid',
  clientSecret: 'csecret',
  refreshToken: 'rtoken',
};
const MAIL = {
  from: 'L-English Academy <owner@gmail.com>',
  to: 'hocvien@example.com',
  subject: 'Xác nhận đăng ký tài khoản L-English',
  text: 'Bấm vào liên kết',
  html: '<p>Bấm vào liên kết</p>',
};

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = [];
  const fn = jest.fn((url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift() ?? { status: 500, body: {} };
    return Promise.resolve(
      new Response(JSON.stringify(next.body), { status: next.status }),
    );
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const tokenOk = {
  status: 200,
  body: { access_token: 'at-1', expires_in: 3599 },
};
const sendOk = { status: 200, body: { id: 'msg-1' } };

describe('GmailApiMailTransport', () => {
  it('đổi refresh token lấy access token rồi gửi MIME base64url', async () => {
    const { fn, calls } = fakeFetch([tokenOk, sendOk]);
    await new GmailApiMailTransport(OPTIONS, fn).send(MAIL);

    expect(calls[0].url).toBe('https://oauth2.googleapis.com/token');
    const form = new URLSearchParams(
      (calls[0].init.body as URLSearchParams).toString(),
    );
    expect(Object.fromEntries(form)).toEqual({
      client_id: 'cid',
      client_secret: 'csecret',
      refresh_token: 'rtoken',
      grant_type: 'refresh_token',
    });

    expect(calls[1].url).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    expect(
      (calls[1].init.headers as Record<string, string>).Authorization,
    ).toBe('Bearer at-1');
    const { raw } = JSON.parse(calls[1].init.body as string) as { raw: string };
    expect(raw).not.toMatch(/[+/=]/); // base64url, không phải base64 thường
    const mime = Buffer.from(raw, 'base64url').toString();
    expect(mime).toContain('To: hocvien@example.com');
    expect(mime).toContain('From: "L-English Academy" <owner@gmail.com>');
    // Tiêu đề tiếng Việt được mã hóa theo RFC 2047
    expect(mime).toMatch(/Subject: =\?UTF-8\?/);
    expect(mime).toContain('multipart/alternative');
  });

  it('dùng lại access token còn hạn cho lần gửi sau', async () => {
    const { fn, calls } = fakeFetch([tokenOk, sendOk, sendOk]);
    const transport = new GmailApiMailTransport(OPTIONS, fn);
    await transport.send(MAIL);
    await transport.send(MAIL);
    expect(calls.map((c) => c.url.split('/')[2])).toEqual([
      'oauth2.googleapis.com',
      'gmail.googleapis.com',
      'gmail.googleapis.com',
    ]);
  });

  it('refresh token hỏng (invalid_grant) → ném lỗi, không gửi', async () => {
    const { fn, calls } = fakeFetch([
      { status: 400, body: { error: 'invalid_grant' } },
    ]);
    await expect(
      new GmailApiMailTransport(OPTIONS, fn).send(MAIL),
    ).rejects.toThrow(/access token Gmail: HTTP 400.*invalid_grant/);
    expect(calls).toHaveLength(1);
  });

  it('Gmail trả 401 → ném lỗi và bỏ token cache để lần sau lấy token mới', async () => {
    const { fn, calls } = fakeFetch([
      tokenOk,
      { status: 401, body: { error: 'unauthorized' } },
      { status: 200, body: { access_token: 'at-2', expires_in: 3599 } },
      sendOk,
    ]);
    const transport = new GmailApiMailTransport(OPTIONS, fn);
    await expect(transport.send(MAIL)).rejects.toThrow(/HTTP 401/);
    await transport.send(MAIL);
    expect(
      (calls[3].init.headers as Record<string, string>).Authorization,
    ).toBe('Bearer at-2');
  });
});
