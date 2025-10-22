/*
  # Supprimer la création automatique d'abonnement

  1. Changements
    - Supprimer le trigger qui crée automatiquement un abonnement
    - Supprimer la fonction associée

  2. Raison
    - L'utilisateur doit pouvoir choisir son plan (1, 2, ou 3 enfants)
    - L'abonnement sera créé uniquement via PlanSelection.tsx
*/

-- Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_create_subscription_on_parent_signup ON profiles;

-- Supprimer la fonction
DROP FUNCTION IF EXISTS create_subscription_on_parent_signup();
