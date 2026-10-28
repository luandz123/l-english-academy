/**
 * Danh sách key cấu hình công khai không nhạy cảm (khách / học viên được đọc).
 * Tham chiếu RLS policy trong supabase/migrations/20261023_platform_settings_public_read.sql:
 * "Public read for non-sensitive platform settings"
 */
export const PUBLIC_SETTING_KEYS = [
  'homepage_showcase_config',
  'game_vocab_packs',
  'platform_name',
  'tagline',
  'primary_color',
  'accent_color',
  'contact_email',
  'contact_phone',
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];

export const SETTING_KEY_REGEX = /^[a-z0-9_]{1,64}$/;
