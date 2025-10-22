/*
  # Add Last Visit Timestamps for Notifications

  1. Changes
    - Add `last_battle_hub_visit` (timestamptz) to profiles
    - Add `last_stories_visit` (timestamptz) to profiles
    - Add `last_custom_lessons_visit` (timestamptz) to profiles

  2. Purpose
    - Track when users last visited each section to show new content badges
    - Used to calculate notification counts on home page cards
*/

-- Add last visit timestamp columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_battle_hub_visit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_battle_hub_visit timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_stories_visit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_stories_visit timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_custom_lessons_visit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_custom_lessons_visit timestamptz;
  END IF;
END $$;
