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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'app_settings'
  ) THEN
    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS default_trial_days integer
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ALTER COLUMN default_trial_days SET DEFAULT 30
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_active boolean
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ALTER COLUMN trial_promo_active SET DEFAULT false
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_days integer
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_name text
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_description text
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_starts_at timestamptz
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ADD COLUMN IF NOT EXISTS trial_promo_ends_at timestamptz
    $$;

    EXECUTE $$
      UPDATE app_settings
      SET
        default_trial_days = COALESCE(default_trial_days, 30),
        trial_promo_active = COALESCE(trial_promo_active, false)
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ALTER COLUMN default_trial_days SET NOT NULL
    $$;

    EXECUTE $$
      ALTER TABLE IF EXISTS app_settings
        ALTER COLUMN trial_promo_active SET NOT NULL
    $$;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'app_settings'
        AND policyname = 'Public can read app settings'
    ) THEN
      EXECUTE $$
        CREATE POLICY "Public can read app settings"
          ON app_settings
          FOR SELECT
          TO public
          USING (true)
      $$;
    END IF;
  ELSE
    RAISE NOTICE 'app_settings table missing; skipping trial promotion migration until table exists.';
  END IF;
END $$;
