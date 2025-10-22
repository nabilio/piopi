/*
  # Create quiz records table for tracking best times and scores

  1. New Tables
    - `quiz_records`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key to activities)
      - `child_id` (uuid, foreign key to profiles)
      - `best_time` (integer) - best completion time in seconds for timed quizzes
      - `best_score` (integer) - best score percentage
      - `perfect_score_count` (integer) - number of times achieved 100%
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
  2. Security
    - Enable RLS on `quiz_records` table
    - Add policy for users to read all records
    - Add policy for users to update their own records
*/

CREATE TABLE IF NOT EXISTS quiz_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  best_time integer,
  best_score integer DEFAULT 0,
  perfect_score_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, child_id)
);

ALTER TABLE quiz_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quiz records"
  ON quiz_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own records"
  ON quiz_records
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Users can update their own records"
  ON quiz_records
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);
