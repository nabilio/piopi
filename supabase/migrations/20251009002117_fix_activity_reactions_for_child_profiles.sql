/*
  # Fix Activity Reactions RLS for Child Profiles

  1. Problem
    - Current policies only allow users to manage reactions where user_id = auth.uid()
    - When a parent views a child profile, profile.id is the child but auth.uid() is the parent
    - This causes RLS violations when inserting/deleting reactions

  2. Solution
    - Update INSERT policy to allow parents to add reactions on behalf of their children
    - Update DELETE policy to allow parents to delete reactions on behalf of their children
    - Keep existing policies for direct user access

  3. Security
    - Parents can only manage reactions for their own children
    - Users can still manage their own reactions directly
    - All reactions remain visible to everyone (read-only)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can add their own reactions" ON activity_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON activity_reactions;

-- New INSERT policy: Allow users to add their own reactions OR parents to add reactions for their children
CREATE POLICY "Users and parents can add reactions"
  ON activity_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- New DELETE policy: Allow users to delete their own reactions OR parents to delete reactions for their children
CREATE POLICY "Users and parents can delete reactions"
  ON activity_reactions
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.parent_id = auth.uid()
    )
  );
