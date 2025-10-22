/*
  # Allow Parents to Delete Their Children's Drawings

  1. Changes
    - Add RLS policy to allow parents to delete drawings created by their children
    - This enables parents to help manage their children's content

  2. Security
    - Parents can only delete drawings for profiles that have their ID as parent_id
    - Parents cannot delete drawings from other people's children
*/

-- Allow parents to delete their children's drawings
CREATE POLICY "Parents can delete children drawings"
  ON drawings
  FOR DELETE
  TO authenticated
  USING (
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
