/*
  # Add story_created activity type

  1. Changes
    - Add 'story_created' and 'story_quiz' activity types to activity_feed constraint

  2. Purpose
    - Enable sharing stories in the activity feed when created
    - Track quiz completions for stories
*/

-- Drop existing constraint
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

-- Add new constraint with story activity types
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
    'story_quiz'
  ));
