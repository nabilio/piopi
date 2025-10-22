/*
  # Fix quiz_progression RLS policies for parent-child access
  
  1. Changes
    - Update INSERT policy to allow parents to insert quiz progression for their children
    - Update SELECT policy to allow parents to view their children's quiz progression
    - Update UPDATE policy to allow parents to update their children's quiz progression
    
  2. Security
    - Parents can only manage quiz progression for their own children
    - Children can still manage their own quiz progression
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own quiz progression" ON quiz_progression;
DROP POLICY IF EXISTS "Users can insert own quiz progression" ON quiz_progression;
DROP POLICY IF EXISTS "Users can update own quiz progression" ON quiz_progression;

-- Create new policies that support parent-child access
CREATE POLICY "Users and parents can view quiz progression"
  ON quiz_progression
  FOR SELECT
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

CREATE POLICY "Users and parents can insert quiz progression"
  ON quiz_progression
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

CREATE POLICY "Users and parents can update quiz progression"
  ON quiz_progression
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_id 
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = user_id 
      AND profiles.parent_id = auth.uid()
    )
  );
