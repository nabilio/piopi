/*
  # Schema pour plateforme éducative enfants

  1. Nouvelles Tables
    - `profiles` : Profils utilisateurs (parent ou enfant)
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `role` (text) : 'parent' ou 'child'
      - `full_name` (text)
      - `age` (integer, nullable pour parents)
      - `parent_id` (uuid, nullable, référence pour enfants)
      - `created_at` (timestamptz)
    
    - `avatars` : Personnalisation des avatars enfants
      - `id` (uuid, primary key)
      - `child_id` (uuid, référence profiles)
      - `character_type` (text) : type de personnage
      - `accessories` (jsonb) : accessoires débloqués
      - `updated_at` (timestamptz)
    
    - `subjects` : Matières disponibles
      - `id` (uuid, primary key)
      - `name` (text) : Maths, Français, etc.
      - `icon` (text) : nom d'icône
      - `color` (text) : couleur thématique
      - `description` (text)
    
    - `activities` : Activités éducatives
      - `id` (uuid, primary key)
      - `subject_id` (uuid, référence subjects)
      - `title` (text)
      - `type` (text) : 'quiz', 'game', 'reading', 'challenge'
      - `difficulty` (integer) : 1-5
      - `content` (jsonb) : contenu de l'activité
      - `points` (integer) : points attribués
    
    - `progress` : Suivi des progrès enfants
      - `id` (uuid, primary key)
      - `child_id` (uuid, référence profiles)
      - `activity_id` (uuid, référence activities)
      - `completed` (boolean)
      - `score` (integer)
      - `time_spent` (integer) : en secondes
      - `completed_at` (timestamptz)
    
    - `achievements` : Succès et récompenses
      - `id` (uuid, primary key)
      - `child_id` (uuid, référence profiles)
      - `title` (text)
      - `description` (text)
      - `icon` (text)
      - `unlocked_at` (timestamptz)
    
    - `coach_conversations` : Historique des conversations avec le coach
      - `id` (uuid, primary key)
      - `child_id` (uuid, référence profiles)
      - `messages` (jsonb) : tableau de messages
      - `subject` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Active RLS sur toutes les tables
    - Politiques restrictives basées sur auth.uid()
    - Parents peuvent voir données de leurs enfants
    - Enfants ne voient que leurs propres données
*/

-- Création de la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('parent', 'child')),
  full_name text NOT NULL,
  age integer,
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Parents can view their children profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles parent
      WHERE parent.id = auth.uid()
      AND parent.role = 'parent'
      AND profiles.parent_id = parent.id
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Parents can insert child profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = parent_id OR
    (auth.uid() = id AND role = 'parent')
  );

-- Création de la table avatars
CREATE TABLE IF NOT EXISTS avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_type text NOT NULL DEFAULT 'explorer',
  accessories jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id)
);

ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view own avatar"
  ON avatars FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

CREATE POLICY "Parents can view children avatars"
  ON avatars FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = avatars.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Children can update own avatar"
  ON avatars FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Children can insert own avatar"
  ON avatars FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

-- Création de la table subjects
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  description text NOT NULL
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

-- Création de la table activities
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('quiz', 'game', 'reading', 'challenge')),
  difficulty integer NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  points integer NOT NULL DEFAULT 10
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

-- Création de la table progress
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  score integer DEFAULT 0,
  time_spent integer DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view own progress"
  ON progress FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

CREATE POLICY "Parents can view children progress"
  ON progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = progress.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Children can insert own progress"
  ON progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Children can update own progress"
  ON progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

-- Création de la table achievements
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  unlocked_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view own achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

CREATE POLICY "Parents can view children achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = achievements.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "System can insert achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

-- Création de la table coach_conversations
CREATE TABLE IF NOT EXISTS coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages jsonb DEFAULT '[]'::jsonb,
  subject text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view own conversations"
  ON coach_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

CREATE POLICY "Parents can view children conversations"
  ON coach_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coach_conversations.child_id
      AND profiles.parent_id = auth.uid()
    )
  );

CREATE POLICY "Children can insert own conversations"
  ON coach_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

CREATE POLICY "Children can update own conversations"
  ON coach_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

-- Insertion des matières de base
INSERT INTO subjects (name, icon, color, description) VALUES
  ('Mathématiques', 'calculator', '#3B82F6', 'Explore le monde des nombres et des formes !'),
  ('Français', 'book-open', '#10B981', 'Améliore ta lecture et ton orthographe !'),
  ('Sciences', 'flask-conical', '#8B5CF6', 'Découvre les secrets de la nature !'),
  ('Histoire', 'landmark', '#F59E0B', 'Voyage dans le temps avec les grands héros !'),
  ('Lecture', 'book-heart', '#EC4899', 'Lis des histoires magiques et amusantes !')
ON CONFLICT DO NOTHING;

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_progress_child_id ON progress(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_activity_id ON progress(activity_id);
CREATE INDEX IF NOT EXISTS idx_achievements_child_id ON achievements(child_id);
CREATE INDEX IF NOT EXISTS idx_coach_conversations_child_id ON coach_conversations(child_id);