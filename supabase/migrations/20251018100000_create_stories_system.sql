/*
  # Create Stories System

  1. New Tables
    - `stories`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references profiles)
      - `title` (text)
      - `theme` (text) - Adventure, Friendship, Magic, School, etc.
      - `description` (text) - User's input description
      - `content` (text) - Generated story content
      - `grade_level` (text) - Child's grade level
      - `created_by` (uuid) - User who created it (parent or child)
      - `is_approved` (boolean) - For parent-created stories
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `story_quiz`
      - `id` (uuid, primary key)
      - `story_id` (uuid, references stories)
      - `questions` (jsonb) - Quiz questions and answers
      - `created_at` (timestamptz)

    - `story_attempts`
      - `id` (uuid, primary key)
      - `story_id` (uuid, references stories)
      - `child_id` (uuid, references profiles)
      - `score` (integer)
      - `total_questions` (integer)
      - `answers` (jsonb)
      - `completed_at` (timestamptz)

    - `daily_story_limit`
      - `id` (uuid, primary key)
      - `child_id` (uuid, references profiles)
      - `date` (date)
      - `count` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Children can view their own stories and create up to 3 per day
    - Parents can view and create stories for their children
    - Parents can approve stories before children see them
*/

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  theme text NOT NULL,
  description text NOT NULL,
  content text NOT NULL,
  grade_level text NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view their approved stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid() AND is_approved = true
  );

CREATE POLICY "Parents can view their children's stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = stories.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Children can create their own stories"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    child_id = auth.uid() AND created_by = auth.uid()
  );

CREATE POLICY "Parents can create stories for their children"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = stories.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update their children's stories"
  ON stories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = stories.child_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = stories.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Create story_quiz table
CREATE TABLE IF NOT EXISTS story_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  questions jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE story_quiz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view quiz for their stories"
  ON story_quiz
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_quiz.story_id
      AND stories.child_id = auth.uid()
      AND stories.is_approved = true
    )
  );

CREATE POLICY "Parents can view quiz for their children's stories"
  ON story_quiz
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      JOIN profiles ON profiles.id = stories.child_id
      WHERE stories.id = story_quiz.story_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create quiz for accessible stories"
  ON story_quiz
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_quiz.story_id
      AND (
        stories.child_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = stories.child_id
          AND profiles.parent_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Parents can update quiz for their children's stories"
  ON story_quiz
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      JOIN profiles ON profiles.id = stories.child_id
      WHERE stories.id = story_quiz.story_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      JOIN profiles ON profiles.id = stories.child_id
      WHERE stories.id = story_quiz.story_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Create story_attempts table
CREATE TABLE IF NOT EXISTS story_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  answers jsonb NOT NULL,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE story_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view their own attempts"
  ON story_attempts
  FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

CREATE POLICY "Parents can view their children's attempts"
  ON story_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = story_attempts.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Children can create their own attempts"
  ON story_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (child_id = auth.uid());

CREATE POLICY "Parents can create attempts for their children"
  ON story_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = story_attempts.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Create daily_story_limit table
CREATE TABLE IF NOT EXISTS daily_story_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(child_id, date)
);

ALTER TABLE daily_story_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view their own limits"
  ON daily_story_limit
  FOR SELECT
  TO authenticated
  USING (child_id = auth.uid());

CREATE POLICY "Parents can view their children's limits"
  ON daily_story_limit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_story_limit.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert their own limits"
  ON daily_story_limit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    child_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_story_limit.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can update their own limits"
  ON daily_story_limit
  FOR UPDATE
  TO authenticated
  USING (
    child_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_story_limit.child_id
      AND profiles.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    child_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_story_limit.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

-- Create function to check and update daily limit
CREATE OR REPLACE FUNCTION check_daily_story_limit(p_child_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count INTO v_count
  FROM daily_story_limit
  WHERE child_id = p_child_id
  AND date = CURRENT_DATE;

  IF v_count IS NULL THEN
    INSERT INTO daily_story_limit (child_id, date, count)
    VALUES (p_child_id, CURRENT_DATE, 1);
    RETURN true;
  ELSIF v_count < 3 THEN
    UPDATE daily_story_limit
    SET count = count + 1
    WHERE child_id = p_child_id
    AND date = CURRENT_DATE;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_child_id ON stories(child_id);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_quiz_story_id ON story_quiz(story_id);
CREATE INDEX IF NOT EXISTS idx_story_attempts_child_id ON story_attempts(child_id);
CREATE INDEX IF NOT EXISTS idx_story_attempts_story_id ON story_attempts(story_id);
CREATE INDEX IF NOT EXISTS idx_daily_story_limit_child_date ON daily_story_limit(child_id, date);
