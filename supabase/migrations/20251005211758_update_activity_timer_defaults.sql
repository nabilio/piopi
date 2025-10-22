/*
  # Update Activity Timer Defaults

  1. Changes
    - Reduce default timer duration from 300 seconds (5 min) to 180 seconds (3 min)
    - This makes the chrono mode more challenging and exciting
    - Updates all existing activities without timer to use the new default
  
  2. Notes
    - More questions (10 instead of 5) with less time creates better engagement
    - Bonus points system remains the same (1.5x multiplier)
*/

-- Update the default timer duration for future activities
ALTER TABLE activities 
  ALTER COLUMN timer_duration SET DEFAULT 180;

-- Update existing activities that are using the old default (300)
UPDATE activities 
SET timer_duration = 180 
WHERE timer_duration = 300 OR timer_duration IS NULL;
