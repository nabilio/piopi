/*
  # Système d'Anniversaire et Statuts Personnalisés

  1. Nouvelles Tables
    - `custom_statuses` : Statuts personnalisables par les admins
    - `birthday_wishes` : Messages d'anniversaire des amis
    - `quiz_battles` : Batailles de quiz multijoueurs
    - `quiz_battle_participants` : Participants aux batailles

  2. Modifications
    - Ajouter `birthday` (date) à `profiles` (pour les enfants)
    - Ajouter `custom_status_id` (uuid, nullable) à `profiles`

  3. Sécurité
    - RLS activé sur toutes les nouvelles tables
    - Admins peuvent gérer les statuts personnalisés
    - Parents peuvent voir les anniversaires de leurs enfants
    - Enfants peuvent voir les batailles et participer
*/

-- Table des statuts personnalisés (doit être créée en premier)
CREATE TABLE IF NOT EXISTS custom_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emoji text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

ALTER TABLE custom_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view custom statuses"
  ON custom_statuses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage custom statuses"
  ON custom_statuses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Ajouter les champs d'anniversaire et statut personnalisé aux profils
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birthday date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'custom_status_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN custom_status_id uuid REFERENCES custom_statuses(id);
  END IF;
END $$;

-- Table des messages d'anniversaire
CREATE TABLE IF NOT EXISTS birthday_wishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  birthday_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_template text NOT NULL,
  virtual_gift text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE birthday_wishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view wishes for themselves"
  ON birthday_wishes FOR SELECT
  TO authenticated
  USING (
    birthday_child_id = auth.uid()
    OR sender_child_id = auth.uid()
  );

CREATE POLICY "Parents can view wishes for their children"
  ON birthday_wishes FOR SELECT
  TO authenticated
  USING (
    birthday_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
    OR sender_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY "Children can send birthday wishes to friends"
  ON birthday_wishes FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (user_id = sender_child_id AND friend_id = birthday_child_id)
        OR (user_id = birthday_child_id AND friend_id = sender_child_id)
      )
      AND status = 'accepted'
    )
  );

-- Table des batailles de quiz (sans RLS pour le moment)
CREATE TABLE IF NOT EXISTS quiz_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  host_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed')),
  max_participants integer NOT NULL CHECK (max_participants BETWEEN 2 AND 4),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Table des participants aux batailles (sans RLS pour le moment)
CREATE TABLE IF NOT EXISTS quiz_battle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES quiz_battles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  time_seconds integer,
  joined_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(battle_id, child_id)
);

-- Activer RLS et ajouter les politiques après création des tables
ALTER TABLE quiz_battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view battles they're involved in"
  ON quiz_battles FOR SELECT
  TO authenticated
  USING (
    host_child_id = auth.uid()
    OR id IN (
      SELECT battle_id FROM quiz_battle_participants
      WHERE child_id = auth.uid()
    )
  );

CREATE POLICY "Children can create quiz battles"
  ON quiz_battles FOR INSERT
  TO authenticated
  WITH CHECK (
    host_child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY "Host can update their battles"
  ON quiz_battles FOR UPDATE
  TO authenticated
  USING (host_child_id = auth.uid());

ALTER TABLE quiz_battle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view participants in battles they're in"
  ON quiz_battle_participants FOR SELECT
  TO authenticated
  USING (
    battle_id IN (
      SELECT id FROM quiz_battles
      WHERE host_child_id = auth.uid()
      OR id IN (
        SELECT battle_id FROM quiz_battle_participants
        WHERE child_id = auth.uid()
      )
    )
  );

CREATE POLICY "Children can join battles"
  ON quiz_battle_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY "Participants can update their own results"
  ON quiz_battle_participants FOR UPDATE
  TO authenticated
  USING (child_id = auth.uid());

-- Créer quelques statuts par défaut
INSERT INTO custom_statuses (emoji, label) VALUES
  ('😊', 'Content'),
  ('🎉', 'En fête'),
  ('📚', 'En étude'),
  ('🎮', 'En jeu'),
  ('🏃', 'Actif'),
  ('😴', 'Fatigué'),
  ('🌟', 'Motivé'),
  ('🤔', 'Concentré')
ON CONFLICT DO NOTHING;
