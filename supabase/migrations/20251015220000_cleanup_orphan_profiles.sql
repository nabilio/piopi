/*
  # Cleanup Orphan Profiles

  1. Changes
    - Delete profiles that don't have a corresponding user in auth.users
    - This fixes the "User not found" error when trying to delete children

  2. Security
    - Admin operation only, no RLS changes needed
*/

-- Delete profiles where the user doesn't exist in auth.users
DELETE FROM profiles
WHERE id NOT IN (
  SELECT id FROM auth.users
);
