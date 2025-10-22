/*
  # Fix Drawing Activity Trigger

  1. Changes
    - Update the create_drawing_activity() function to use 'content' instead of 'metadata'
    - The activity_feed table uses 'content' column, not 'metadata'
    - Add 'drawing_shared' to the allowed activity types
    - Add 'record_broken' which was missing from constraints

  2. Security
    - No security changes, just fixing the column name
*/

-- First, add 'drawing_shared' and 'record_broken' to allowed activity types
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_activity_type_check 
  CHECK (activity_type IN (
    'completed_quiz', 
    'completed_activity',
    'achievement_unlocked', 
    'level_up', 
    'friend_added',
    'quiz_perfect_score',
    'first_quiz_completed',
    'record_broken',
    'drawing_shared'
  ));

-- Recreate the function with correct column name
CREATE OR REPLACE FUNCTION create_drawing_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create activity if the drawing is newly shared
  IF NEW.is_shared = true AND (OLD IS NULL OR OLD.is_shared = false) THEN
    INSERT INTO activity_feed (user_id, activity_type, content, created_at)
    VALUES (
      NEW.child_id,
      'drawing_shared',
      jsonb_build_object(
        'drawing_id', NEW.id,
        'title', NEW.title
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
