/*
  # Allow Friends to View All Profile Data

  1. Changes
    - Add policies to allow friends to view each other's quiz records
    - Add policies to allow friends to view each other's drawings
    - These complete the friend viewing permissions

  2. Security
    - Only friends can view each other's data
    - Requires an accepted friendship in the friendships table
    - Data remains private to non-friends
*/

-- Allow friends to view each other's quiz records
CREATE POLICY "Friends can view friends quiz records"
  ON quiz_records
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.status = 'accepted'
      AND (
        (friendships.user_id = auth.uid() AND friendships.friend_id = quiz_records.child_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = quiz_records.child_id)
      )
    )
  );

-- Allow friends to view each other's drawings
CREATE POLICY "Friends can view friends drawings"
  ON drawings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE friendships.status = 'accepted'
      AND (
        (friendships.user_id = auth.uid() AND friendships.friend_id = drawings.child_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = drawings.child_id)
      )
    )
  );
