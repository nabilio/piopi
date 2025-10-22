/*
  # Add INSERT policy for activity_feed table
  
  1. Changes
    - Add policy to allow users to insert their own activities to activity_feed
    
  2. Security
    - Users can only insert activities for themselves (auth.uid() = user_id)
*/

DROP POLICY IF EXISTS "Users can insert own activities" ON activity_feed;

CREATE POLICY "Users can insert own activities"
  ON activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
