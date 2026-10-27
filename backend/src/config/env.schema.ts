import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');

/**
 * Biến môi trường của backend. Thiếu hoặc sai kiểu → app từ chối khởi động.
 * Mỗi module thêm biến của mình vào đây và vào backend/.env.example.
 */
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .default('info'),
    DATABASE_URL: z.string().url(),
    // Danh sách origin cách nhau bởi dấu phẩy
    CORS_ORIGINS: z.string().default('http://localhost:8082'),
    // Số proxy đứng trước app (Vercel rewrite + Render = 2) để lấy đúng IP cho rate limit
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

    // --- Auth (ADR 0002) ---
    // Origin công khai của frontend: link trong email, đích redirect sau Google/verify
    FRONTEND_URL: z.string().url().default('http://localhost:8082'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    // DECISIONS C-04: coi như Supabase đang bật "Confirm email"
    AUTH_REQUIRE_EMAIL_CONFIRMATION: booleanString.default('true'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // --- Mail (DECISIONS D-08): Mailpit khi dev, Gmail SMTP khi production ---
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: booleanString.default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z
      .string()
      .default('L-English Academy <no-reply@lenglish.local>'),
    // smtp: Mailpit/SMTP thường. gmail_api: Render free chặn cổng SMTP → gửi qua HTTPS
    MAIL_PROVIDER: z.enum(['smtp', 'gmail_api']).default('smtp'),
    GMAIL_CLIENT_ID: z.string().optional(),
    GMAIL_CLIENT_SECRET: z.string().optional(),
    GMAIL_REFRESH_TOKEN: z.string().optional(),
  })
  .refine(
    (env) =>
      env.NODE_ENV !== 'production' || env.FRONTEND_URL.startsWith('https://'),
    {
      message: 'Production cần FRONTEND_URL dạng https:// (cookie Secure)',
      path: ['FRONTEND_URL'],
    },
  )
  .refine(
    (env) =>
      env.MAIL_PROVIDER !== 'smtp' ||
      env.NODE_ENV !== 'production' ||
      Boolean(env.SMTP_USER),
    {
      message: 'Production dùng MAIL_PROVIDER=smtp thì cần SMTP_USER',
      path: ['SMTP_USER'],
    },
  )
  .refine(
    (env) =>
      env.MAIL_PROVIDER !== 'gmail_api' ||
      Boolean(
        env.GMAIL_CLIENT_ID &&
        env.GMAIL_CLIENT_SECRET &&
        env.GMAIL_REFRESH_TOKEN,
      ),
    {
      message:
        'MAIL_PROVIDER=gmail_api cần GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN',
      path: ['GMAIL_REFRESH_TOKEN'],
    },
  );

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
  }
  return result.data;
}
