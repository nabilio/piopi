/*
  # Ensure parent_id column exists in profiles table

  1. Changes
    - Add parent_id column to profiles table if it doesn't exist
    - This column links child profiles to their parent

  2. Notes
    - Uses DO block to check if column exists before adding
    - Safe to run multiple times
*/

-- Add parent_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
