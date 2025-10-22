/*
  # Add Battle Notifications Table

  1. New Tables
    - `battle_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles) - User receiving the notification
      - `battle_id` (uuid, references battles) - The battle invitation
      - `from_user_id` (uuid, references profiles) - User who sent the invitation
      - `status` (text) - 'pending', 'accepted', 'declined'
      - `created_at` (timestamptz)
      - `read_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on battle_notifications table
    - Users can only view their own notifications
    - Users can update their own notification status
*/

-- Create battle_notifications table
CREATE TABLE IF NOT EXISTS battle_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  battle_id uuid REFERENCES battles(id) ON DELETE CASCADE NOT NULL,
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  read_at timestamptz,
  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'accepted', 'declined'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_battle_notifications_user ON battle_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_notifications_status ON battle_notifications(user_id, status);

-- Enable RLS
ALTER TABLE battle_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own battle notifications"
  ON battle_notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own battle notifications"
  ON battle_notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert battle notifications for their battles"
  ON battle_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_notifications.battle_id
      AND battles.creator_id = auth.uid()
    )
  );

-- Parents can view their children's battle notifications
CREATE POLICY "Parents can view children battle notifications"
  ON battle_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND profiles.id = battle_notifications.user_id
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE battle_notifications;
