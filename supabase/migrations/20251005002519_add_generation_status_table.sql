/*
  # Add Generation Status Table

  1. New Tables
    - `generation_status`
      - `id` (uuid, primary key)
      - `grade_level` (text)
      - `status` (text: pending, generating, completed, error)
      - `progress` (integer: 0-100)
      - `message` (text)
      - `subjects_count` (integer)
      - `chapters_count` (integer)
      - `quizzes_count` (integer)
      - `started_at` (timestamp)
      - `completed_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `generation_status` table
    - Add policy for authenticated users to read
    - Add policy for admins to insert/update
*/

CREATE TABLE IF NOT EXISTS generation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress integer DEFAULT 0,
  message text,
  subjects_count integer DEFAULT 0,
  chapters_count integer DEFAULT 0,
  quizzes_count integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE generation_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read generation status"
  ON generation_status FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert generation status"
  ON generation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update generation status"
  ON generation_status FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
