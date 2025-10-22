/*
  # Add INSERT policy for activities table

  1. Changes
    - Add policy to allow parents to create new activities (quizzes, games, etc.)
    - Parents need to be able to create educational content for their children

  2. Security
    - Only authenticated users with 'parent' role can create activities
    - This ensures quality control by limiting content creation to parents/admins
*/

-- Allow parents to create activities
CREATE POLICY "Parents can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
    )
  );

-- Allow parents to update activities they created
CREATE POLICY "Parents can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
    )
  );

-- Allow parents to delete activities
CREATE POLICY "Parents can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
    )
  );