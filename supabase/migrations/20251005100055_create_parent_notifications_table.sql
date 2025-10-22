/*
  # Create Parent Notifications System

  1. New Tables
    - `parent_notifications`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles) - The parent who receives the notification
      - `child_id` (uuid, references profiles) - The child involved in the notification
      - `sender_id` (uuid, references profiles) - The child who sent the friend request
      - `notification_type` (text) - Type of notification (friend_request, etc.)
      - `content` (jsonb) - Additional notification data
      - `is_read` (boolean) - Whether the parent has read the notification
      - `friendship_id` (uuid, references friendships) - Link to the friendship request
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `parent_notifications` table
    - Add policy for parents to view their own notifications
    - Add policy for parents to update their own notifications (mark as read, accept/reject)

  3. Important Notes
    - Parents receive notifications when someone sends a friend request to their child
    - Parents can accept or reject friend requests on behalf of their children
    - Notifications are automatically created when a child receives a friend request
*/

-- Create parent_notifications table
CREATE TABLE IF NOT EXISTS parent_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL DEFAULT 'friend_request' CHECK (notification_type IN ('friend_request', 'friend_accepted')),
  content jsonb NOT NULL DEFAULT '{}',
  is_read boolean DEFAULT false,
  friendship_id uuid REFERENCES friendships(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_id ON parent_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_child_id ON parent_notifications(child_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_is_read ON parent_notifications(is_read);

-- Enable RLS
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Parents can view their own notifications
CREATE POLICY "Parents can view their own notifications"
  ON parent_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

-- Parents can update their own notifications (mark as read)
CREATE POLICY "Parents can update their own notifications"
  ON parent_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- System can insert notifications (we'll use a function for this)
CREATE POLICY "System can insert notifications"
  ON parent_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);
