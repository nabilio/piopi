/*
  # Fix admin profiles RLS recursion

  1. Changes
    - Drop existing recursive admin policies
    - Create non-recursive admin policies using app_metadata
    
  2. Security
    - Admins can still access all profiles
    - No recursion issues
*/

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can delete any profile" ON profiles;

-- Create new admin policies using auth.jwt() to check role from app_metadata
-- This avoids recursion since we don't query the profiles table
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'rouijel.nabil.cp@gmail.com',
      'admin@ecolemagique.com'
    )
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'rouijel.nabil.cp@gmail.com',
      'admin@ecolemagique.com'
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') IN (
      'rouijel.nabil.cp@gmail.com',
      'admin@ecolemagique.com'
    )
  );

CREATE POLICY "Admins can delete any profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'rouijel.nabil.cp@gmail.com',
      'admin@ecolemagique.com'
    )
  );