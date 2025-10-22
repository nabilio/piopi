/*
  # Fix Friendships RLS for Parent-Child Relationships

  ## Changes
    - Drop existing RLS policies on friendships table
    - Create new policies that allow parents to manage friendships for their children
    - Allow users to view friendships involving them or their children
    - Allow users to create friendships for themselves or their children
    - Allow users to update/delete friendships for themselves or their children

  ## Security
    - Parents can only manage friendships for their own children (verified via parent_id)
    - Children without auth accounts can have friendships managed by their parents
    - All actions still require authentication (the parent must be logged in)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON friendships;
DROP POLICY IF EXISTS "Users can update their received requests" ON friendships;
DROP POLICY IF EXISTS "Users can delete their own friendships" ON friendships;

-- Create new policies that support parent-child relationships

-- SELECT: View own friendships or friendships of children
CREATE POLICY "Users can view friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    -- User is directly involved in the friendship
    auth.uid() = user_id OR auth.uid() = friend_id
    OR
    -- User is parent of sender
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = friendships.user_id
      AND profiles.parent_id = auth.uid()
    )
    OR
    -- User is parent of receiver
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = friendships.friend_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- INSERT: Send friend requests for self or own children
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User is sending for themselves
    auth.uid() = user_id
    OR
    -- User is sending for their child
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- UPDATE: Update received requests or children's received requests
CREATE POLICY "Users can update friend requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (
    -- User received the request
    auth.uid() = friend_id
    OR
    -- User's child received the request
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = friend_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    -- User received the request
    auth.uid() = friend_id
    OR
    -- User's child received the request
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = friend_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- DELETE: Delete own friendships or children's friendships
CREATE POLICY "Users can delete friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (
    -- User is involved
    auth.uid() = user_id OR auth.uid() = friend_id
    OR
    -- User is parent of sender
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.parent_id = auth.uid()
    )
    OR
    -- User is parent of receiver
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = friend_id
      AND profiles.parent_id = auth.uid()
    )
  );
