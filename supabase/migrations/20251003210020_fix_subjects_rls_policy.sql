/*
  # Correction des politiques RLS pour les matières

  1. Modifications
    - Supprime l'ancienne politique restrictive sur `subjects`
    - Ajoute une nouvelle politique permettant à tous (authentifiés et anonymes) de lire les matières
    - Les matières sont des données publiques que tout le monde devrait pouvoir voir

  2. Raison
    - Les utilisateurs connectés ne pouvaient pas voir les matières
    - Les matières sont du contenu public, pas des données sensibles
*/

-- Supprime l'ancienne politique sur subjects
DROP POLICY IF EXISTS "Anyone authenticated can view subjects" ON subjects;

-- Crée une nouvelle politique permettant à tous de voir les matières
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  TO public
  USING (true);

-- Même correction pour activities (doivent être visibles par tous les utilisateurs connectés)
DROP POLICY IF EXISTS "Anyone authenticated can view activities" ON activities;

CREATE POLICY "Anyone can view activities"
  ON activities FOR SELECT
  TO public
  USING (true);
