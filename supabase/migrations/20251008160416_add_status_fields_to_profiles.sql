/*
  # Add status fields to profiles table

  1. Changes
    - Add `current_status` field to store user's current activity status
    - Add `status_updated_at` field to track when status was last updated
    
  2. Available Status Options
    - studying_math: User is doing math homework
    - doing_homework: User is doing general homework
    - playing_games: User is playing video games
    - reading: User is reading
    - sports: User is doing sports
    - resting: User is resting
    - null: No status set (default)
    
  3. Security
    - RLS policies already in place for profiles table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_status text CHECK (
      current_status IN ('studying_math', 'doing_homework', 'playing_games', 'reading', 'sports', 'resting')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'status_updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_updated_at timestamptz;
  END IF;
END $$;
