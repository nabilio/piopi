/*
  # Add banned field to profiles

  1. Changes
    - Add `banned` boolean column to profiles table
    - Default value is false
    - Used for user management and access control
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned boolean DEFAULT false;
  END IF;
END $$;