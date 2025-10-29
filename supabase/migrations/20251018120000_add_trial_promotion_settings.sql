-- Add trial promotion configuration
--
-- New columns
-- - Adds global trial configuration fields to the `app_settings` table so
--   admins can configure default trial duration and timed promotions from
--   the admin panel.
--
-- Policies
-- - Allow public (unauthenticated) read access to `app_settings` so the
--   marketing pages and registration flow can display accurate trial
--   information.

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS default_trial_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trial_promo_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_promo_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_promo_name text,
  ADD COLUMN IF NOT EXISTS trial_promo_description text,
  ADD COLUMN IF NOT EXISTS trial_promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_promo_ends_at timestamptz;

-- Ensure existing rows have sensible defaults
UPDATE app_settings
SET
  default_trial_days = COALESCE(default_trial_days, 30),
  trial_promo_active = COALESCE(trial_promo_active, false);

-- Allow public (non authenticated) users to read app settings so the
-- marketing/registration pages can adapt messaging.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Public can read app settings'
  ) THEN
    CREATE POLICY "Public can read app settings"
      ON app_settings
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;
