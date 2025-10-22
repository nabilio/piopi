/*
  # Fix Generation Status Grade Level Constraint

  1. Changes
    - Make `grade_level` column nullable in `generation_status` table
    - This allows tracking generation progress for all levels at once
    
  2. Reasoning
    - When generating content for all levels, we need a global status entry
    - Individual level generations can still specify their grade_level
*/

ALTER TABLE generation_status 
ALTER COLUMN grade_level DROP NOT NULL;
