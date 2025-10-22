/*
  # Fix child profiles schema to allow profiles without auth accounts

  1. Changes
    - Drop foreign key constraint on profiles.id referencing auth.users
    - Make profiles.id auto-generate UUIDs
    - Make email optional for child profiles
    
  2. Security
    - Existing RLS policies remain in place
    - Parents can create child profiles via existing policy
*/

-- Drop the foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Set default for id column to auto-generate UUIDs
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Make email optional (for children without auth accounts)
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;