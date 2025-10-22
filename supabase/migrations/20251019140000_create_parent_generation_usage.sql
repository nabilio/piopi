/*
  # Système Anti-Abus de Génération de Contenu

  1. Nouvelle Table
    - `parent_generation_usage` - Suivi des générations par parent (pas par enfant)
      - `id` (uuid, primary key)
      - `parent_id` (uuid, foreign key to profiles)
      - `generation_date` (date) - Date de la génération (sans heure)
      - `generation_type` (text) - Type: 'custom_lesson' ou 'story'
      - `count` (integer) - Nombre de générations ce jour
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `parent_generation_usage`
    - Les parents peuvent voir uniquement leurs propres compteurs
    - Système automatique d'incrémentation

  3. Fonctionnalités
    - Compte les générations par parent et par jour
    - Empêche l'abus via suppression/recréation d'enfants
    - Reset automatique chaque jour (via date)

  4. Limites
    - Custom lessons: variable selon plan
    - Stories: variable selon plan
    - Le compteur est lié au parent_id, pas au child_id
*/

-- Créer la table parent_generation_usage
CREATE TABLE IF NOT EXISTS parent_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_date date NOT NULL DEFAULT CURRENT_DATE,
  generation_type text NOT NULL CHECK (generation_type IN ('custom_lesson', 'story')),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, generation_date, generation_type)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_parent_generation_usage_parent_date
  ON parent_generation_usage(parent_id, generation_date);

CREATE INDEX IF NOT EXISTS idx_parent_generation_usage_type
  ON parent_generation_usage(generation_type);

-- Enable RLS
ALTER TABLE parent_generation_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Les parents peuvent voir leurs propres compteurs
CREATE POLICY "Parents can view own generation usage"
  ON parent_generation_usage FOR SELECT
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Système peut insérer pour les parents
CREATE POLICY "System can insert generation usage"
  ON parent_generation_usage FOR INSERT
  TO authenticated
  WITH CHECK (
    parent_id = auth.uid()
    OR parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Système peut mettre à jour les compteurs
CREATE POLICY "System can update generation usage"
  ON parent_generation_usage FOR UPDATE
  TO authenticated
  USING (
    parent_id = auth.uid()
    OR parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    parent_id = auth.uid()
    OR parent_id IN (SELECT parent_id FROM profiles WHERE id = auth.uid())
  );

-- Fonction pour incrémenter le compteur de génération
CREATE OR REPLACE FUNCTION increment_generation_count(
  p_parent_id uuid,
  p_generation_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Insérer ou mettre à jour le compteur
  INSERT INTO parent_generation_usage (parent_id, generation_date, generation_type, count)
  VALUES (p_parent_id, CURRENT_DATE, p_generation_type, 1)
  ON CONFLICT (parent_id, generation_date, generation_type)
  DO UPDATE SET
    count = parent_generation_usage.count + 1,
    updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Fonction pour obtenir le compteur du jour
CREATE OR REPLACE FUNCTION get_generation_count_today(
  p_parent_id uuid,
  p_generation_type text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count INTO v_count
  FROM parent_generation_usage
  WHERE parent_id = p_parent_id
    AND generation_date = CURRENT_DATE
    AND generation_type = p_generation_type;

  RETURN COALESCE(v_count, 0);
END;
$$;
