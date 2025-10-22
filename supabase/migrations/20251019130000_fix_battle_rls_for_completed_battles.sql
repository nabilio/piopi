/*
  # Fix Battle RLS for Completed Battles

  1. Problem
    - Parents and children cannot view completed battles
    - RLS policies may be too restrictive for completed battles
    - "Battle introuvable" error when clicking on completed battles

  2. Solution
    - Drop and recreate the main SELECT policy to ensure it works for all statuses
    - Simplify the logic to make it clearer
    - Ensure completed battles are accessible to participants and their parents

  3. Security
    - Only participants (creator_id, opponent_id) can view battles
    - Parents of participants can view their children's battles
    - Siblings can view each other's battles (same parent_id)
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view battles they are part of" ON battles;
DROP POLICY IF EXISTS "Parents can view children battles" ON battles;

-- Create comprehensive SELECT policy for battles
CREATE POLICY "Users can view battles they participate in"
  ON battles
  FOR SELECT
  TO authenticated
  USING (
    -- User is directly a participant
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
    -- User is a parent of one of the participants
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND (profiles.id = battles.creator_id OR profiles.id = battles.opponent_id)
    )
    -- User is a child viewing sibling's battle (same parent)
    OR EXISTS (
      SELECT 1 FROM profiles my_profile
      WHERE my_profile.id = auth.uid()
      AND my_profile.parent_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM profiles sibling
        WHERE sibling.parent_id = my_profile.parent_id
        AND (sibling.id = battles.creator_id OR sibling.id = battles.opponent_id)
      )
    )
  );
