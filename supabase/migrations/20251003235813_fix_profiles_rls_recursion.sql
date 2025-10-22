/*
  # Fix RLS recursion issue in profiles table

  1. Changes
    - Drop the problematic "Parents can view their children profiles" policy
    - Create a simpler policy that allows viewing profiles where the user is the parent
    - This avoids the infinite recursion by not doing a self-referential subquery

  2. Security
    - Users can still view their own profile
    - Parents can view their children's profiles using parent_id
    - No security is compromised by this change
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Parents can view their children profiles" ON profiles;

-- Create a simpler policy without recursion
CREATE POLICY "Parents can view children profiles by parent_id"
  ON profiles FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());