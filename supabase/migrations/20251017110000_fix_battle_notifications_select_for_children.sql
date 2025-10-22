/*
  # Fix Battle Notifications SELECT Policy for Children

  1. Problem
    - Parents cannot see battle notifications for their children's profiles
    - When logged in as parent and viewing child profile (Yassine), no invitations appear
    - The current policy "Users can view their own battle notifications" checks auth.uid() = user_id
    - But children don't have auth.uid(), only the parent does

  2. Solution
    - Drop and recreate the SELECT policies to ensure they work correctly
    - Ensure both direct user access AND parent access work
    - Use OR condition to allow either the user themselves OR their parent to view

  3. Security
    - Users can view their own notifications (if they have auth)
    - Parents can view all notifications for their children's profiles
    - No unauthorized access possible
*/

-- Drop existing SELECT policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own battle notifications" ON battle_notifications;
DROP POLICY IF EXISTS "Parents can view children battle notifications" ON battle_notifications;

-- Recreate comprehensive SELECT policy that handles both cases
CREATE POLICY "Users and parents can view battle notifications"
  ON battle_notifications
  FOR SELECT
  TO authenticated
  USING (
    -- Either the user is viewing their own notifications
    auth.uid() = user_id
    OR
    -- Or a parent is viewing their child's notifications
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND profiles.id = battle_notifications.user_id
    )
  );
