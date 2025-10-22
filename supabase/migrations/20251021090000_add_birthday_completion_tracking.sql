/*
  # Add birthday completion tracking and invitations support

  1. Changes
    - Ensure child profiles have birthday metadata columns (birthday, birthday_completed)
    - Backfill birthday_completed based on existing birthday values
    - Create birthday_party_invitations table to track party invitations for children

  2. Security
    - Enable RLS on birthday_party_invitations
    - Parents can view and respond to invitations for their children
    - Children can view invitations they receive or host
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birthday date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birthday_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birthday_completed boolean DEFAULT false;
    UPDATE profiles
      SET birthday_completed = true
      WHERE birthday IS NOT NULL
        AND birthday_completed IS DISTINCT FROM true;
    ALTER TABLE profiles ALTER COLUMN birthday_completed SET DEFAULT false;
    ALTER TABLE profiles ALTER COLUMN birthday_completed SET NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS birthday_party_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  host_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  location text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE birthday_party_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Children can view their birthday invitations"
  ON birthday_party_invitations
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid()
    OR host_child_id = auth.uid()
  );

CREATE POLICY IF NOT EXISTS "Parents can view invitations for their children"
  ON birthday_party_invitations
  FOR SELECT
  TO authenticated
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
    OR host_child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY IF NOT EXISTS "Parents can respond to invitations for their children"
  ON birthday_party_invitations
  FOR UPDATE
  TO authenticated
  USING (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  )
  WITH CHECK (
    child_id IN (
      SELECT id FROM profiles
      WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY IF NOT EXISTS "Children can manage invitations they host"
  ON birthday_party_invitations
  FOR ALL
  USING (host_child_id = auth.uid())
  WITH CHECK (host_child_id = auth.uid());

UPDATE profiles
  SET birthday_completed = true
  WHERE birthday IS NOT NULL
    AND birthday_completed IS DISTINCT FROM true;

UPDATE profiles
  SET birthday_completed = false
  WHERE birthday IS NULL
    AND birthday_completed IS DISTINCT FROM false;
