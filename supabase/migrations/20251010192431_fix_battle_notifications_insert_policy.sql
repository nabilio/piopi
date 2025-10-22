/*
  # Fix Battle Notifications Insert Policy

  1. Changes
    - Drop the restrictive insert policy for battle_notifications
    - Create a new policy that allows battle participants to insert notifications
    - Participants can insert notifications if they are part of the battle (creator or opponent)

  2. Security
    - Users can only insert notifications for battles they are part of
    - Prevents unauthorized users from creating fake battle notifications
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert battle notifications for their battles" ON battle_notifications;

-- Create a new policy that allows any battle participant to insert notifications
CREATE POLICY "Battle participants can insert notifications"
  ON battle_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_notifications.battle_id
      AND (battles.creator_id = auth.uid() OR battles.opponent_id = auth.uid())
    )
  );
