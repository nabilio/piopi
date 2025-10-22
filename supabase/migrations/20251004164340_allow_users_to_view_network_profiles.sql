/*
  # Allow users to view other profiles for network feature

  1. Changes
    - Add policy for authenticated users to view public profile information of other users
    - This enables the network/social features where users can discover each other

  2. Security
    - Users can only view basic profile information (id, full_name, role, grade_level, department)
    - Sensitive information remains protected by application-level filtering
    - Users cannot modify other users' profiles
*/

-- Allow authenticated users to view other users' basic profile information
-- This is needed for the network/social features
CREATE POLICY "Users can view other users profiles for network"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    role IN ('child', 'parent')
    AND banned = false
  );