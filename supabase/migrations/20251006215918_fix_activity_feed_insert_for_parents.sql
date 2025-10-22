/*
  # Fix activity_feed INSERT policy for parents viewing child profiles

  1. Changes
    - Add new INSERT policy to allow parents to insert activity feed entries for their children
    - This fixes the issue where parents viewing a child profile cannot post quiz completions
  
  2. Security
    - Policy checks that the parent_id of the child matches auth.uid()
    - Only parents can insert activity feed for their own children
*/

-- Add policy to allow parents to insert activity feed for their children
CREATE POLICY "Parents can insert activity feed for children"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = activity_feed.user_id
      AND profiles.parent_id = auth.uid()
    )
  );
