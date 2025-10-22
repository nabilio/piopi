-- ====================================================================
-- CORRECTION : Vérifier et créer la colonne parent_id si nécessaire
-- ====================================================================
-- Cette migration s'assure que la colonne parent_id existe dans profiles
-- ====================================================================

-- Vérifier et ajouter la colonne parent_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'parent_id'
  ) THEN
    -- Ajouter la colonne parent_id
    ALTER TABLE profiles ADD COLUMN parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

    -- Créer un index pour améliorer les performances
    CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON profiles(parent_id);

    RAISE NOTICE 'Colonne parent_id ajoutée à la table profiles';
  ELSE
    RAISE NOTICE 'La colonne parent_id existe déjà dans la table profiles';
  END IF;
END $$;

-- ====================================================================
-- VÉRIFICATION TERMINÉE
-- ====================================================================
