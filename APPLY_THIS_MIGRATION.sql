/*
  # MIGRATION URGENTE - Ajouter la colonne is_published

  INSTRUCTIONS:
  1. Copiez ce code SQL
  2. Allez sur votre Supabase Dashboard
  3. Cliquez sur "SQL Editor" dans le menu de gauche
  4. Collez ce code et cliquez sur "Run"

  Cette migration ajoute la colonne is_published qui permet de gérer
  les brouillons d'histoires que les parents peuvent modifier avant publication.
*/

-- Ajouter la colonne is_published
ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;

-- Mettre à jour les histoires existantes pour les marquer comme publiées
UPDATE stories SET is_published = true WHERE is_published IS NULL OR is_published = false;

-- Mettre à jour la politique RLS pour les enfants
DROP POLICY IF EXISTS "Children can view their approved stories" ON stories;

CREATE POLICY "Children can view their published stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid() AND is_published = true
  );

-- Mettre à jour la politique du quiz pour les enfants
DROP POLICY IF EXISTS "Children can view quiz for their stories" ON story_quiz;

CREATE POLICY "Children can view quiz for their published stories"
  ON story_quiz
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_quiz.story_id
      AND stories.child_id = auth.uid()
      AND stories.is_published = true
    )
  );
