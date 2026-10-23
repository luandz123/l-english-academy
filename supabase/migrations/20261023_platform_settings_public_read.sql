-- Migration: Allow public/student read access to non-sensitive platform settings
-- and ensure admins have explicit manage permissions (WITH CHECK)

-- 1. Ensure Admins have full access with both USING and WITH CHECK
DROP POLICY IF EXISTS "Settings viewable by admins" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;

CREATE POLICY "Admins manage platform settings"
  ON public.platform_settings
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Allow public read for non-sensitive platform settings (homepage showcase, game vocab packs, branding)
DROP POLICY IF EXISTS "Public read for non-sensitive platform settings" ON public.platform_settings;

CREATE POLICY "Public read for non-sensitive platform settings"
  ON public.platform_settings
  FOR SELECT
  USING (
    key IN (
      'homepage_showcase_config',
      'game_vocab_packs',
      'platform_name',
      'tagline',
      'primary_color',
      'accent_color',
      'contact_email',
      'contact_phone'
    )
  );
