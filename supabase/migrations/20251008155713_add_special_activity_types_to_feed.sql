/*
  # Add new activity types for special achievements

  1. Changes
    - Update activity_feed table to include new activity types:
      - record_broken: When a user breaks their best time or score record
      - mystery_unlocked: When a user unlocks a treasure/mystery quiz (every 5th quiz)
      
  2. Notes
    - Existing activity types: completed_quiz, completed_activity, achievement_unlocked, level_up, friend_added
    - New types will be used for highlighting special achievements in the social feed
*/

-- Drop existing constraint
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

-- Add new constraint with additional activity types
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_activity_type_check 
  CHECK (activity_type IN (
    'completed_quiz', 
    'completed_activity', 
    'achievement_unlocked', 
    'level_up', 
    'friend_added',
    'record_broken',
    'mystery_unlocked'
  ));
