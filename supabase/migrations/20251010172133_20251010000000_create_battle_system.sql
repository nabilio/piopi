/*
  # Create Battle System

  1. New Tables
    - `battles`
      - `id` (uuid, primary key)
      - `creator_id` (uuid, references profiles) - L'enfant qui crée le battle
      - `opponent_id` (uuid, references profiles) - L'ami invité
      - `status` (text) - 'pending', 'active', 'completed', 'cancelled'
      - `difficulty` (text) - 'facile', 'moyen', 'difficile'
      - `total_quizzes` (integer) - Nombre total de quiz dans le battle
      - `creator_score` (integer) - Score cumulé du créateur
      - `opponent_score` (integer) - Score cumulé de l'adversaire
      - `creator_progress` (integer) - Nombre de quiz complétés par le créateur
      - `opponent_progress` (integer) - Nombre de quiz complétés par l'adversaire
      - `winner_id` (uuid, nullable) - ID du gagnant
      - `created_at` (timestamptz)
      - `started_at` (timestamptz, nullable)
      - `completed_at` (timestamptz, nullable)

    - `battle_quizzes`
      - `id` (uuid, primary key)
      - `battle_id` (uuid, references battles)
      - `subject_id` (uuid, references subjects)
      - `activity_id` (uuid, references activities) - L'activité/quiz sélectionnée
      - `quiz_order` (integer) - Ordre du quiz dans le battle (1, 2, 3...)
      - `quiz_data` (jsonb) - Les questions du quiz générées
      - `creator_answers` (jsonb, nullable) - Réponses du créateur
      - `opponent_answers` (jsonb, nullable) - Réponses de l'adversaire
      - `creator_score` (integer, default 0)
      - `opponent_score` (integer, default 0)
      - `creator_completed_at` (timestamptz, nullable)
      - `opponent_completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view battles they're part of
    - Users can update their own progress and scores
    - Friends can view each other's battle results
*/

-- Create battles table
CREATE TABLE IF NOT EXISTS battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  difficulty text NOT NULL,
  total_quizzes integer DEFAULT 0 NOT NULL,
  creator_score integer DEFAULT 0 NOT NULL,
  opponent_score integer DEFAULT 0 NOT NULL,
  creator_progress integer DEFAULT 0 NOT NULL,
  opponent_progress integer DEFAULT 0 NOT NULL,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('facile', 'moyen', 'difficile')),
  CONSTRAINT different_players CHECK (creator_id != opponent_id)
);

-- Create battle_quizzes table
CREATE TABLE IF NOT EXISTS battle_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid REFERENCES battles(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  quiz_order integer NOT NULL,
  quiz_data jsonb NOT NULL,
  creator_answers jsonb,
  opponent_answers jsonb,
  creator_score integer DEFAULT 0 NOT NULL,
  opponent_score integer DEFAULT 0 NOT NULL,
  creator_completed_at timestamptz,
  opponent_completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_battle_quiz_order UNIQUE (battle_id, quiz_order)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_battles_creator ON battles(creator_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent ON battles(opponent_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battle_quizzes_battle ON battle_quizzes(battle_id);

-- Enable RLS
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_quizzes ENABLE ROW LEVEL SECURITY;

-- Battles policies
CREATE POLICY "Users can view battles they are part of"
  ON battles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.parent_id IS NOT NULL
      AND (p.parent_id = (SELECT parent_id FROM profiles WHERE id = creator_id)
           OR p.parent_id = (SELECT parent_id FROM profiles WHERE id = opponent_id))
    )
  );

CREATE POLICY "Users can create battles"
  ON battles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update their battles"
  ON battles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
  )
  WITH CHECK (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
  );

-- Parents can view their children's battles
CREATE POLICY "Parents can view children battles"
  ON battles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_id = auth.uid()
      AND (profiles.id = creator_id OR profiles.id = opponent_id)
    )
  );

-- Battle quizzes policies
CREATE POLICY "Users can view battle quizzes they are part of"
  ON battle_quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_quizzes.battle_id
      AND (battles.creator_id = auth.uid() OR battles.opponent_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert battle quizzes for their battles"
  ON battle_quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_quizzes.battle_id
      AND battles.creator_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update battle quiz answers"
  ON battle_quizzes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_quizzes.battle_id
      AND (battles.creator_id = auth.uid() OR battles.opponent_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM battles
      WHERE battles.id = battle_quizzes.battle_id
      AND (battles.creator_id = auth.uid() OR battles.opponent_id = auth.uid())
    )
  );

-- Parents can view their children's battle quizzes
CREATE POLICY "Parents can view children battle quizzes"
  ON battle_quizzes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM battles b
      JOIN profiles p ON (p.id = b.creator_id OR p.id = b.opponent_id)
      WHERE b.id = battle_quizzes.battle_id
      AND p.parent_id = auth.uid()
    )
  );

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_quizzes;
