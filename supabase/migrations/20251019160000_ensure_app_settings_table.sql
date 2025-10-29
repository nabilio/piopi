-- Ensure app settings infrastructure exists
--
-- Table setup
-- - Create the `app_settings` table if it was missing and ensure all expected
--   columns exist with sensible defaults.
--
-- Security
-- - Enable RLS and ensure policies for admin updates and public/authenticated
--   reads exist.
--
-- Seed data
-- - Ensure a default settings row is present so the application can update it.

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  app_name text NOT NULL DEFAULT 'PioPi',
  support_email text NOT NULL DEFAULT 'support@piopi.com',
  default_trial_days integer NOT NULL DEFAULT 30,
  trial_promo_active boolean NOT NULL DEFAULT false,
  trial_promo_days integer,
  trial_promo_name text,
  trial_promo_description text,
  trial_promo_starts_at timestamptz,
  trial_promo_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS app_name text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS default_trial_days integer,
  ADD COLUMN IF NOT EXISTS trial_promo_active boolean,
  ADD COLUMN IF NOT EXISTS trial_promo_days integer,
  ADD COLUMN IF NOT EXISTS trial_promo_name text,
  ADD COLUMN IF NOT EXISTS trial_promo_description text,
  ADD COLUMN IF NOT EXISTS trial_promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_promo_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE app_settings
SET
  app_name = COALESCE(app_name, 'PioPi'),
  support_email = COALESCE(support_email, 'support@piopi.com'),
  default_trial_days = COALESCE(default_trial_days, 30),
  trial_promo_active = COALESCE(trial_promo_active, false),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE app_settings
  ALTER COLUMN app_name SET DEFAULT 'PioPi',
  ALTER COLUMN app_name SET NOT NULL,
  ALTER COLUMN support_email SET DEFAULT 'support@piopi.com',
  ALTER COLUMN support_email SET NOT NULL,
  ALTER COLUMN default_trial_days SET DEFAULT 30,
  ALTER COLUMN default_trial_days SET NOT NULL,
  ALTER COLUMN trial_promo_active SET DEFAULT false,
  ALTER COLUMN trial_promo_active SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Anyone can read app settings'
  ) THEN
    CREATE POLICY "Anyone can read app settings"
      ON app_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_settings'
      AND policyname = 'Only admins can update app settings'
  ) THEN
    CREATE POLICY "Only admins can update app settings"
      ON app_settings
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

INSERT INTO app_settings (id, app_name, support_email, default_trial_days, trial_promo_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'PioPi',
  'support@piopi.com',
  30,
  false
)
ON CONFLICT (id) DO UPDATE
SET
  app_name = EXCLUDED.app_name,
  support_email = EXCLUDED.support_email;

DO $$
DECLARE
  single_id uuid;
  settings_count integer;
BEGIN
  SELECT COUNT(*)
  INTO settings_count
  FROM app_settings;

  IF settings_count = 1 THEN
    SELECT id
    INTO single_id
    FROM app_settings
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    IF single_id IS NOT NULL AND single_id <> '00000000-0000-0000-0000-000000000001' THEN
      UPDATE app_settings
      SET id = '00000000-0000-0000-0000-000000000001'
      WHERE id = single_id;
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
