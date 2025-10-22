/*
  # Create failed generations tracking table

  1. New Tables
    - `failed_generations`
      - `id` (uuid, primary key)
      - `generation_type` (text) - 'lesson' or 'quiz'
      - `subject_name` (text)
      - `grade_level` (text)
      - `chapter_title` (text, nullable)
      - `quiz_difficulty` (text, nullable)
      - `quiz_number` (integer, nullable)
      - `error_message` (text)
      - `retry_count` (integer) - number of retries attempted
      - `last_attempt_at` (timestamptz)
      - `created_at` (timestamptz)
      - `retried_successfully_at` (timestamptz, nullable)
      
  2. Security
    - Enable RLS on `failed_generations` table
    - Add policy for authenticated users to read all failures
    - Add policy for authenticated users to insert failures
    - Add policy for authenticated users to update their retries
*/

CREATE TABLE IF NOT EXISTS failed_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_type text NOT NULL CHECK (generation_type IN ('lesson', 'quiz')),
  subject_name text NOT NULL,
  grade_level text NOT NULL,
  chapter_title text,
  quiz_difficulty text,
  quiz_number integer,
  error_message text NOT NULL,
  retry_count integer DEFAULT 3 NOT NULL,
  last_attempt_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  retried_successfully_at timestamptz
);

ALTER TABLE failed_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all failed generations"
  ON failed_generations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert failed generations"
  ON failed_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update failed generations"
  ON failed_generations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete failed generations"
  ON failed_generations
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_failed_generations_type ON failed_generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_failed_generations_retried ON failed_generations(retried_successfully_at) WHERE retried_successfully_at IS NULL;