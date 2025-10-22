/*
  # Mois gratuit limité aux 2 premiers enfants

  1. Changements
    - Modifier la fonction de création d'abonnement pour que le mois gratuit ne s'applique qu'aux 2 premiers enfants
    - Ajouter un champ pour suivre le nombre d'enfants éligibles au mois gratuit
    - Lors de l'ajout du 3ème enfant ou plus, pas de période d'essai gratuite

  2. Nouvelle colonne
    - `free_trial_children_count` dans la table subscriptions pour suivre combien d'enfants ont bénéficié du mois gratuit

  3. Sécurité
    - La fonction utilise SECURITY DEFINER pour avoir les droits nécessaires
*/

-- Ajouter une colonne pour suivre le nombre d'enfants qui ont bénéficié du mois gratuit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'free_trial_children_count'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN free_trial_children_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Mettre à jour les abonnements existants pour indiquer que les enfants actuels ont bénéficié du mois gratuit
UPDATE subscriptions
SET free_trial_children_count = LEAST(children_count, 2)
WHERE free_trial_children_count = 0;

-- Fonction pour vérifier si un nouvel enfant est éligible au mois gratuit
CREATE OR REPLACE FUNCTION is_eligible_for_free_trial(parent_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trial_children_count INTEGER;
BEGIN
  -- Récupérer le nombre d'enfants qui ont déjà bénéficié du mois gratuit
  SELECT COALESCE(free_trial_children_count, 0)
  INTO trial_children_count
  FROM subscriptions
  WHERE user_id = parent_user_id;

  -- Un enfant est éligible si moins de 2 enfants ont déjà bénéficié du mois gratuit
  RETURN trial_children_count < 2;
END;
$$;

-- Fonction pour incrémenter le compteur d'enfants avec mois gratuit
CREATE OR REPLACE FUNCTION increment_free_trial_children(parent_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscriptions
  SET free_trial_children_count = free_trial_children_count + 1
  WHERE user_id = parent_user_id
  AND free_trial_children_count < 2;
END;
$$;

-- Modifier la fonction de création d'abonnement pour limiter le mois gratuit aux 2 premiers enfants
CREATE OR REPLACE FUNCTION create_subscription_on_parent_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier si c'est un parent
  IF NEW.role = 'parent' THEN
    -- Créer un abonnement d'essai gratuit avec 1 enfant
    -- Le premier enfant bénéficie toujours du mois gratuit
    INSERT INTO subscriptions (
      user_id,
      status,
      trial_start_date,
      trial_end_date,
      children_count,
      plan_type,
      free_trial_children_count
    ) VALUES (
      NEW.id,
      'trial',
      NOW(),
      NOW() + INTERVAL '30 days',
      1,
      'basic',
      1  -- Le premier enfant compte dans le quota de mois gratuit
    );

    -- Enregistrer dans l'historique
    INSERT INTO subscription_history (
      user_id,
      children_count,
      price,
      plan_type,
      action_type,
      notes
    ) VALUES (
      NEW.id,
      1,
      2.00,
      'basic',
      'trial_started',
      'Essai gratuit de 30 jours créé automatiquement (1/2 enfants gratuits)'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Commentaires sur les nouvelles fonctions
COMMENT ON FUNCTION is_eligible_for_free_trial(UUID) IS 'Vérifie si un parent peut ajouter un enfant avec un mois gratuit (limité à 2 enfants)';
COMMENT ON FUNCTION increment_free_trial_children(UUID) IS 'Incrémente le compteur d''enfants ayant bénéficié du mois gratuit pour un parent';
COMMENT ON COLUMN subscriptions.free_trial_children_count IS 'Nombre d''enfants ayant bénéficié du mois gratuit (max 2)';
