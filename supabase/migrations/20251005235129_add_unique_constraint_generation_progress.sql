/*
  # Add Unique Constraint on Generation Type

  1. Changes
    - Add unique constraint on generation_type to allow upsert operations
    - This ensures only one active progress record per generation type
*/

-- Drop existing records to avoid conflicts
DELETE FROM bulk_generation_progress;

-- Add unique constraint
ALTER TABLE bulk_generation_progress 
  ADD CONSTRAINT unique_generation_type UNIQUE (generation_type);
