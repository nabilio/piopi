/*
  # Add parent view policy for activity feed

  ## Changes
    - Add RLS policy allowing parents to view their children's activity feed

  ## Security
    - Policy checks that the user is the parent of the child whose activities are being viewed
    - Uses parent_id column in profiles table to verify parent-child relationship
*/

CREATE POLICY "Parents can view children's activities"
  ON activity_feed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles
      WHERE profiles.id = activity_feed.user_id
      AND profiles.parent_id = auth.uid()
    )
  );
