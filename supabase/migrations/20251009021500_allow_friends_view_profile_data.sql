/*
  # Allow Friends to View Profile Data

  1. Changes
    - Add policies to allow friends to view each other's progress data
    - Add policies to allow friends to view each other's achievements

  2. Security
    - Only friends can view each other's data
    - Requires an accepted friendship in the friendships table
    - Data remains private to non-friends
*/

-- Allow friends to view each other's progress
CREATE POLICY "Friends can view friends progress"
  ON progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.status = 'accepted'
      AND (
        (friendships.user_id = auth.uid() AND friendships.friend_id = progress.child_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = progress.child_id)
      )
    )
  );

-- Allow friends to view each other's achievements
CREATE POLICY "Friends can view friends achievements"
  ON achievements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.status = 'accepted'
      AND (
        (friendships.user_id = auth.uid() AND friendships.friend_id = achievements.child_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = achievements.child_id)
      )
    )
  );
