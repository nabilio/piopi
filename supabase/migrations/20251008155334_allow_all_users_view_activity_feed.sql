/*
  # Allow all authenticated users to view all activities in activity_feed

  1. Changes
    - Drop the existing "Users can view friends' activities" policy
    - Create a new policy that allows all authenticated users to view all activities
    
  2. Security
    - All authenticated users can view all activities (public feed)
    - Users still need to be authenticated to view
*/

DROP POLICY IF EXISTS "Users can view friends' activities" ON activity_feed;

CREATE POLICY "Authenticated users can view all activities"
  ON activity_feed
  FOR SELECT
  TO authenticated
  USING (true);
