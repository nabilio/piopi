/*
  # Ajout des champs d'onboarding au profil

  1. Modifications
    - Ajout de `username` (text, unique) : nom d'utilisateur
    - Ajout de `school_level` (text) : niveau scolaire (CP, CE1, CE2, CM1, CM2, 6ème, etc.)
    - Ajout de `department` (text) : département français (01-95)
    - Ajout de `school_name` (text) : nom de l'école
    - Ajout de `onboarding_completed` (boolean) : indique si l'onboarding est terminé

  2. Notes
    - Ces champs sont principalement pour les enfants
    - Les champs sont optionnels pour permettre une création initiale du profil
*/

-- Ajout des nouveaux champs à la table profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'school_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN school_level text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'department'
  ) THEN
    ALTER TABLE profiles ADD COLUMN department text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'school_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN school_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;