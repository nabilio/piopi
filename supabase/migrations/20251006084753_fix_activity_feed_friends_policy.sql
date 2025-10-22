/*
  # Fix activity feed friends policy

  1. Changes
    - Drop and recreate the "Users can view friends' activities" policy
    - Fix the policy to check status = 'accepted' for BOTH conditions
    
  2. Security
    - Ensures users can only see activities from accepted friends
    - Previous policy had a bug where one condition didn't check accepted status
*/

DROP POLICY IF EXISTS "Users can view friends' activities" ON activity_feed;

CREATE POLICY "Users can view friends' activities"
  ON activity_feed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = activity_feed.user_id AND friendships.status = 'accepted')
        OR
        (friendships.friend_id = auth.uid() AND friendships.user_id = activity_feed.user_id AND friendships.status = 'accepted')
      )
    )
  );
