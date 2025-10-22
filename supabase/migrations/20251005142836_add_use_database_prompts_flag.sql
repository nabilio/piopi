/*
  # Add activation flag for database prompts

  1. Changes
    - Add `is_active` boolean column to prompts_config table
    - Default is FALSE to keep current behavior (use hardcoded prompts)
    - When TRUE, the edge function will use the database prompt instead

  2. Security
    - No RLS changes needed (already restricted to admins)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prompts_config' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE prompts_config ADD COLUMN is_active boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add a comment to explain the column
COMMENT ON COLUMN prompts_config.is_active IS 'When true, the edge function uses this database prompt instead of the hardcoded one';