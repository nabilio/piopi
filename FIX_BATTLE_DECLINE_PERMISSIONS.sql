-- ========================================
-- FIX: Allow Parents to Decline Battle Invitations
-- ========================================
--
-- PROBLEM: Parents cannot decline battle invitations on behalf of their children
-- CAUSE: RLS policies only allow the child (user_id) to update, not their parent
--
-- SOLUTION: Add policies allowing parents to update battles and notifications
--           for their children
--
-- HOW TO APPLY:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ========================================

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
