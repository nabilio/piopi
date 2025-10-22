/*
  # Create Rewards and Quiz Progression System

  1. New Tables
    - `rewards` - Stores available badges and avatars
    - `user_rewards` - Tracks rewards earned by users
    - `quiz_progression` - Tracks quiz progress within a lesson
  
  2. Changes
    - Rewards can be badges or special avatars
    - Users earn rewards based on points thresholds
    - Each lesson can have multiple quizzes (5-6) forming a progression path
    - Progress is tracked per quiz and per lesson
  
  3. Security
    - Enable RLS on all tables
    - Users can view all rewards but only modify their own earned rewards
    - Progress tracking is user-specific
*/

-- Create rewards table
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('badge', 'avatar')),
  name text NOT NULL,
  description text,
  icon text,
  image_url text,
  points_required integer NOT NULL DEFAULT 0,
  rarity text CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rewards"
  ON rewards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage rewards"
  ON rewards FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create user_rewards table
CREATE TABLE IF NOT EXISTS user_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  is_equipped boolean DEFAULT false,
  UNIQUE(user_id, reward_id)
);

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON user_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert rewards"
  ON user_rewards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create quiz_progression table
CREATE TABLE IF NOT EXISTS quiz_progression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  quiz_number integer NOT NULL,
  completed boolean DEFAULT false,
  score integer DEFAULT 0,
  max_score integer DEFAULT 100,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

ALTER TABLE quiz_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz progression"
  ON quiz_progression FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz progression"
  ON quiz_progression FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz progression"
  ON quiz_progression FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add some default rewards
INSERT INTO rewards (type, name, description, icon, points_required, rarity) VALUES
  ('badge', 'Premier Pas', 'Complete ton premier quiz', '🌟', 0, 'common'),
  ('badge', 'Étoile Montante', 'Gagne 100 points', '⭐', 100, 'common'),
  ('badge', 'Champion', 'Gagne 500 points', '🏆', 500, 'rare'),
  ('badge', 'Génie', 'Gagne 1000 points', '🧠', 1000, 'epic'),
  ('badge', 'Légende', 'Gagne 5000 points', '👑', 5000, 'legendary'),
  ('avatar', 'Robot Bleu', 'Avatar spécial robot', '🤖', 200, 'rare'),
  ('avatar', 'Licorne Magique', 'Avatar légendaire licorne', '🦄', 1000, 'epic'),
  ('avatar', 'Dragon de Feu', 'Avatar mythique dragon', '🐉', 2500, 'legendary')
ON CONFLICT DO NOTHING;
