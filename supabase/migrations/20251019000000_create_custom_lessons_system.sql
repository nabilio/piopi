/*
  # Create Custom Lessons System

  1. New Tables
    - `custom_lessons`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles)
      - `child_id` (uuid, references profiles)
      - `subject` (text) - Free text subject name
      - `title` (text) - Lesson title
      - `grade_level` (text) - Grade level
      - `content` (text) - Lesson content
      - `quiz_data` (jsonb) - Quiz questions and answers
      - `is_published` (boolean) - Whether visible to child
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `custom_lesson_generation_limits`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles)
      - `child_id` (uuid, references profiles)
      - `date` (date) - Generation date
      - `generation_count` (integer) - Number of generations today
      - `created_at` (timestamptz)

    - `custom_lesson_progress`
      - `id` (uuid, primary key)
      - `lesson_id` (uuid, references custom_lessons)
      - `child_id` (uuid, references profiles)
      - `quiz_score` (integer) - Score on quiz
      - `quiz_total` (integer) - Total questions
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Parents can manage their own custom lessons
    - Children can view published lessons assigned to them
    - Parents can view their children's progress
*/

-- Create custom_lessons table
CREATE TABLE IF NOT EXISTS custom_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  grade_level text NOT NULL,
  content text NOT NULL,
  quiz_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_lessons ENABLE ROW LEVEL SECURITY;

-- Parents can manage lessons for their children
CREATE POLICY "Parents can insert lessons for their children"
  ON custom_lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = parent_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their lessons"
  ON custom_lessons FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update their lessons"
  ON custom_lessons FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can delete their lessons"
  ON custom_lessons FOR DELETE
  TO authenticated
  USING (auth.uid() = parent_id);

-- Children can view published lessons assigned to them
CREATE POLICY "Children can view published lessons"
  ON custom_lessons FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid()
    AND is_published = true
  );

-- Create custom_lesson_generation_limits table
CREATE TABLE IF NOT EXISTS custom_lesson_generation_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  generation_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, child_id, date)
);

ALTER TABLE custom_lesson_generation_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their generation limits"
  ON custom_lesson_generation_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert generation limits"
  ON custom_lesson_generation_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update their generation limits"
  ON custom_lesson_generation_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Create custom_lesson_progress table
CREATE TABLE IF NOT EXISTS custom_lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES custom_lessons(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_score integer NOT NULL,
  quiz_total integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE custom_lesson_progress ENABLE ROW LEVEL SECURITY;

-- Children can insert their own progress
CREATE POLICY "Children can insert their progress"
  ON custom_lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

-- Children can view their own progress
CREATE POLICY "Children can view their progress"
  ON custom_lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

-- Parents can view their children's progress
CREATE POLICY "Parents can view children progress"
  ON custom_lesson_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = child_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_lessons_parent_id ON custom_lessons(parent_id);
CREATE INDEX IF NOT EXISTS idx_custom_lessons_child_id ON custom_lessons(child_id);
CREATE INDEX IF NOT EXISTS idx_custom_lesson_limits_parent_date ON custom_lesson_generation_limits(parent_id, child_id, date);
CREATE INDEX IF NOT EXISTS idx_custom_lesson_progress_lesson ON custom_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_custom_lesson_progress_child ON custom_lesson_progress(child_id);
