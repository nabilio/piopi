/*
  # Add DELETE policy for profiles table

  1. Changes
    - Add policy to allow service role to delete profiles
    - This is needed for the delete-user edge function to work properly

  2. Security
    - Only service role can delete profiles (enforced by edge function logic)
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Service role can delete profiles" ON profiles;

-- Allow service role to delete profiles
CREATE POLICY "Service role can delete profiles"
  ON profiles
  FOR DELETE
  TO service_role
  USING (true);
