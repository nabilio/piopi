/*
  # Allow Parents to Update Children's Battles and Notifications

  1. Changes
    - Add policy allowing parents to update their children's battles
    - Add policy allowing parents to update their children's battle notifications
    - Particularly important for declining invitations on behalf of children

  2. Security
    - Parents can only update battles where their children are participants
    - Parents can only update their children's battle notifications
    - Maintains data integrity by checking parent_id relationship
*/

-- Allow parents to update their children's battles (including declining invitations)
CREATE POLICY "Parents can update children battles"
  ON battles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND (profiles.id = creator_id OR profiles.id = opponent_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND (profiles.id = creator_id OR profiles.id = opponent_id)
    )
  );

-- Allow parents to update their children's battle notifications
CREATE POLICY "Parents can update children battle notifications"
  ON battle_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND profiles.id = battle_notifications.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND profiles.id = battle_notifications.user_id
    )
  );
