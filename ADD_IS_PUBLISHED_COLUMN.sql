/*
  # Add is_published field to stories table

  1. Changes
    - Add `is_published` boolean column to `stories` table
    - Default value is `false` for new stories (draft mode)
    - Existing stories are automatically published (set to `true`)

  2. Notes
    - Parents create stories in draft mode
    - They can edit content and quiz before publishing
    - Only published stories are visible to children

  INSTRUCTIONS:
  1. Go to your Supabase Dashboard
  2. Navigate to SQL Editor
  3. Copy and paste this entire script
  4. Click "Run" to execute
*/

-- Add is_published column with default false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE stories ADD COLUMN is_published boolean DEFAULT false;

    -- Set existing stories as published
    UPDATE stories SET is_published = true WHERE is_published IS NULL;
  END IF;
END $$;

-- Update RLS policies to use is_published instead of is_approved for children
DROP POLICY IF EXISTS "Children can view their approved stories" ON stories;

CREATE POLICY "Children can view their published stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid() AND is_published = true
  );

-- Update story_quiz policy to use is_published
DROP POLICY IF EXISTS "Children can view quiz for their stories" ON story_quiz;

CREATE POLICY "Children can view quiz for their published stories"
  ON story_quiz
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_quiz.story_id
      AND stories.child_id = auth.uid()
      AND stories.is_published = true
    )
  );
