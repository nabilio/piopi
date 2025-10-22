/*
  # Add Generation Progress Persistence

  1. New Table
    - `bulk_generation_progress`
      - `id` (uuid, primary key)
      - `generation_type` (text) - 'lessons' or 'quizzes'
      - `current_level` (text)
      - `current_level_index` (integer)
      - `total_levels` (integer)
      - `current_subject` (text, nullable)
      - `current_subject_index` (integer, nullable)
      - `total_subjects` (integer, nullable)
      - `is_running` (boolean, default false)
      - `is_paused` (boolean, default false)
      - `started_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `bulk_generation_progress` table
    - Only admins can read/write generation progress
*/

CREATE TABLE IF NOT EXISTS bulk_generation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_type text NOT NULL CHECK (generation_type IN ('lessons', 'quizzes')),
  current_level text DEFAULT '',
  current_level_index integer DEFAULT 0,
  total_levels integer DEFAULT 0,
  current_subject text,
  current_subject_index integer,
  total_subjects integer,
  is_running boolean DEFAULT false,
  is_paused boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bulk_generation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage generation progress"
  ON bulk_generation_progress
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bulk_generation_progress_type 
  ON bulk_generation_progress(generation_type);
