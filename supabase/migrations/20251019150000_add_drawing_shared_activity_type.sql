/*
  # Add drawing_shared activity type back

  1. Changes
    - Add 'drawing_shared' back to activity_feed constraint
    - This was removed accidentally in a previous migration

  2. Purpose
    - Enable sharing drawings in the activity feed
*/

-- Drop existing constraint
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

-- Add new constraint with all activity types including drawing_shared
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_activity_type_check
  CHECK (activity_type IN (
    'completed_quiz',
    'completed_activity',
    'achievement_unlocked',
    'level_up',
    'friend_added',
    'record_broken',
    'mystery_unlocked',
    'battle_started',
    'battle_won',
    'battle_lost',
    'battle_draw',
    'story_created',
    'story_quiz',
    'drawing_shared'
  ));
