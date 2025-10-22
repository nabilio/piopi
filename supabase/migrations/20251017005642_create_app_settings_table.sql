/*
  # Create app settings table

  1. New Tables
    - `app_settings`
      - `id` (uuid, primary key) - Single row for settings
      - `logo_url` (text, nullable) - URL to custom logo
      - `app_name` (text) - Application name
      - `support_email` (text) - Support email address
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `app_settings` table
    - Allow all authenticated users to read settings
    - Only admin users can update settings

  3. Initial Data
    - Insert default settings with app_name "PioPi"
*/

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  app_name text NOT NULL DEFAULT 'PioPi',
  support_email text NOT NULL DEFAULT 'support@piopi.com',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

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

INSERT INTO app_settings (id, app_name, support_email)
VALUES ('00000000-0000-0000-0000-000000000001', 'PioPi', 'support@piopi.com')
ON CONFLICT (id) DO NOTHING;
