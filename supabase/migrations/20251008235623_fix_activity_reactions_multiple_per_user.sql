/*
  # Fix Activity Reactions - Allow Multiple Reactions Per User

  1. Changes
    - Drop the old unique constraint on (user_id, activity_id)
    - Add new unique constraint on (user_id, activity_id, reaction_type)
    - This allows users to add multiple different reaction types on the same activity
    - Prevents duplicate reactions of the same type from the same user

  2. Impact
    - Users can now add multiple reactions (like, love, celebrate, etc.) on the same post
    - Each user can toggle their own reactions on/off individually
    - Multiple users can react independently without conflicts
*/

-- Drop the old unique constraint
ALTER TABLE activity_reactions DROP CONSTRAINT IF EXISTS activity_reactions_user_id_activity_id_key;

-- Add new unique constraint allowing multiple reactions per user
ALTER TABLE activity_reactions ADD CONSTRAINT activity_reactions_user_activity_type_unique 
  UNIQUE(user_id, activity_id, reaction_type);
