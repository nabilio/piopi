/*
  # Add Parent Avatar Management Policies

  1. Changes
    - Add policy allowing parents to insert avatars for their children
    - Add policy allowing parents to update avatars for their children
    - This fixes the issue where child profiles cannot update avatars when managed by parents

  2. Security
    - Parents can only manage avatars for their own children (verified via parent_id)
    - Children can still manage their own avatars
*/

-- Allow parents to insert avatars for their children
CREATE POLICY "Parents can insert children avatars"
  ON avatars FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = avatars.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Allow parents to update avatars for their children
CREATE POLICY "Parents can update children avatars"
  ON avatars FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = avatars.child_id
      AND profiles.parent_id = auth.uid()
    )
  );