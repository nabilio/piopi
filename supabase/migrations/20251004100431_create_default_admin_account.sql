/*
  # Créer un compte administrateur par défaut

  1. Modifications
    - Crée un profil admin par défaut dans la table profiles
    - Email: admin@ecolemagique.fr
    - Mot de passe: Admin123!

  2. Notes
    - Ce compte doit être créé manuellement via l'interface Supabase Auth
    - Cette migration met à jour le profil pour lui donner le rôle admin
*/

-- Note: L'utilisateur doit d'abord être créé via Supabase Auth Dashboard
-- Ensuite, vous pouvez exécuter cette requête pour mettre à jour son rôle:

-- Pour mettre à jour un utilisateur existant en admin, utilisez cette requête:
-- UPDATE profiles SET role = 'admin' WHERE email = 'votre-email@example.com';

-- Cette migration ajoute juste une fonction helper pour faciliter la création d'admins
CREATE OR REPLACE FUNCTION make_user_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles 
  SET role = 'admin', onboarding_completed = true
  WHERE email = user_email;
END;
$$;
