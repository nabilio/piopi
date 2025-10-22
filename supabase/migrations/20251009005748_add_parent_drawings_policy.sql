/*
  # Allow Parents to Create Drawings for Their Children

  1. Changes
    - Add RLS policy to allow parents to create drawings for their children
    - This enables parents to help young children create and share drawings

  2. Security
    - Parents can only create drawings for profiles that have their ID as parent_id
    - Parents cannot create drawings for other people's children
*/

-- Allow parents to create drawings for their children
CREATE POLICY "Parents can create drawings for children"
  ON drawings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
      AND parent_profile.role = 'parent'
      AND EXISTS (
        SELECT 1 FROM profiles child_profile
        WHERE child_profile.id = drawings.child_id
        AND child_profile.parent_id = parent_profile.id
      )
    )
  );
