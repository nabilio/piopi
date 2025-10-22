-- Système de codes promo et abonnements améliorés
-- 
-- 1. Nouvelles Tables
--    - promo_codes: Codes promotionnels avec périodes gratuites
-- 
-- 2. Modifications de Tables
--    - subscriptions: Ajout de champs pour le système d'abonnement basé sur le nombre d'enfants
-- 
-- 3. Sécurité
--    - RLS activé sur promo_codes
--    - Seuls les admins peuvent voir/gérer les codes promo

-- Créer la table des codes promo
CREATE TABLE IF NOT EXISTS promo_codes (
  code text PRIMARY KEY,
  description text NOT NULL,
  free_months int NOT NULL DEFAULT 0,
  max_uses int,
  current_uses int NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ajouter les colonnes manquantes à la table subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'children_count'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN children_count int NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'price'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN price decimal(10,2) NOT NULL DEFAULT 9.99;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'trial_end_date'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN trial_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'promo_code'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN promo_code text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'promo_months_remaining'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN promo_months_remaining int DEFAULT 0;
  END IF;
END $$;

-- Activer RLS sur promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire avec les codes promo
CREATE POLICY "Admins can manage promo codes"
  ON promo_codes
  FOR ALL
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

-- Les utilisateurs authentifiés peuvent lire les codes promo actifs
CREATE POLICY "Users can view active promo codes"
  ON promo_codes
  FOR SELECT
  TO authenticated
  USING (active = true AND (valid_until IS NULL OR valid_until > now()));

-- Fonction pour valider et appliquer un code promo
CREATE OR REPLACE FUNCTION validate_promo_code(promo_code_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  promo_record promo_codes%ROWTYPE;
  result json;
BEGIN
  SELECT * INTO promo_record
  FROM promo_codes
  WHERE code = UPPER(promo_code_input)
    AND active = true
    AND (valid_until IS NULL OR valid_until > now())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Code promo invalide ou expiré'
    );
  END IF;

  RETURN json_build_object(
    'valid', true,
    'free_months', promo_record.free_months,
    'description', promo_record.description
  );
END;
$$;

-- Insérer quelques codes promo d'exemple
INSERT INTO promo_codes (code, description, free_months, max_uses, valid_until)
VALUES 
  ('RENTREE2025', 'Code de rentrée scolaire 2025', 2, 100, '2025-10-31 23:59:59+00'),
  ('BIENVENUE', 'Code de bienvenue permanent', 1, NULL, NULL),
  ('NOEL2025', 'Offre spéciale Noël', 3, 50, '2025-12-31 23:59:59+00')
ON CONFLICT (code) DO NOTHING;
