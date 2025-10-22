/*
  # Add Lesson Content and Timer Fields

  1. Changes to Tables
    - Add `content` column to `chapters` table to store lesson content (cours/explications)
    - Add `objectives` and `key_points` columns to `chapters` for better structured lessons
    - Add `has_timer` column to `activities` to indicate if timer mode is available
    - Add `timer_duration` column to `activities` for recommended time limit
    - Add `timer_bonus_multiplier` column to `activities` for bonus points calculation
    
  2. Details
    - `content` (jsonb): Stores structured lesson content with sections, examples, etc.
    - `objectives` (text[]): Array of learning objectives
    - `key_points` (text[]): Array of key takeaways
    - `has_timer` (boolean): Whether the activity supports timed mode
    - `timer_duration` (integer): Recommended time in seconds for timed mode
    - `timer_bonus_multiplier` (numeric): Multiplier for bonus points (e.g., 1.5 = +50% points)
    
  3. Security
    - No RLS changes needed - existing policies cover these fields
*/

-- Add content fields to chapters
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'content'
  ) THEN
    ALTER TABLE chapters ADD COLUMN content jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'objectives'
  ) THEN
    ALTER TABLE chapters ADD COLUMN objectives text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chapters' AND column_name = 'key_points'
  ) THEN
    ALTER TABLE chapters ADD COLUMN key_points text[];
  END IF;
END $$;

-- Add timer fields to activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'has_timer'
  ) THEN
    ALTER TABLE activities ADD COLUMN has_timer boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'timer_duration'
  ) THEN
    ALTER TABLE activities ADD COLUMN timer_duration integer DEFAULT 300;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'timer_bonus_multiplier'
  ) THEN
    ALTER TABLE activities ADD COLUMN timer_bonus_multiplier numeric(3,2) DEFAULT 1.5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'completed_with_timer'
  ) THEN
    ALTER TABLE activities ADD COLUMN completed_with_timer boolean DEFAULT false;
  END IF;
END $$;

-- Add timer tracking to progress table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress' AND column_name = 'used_timer'
  ) THEN
    ALTER TABLE progress ADD COLUMN used_timer boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'progress' AND column_name = 'finished_in_time'
  ) THEN
    ALTER TABLE progress ADD COLUMN finished_in_time boolean DEFAULT false;
  END IF;
END $$;