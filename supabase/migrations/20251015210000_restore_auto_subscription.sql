/*
  # Restaurer la création automatique d'abonnement

  1. Changements
    - Recréer la fonction qui crée automatiquement un abonnement lors de l'inscription parent
    - Recréer le trigger associé
    - L'abonnement démarre avec 1 enfant en essai gratuit de 30 jours

  2. Sécurité
    - La fonction est exécutée avec les droits de sécurité du défini (SECURITY DEFINER)
*/

-- Recréer la fonction de création automatique d'abonnement
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
    INSERT INTO subscriptions (
      user_id,
      status,
      trial_start_date,
      trial_end_date,
      children_count,
      plan_type
    ) VALUES (
      NEW.id,
      'trial',
      NOW(),
      NOW() + INTERVAL '30 days',
      1,
      'monthly'
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
      'monthly',
      'trial_started',
      'Essai gratuit de 30 jours créé automatiquement'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Recréer le trigger
DROP TRIGGER IF EXISTS trigger_create_subscription_on_parent_signup ON profiles;

CREATE TRIGGER trigger_create_subscription_on_parent_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'parent')
  EXECUTE FUNCTION create_subscription_on_parent_signup();
