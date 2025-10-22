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
