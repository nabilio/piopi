/*
  # Ajout rôle admin et niveaux scolaires

  1. Modifications Tables
    - `profiles`
      - Ajouter rôle 'admin' aux rôles possibles
      - Ajouter colonne `grade_level` (niveau scolaire) : CP, CE1, CE2, CM1, CM2, 6ème, etc.
      - Ajouter colonne `department` (département)
    
    - `subjects`
      - Ajouter colonne `grade_levels` (jsonb) : liste des niveaux pour cette matière
    
    - `activities`
      - Ajouter colonne `grade_level` (text) : niveau ciblé pour cette activité
    
  2. Nouvelle Table
    - `chapters` : Organisation du contenu par chapitres
      - `id` (uuid, primary key)
      - `subject_id` (uuid, référence subjects)
      - `title` (text)
      - `description` (text)
      - `grade_level` (text) : niveau scolaire ciblé
      - `order_index` (integer) : ordre d'affichage
      - `created_at` (timestamptz)

  3. Sécurité RLS
    - Seuls les admins peuvent créer/modifier subjects, chapters, activities
    - Enfants voient uniquement le contenu de leur niveau scolaire
    - Parents voient le contenu des niveaux de leurs enfants
*/

-- Modifier la contrainte de rôle pour inclure 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('parent', 'child', 'admin'));

-- Ajouter colonnes grade_level et department à profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN grade_level text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department text;
  END IF;
END $$;

-- Ajouter colonne grade_levels à subjects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subjects' AND column_name = 'grade_levels'
  ) THEN
    ALTER TABLE subjects ADD COLUMN grade_levels jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Ajouter colonne grade_level à activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'grade_level'
  ) THEN
    ALTER TABLE activities ADD COLUMN grade_level text;
  END IF;
END $$;

-- Créer la table chapters
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  grade_level text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Ajouter colonne chapter_id à activities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN chapter_id uuid REFERENCES chapters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Activer RLS sur chapters
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut voir les chapters
CREATE POLICY "Anyone authenticated can view chapters"
  ON chapters FOR SELECT
  TO authenticated
  USING (true);

-- Politique : Seuls les admins peuvent créer des chapters
CREATE POLICY "Only admins can insert chapters"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Politique : Seuls les admins peuvent modifier des chapters
CREATE POLICY "Only admins can update chapters"
  ON chapters FOR UPDATE
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

-- Politique : Seuls les admins peuvent supprimer des chapters
CREATE POLICY "Only admins can delete chapters"
  ON chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Mettre à jour les politiques activities pour les admins
DROP POLICY IF EXISTS "Only admins can insert activities" ON activities;
CREATE POLICY "Only admins can insert activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update activities" ON activities;
CREATE POLICY "Only admins can update activities"
  ON activities FOR UPDATE
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

DROP POLICY IF EXISTS "Only admins can delete activities" ON activities;
CREATE POLICY "Only admins can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Mettre à jour les politiques subjects pour les admins
DROP POLICY IF EXISTS "Only admins can insert subjects" ON subjects;
CREATE POLICY "Only admins can insert subjects"
  ON subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update subjects" ON subjects;
CREATE POLICY "Only admins can update subjects"
  ON subjects FOR UPDATE
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

DROP POLICY IF EXISTS "Only admins can delete subjects" ON subjects;
CREATE POLICY "Only admins can delete subjects"
  ON subjects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_grade_level ON chapters(grade_level);
CREATE INDEX IF NOT EXISTS idx_activities_chapter_id ON activities(chapter_id);
CREATE INDEX IF NOT EXISTS idx_activities_grade_level ON activities(grade_level);
CREATE INDEX IF NOT EXISTS idx_profiles_grade_level ON profiles(grade_level);