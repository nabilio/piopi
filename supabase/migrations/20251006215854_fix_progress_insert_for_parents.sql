/*
  # Fix progress INSERT policy for parents viewing child profiles

  1. Changes
    - Add new INSERT policy to allow parents to insert progress for their children
    - This fixes the issue where parents viewing a child profile cannot save quiz progress
  
  2. Security
    - Policy checks that the parent_id of the child matches auth.uid()
    - Only parents can insert progress for their own children
*/

-- Add policy to allow parents to insert progress for their children
CREATE POLICY "Parents can insert progress for children"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = progress.child_id
      AND profiles.parent_id = auth.uid()
    )
  );
