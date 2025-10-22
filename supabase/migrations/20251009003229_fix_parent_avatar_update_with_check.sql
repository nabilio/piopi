/*
  # Fix Parent Avatar Update Policy

  1. Changes
    - Drop and recreate the parent update policy with proper WITH CHECK clause
    - This ensures parents can actually update avatar data

  2. Security
    - Parents can only update avatars for their own children
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Parents can update children avatars" ON avatars;

-- Recreate with proper WITH CHECK
CREATE POLICY "Parents can update children avatars"
  ON avatars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = avatars.child_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = avatars.child_id
      AND profiles.parent_id = auth.uid()
    )
  );