/*
  # Add parent update policy for child profiles

  ## Changes
    - Add RLS policy allowing parents to update their children's profiles

  ## Security
    - Policy checks that the user is the parent of the child profile being updated
    - Uses parent_id column in profiles table to verify parent-child relationship
    - Only allows updating child profiles (role = 'child')
*/

CREATE POLICY "Parents can update their children's profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    role = 'child' 
    AND parent_id = auth.uid()
  )
  WITH CHECK (
    role = 'child' 
    AND parent_id = auth.uid()
  );
