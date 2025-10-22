/*
  # Création de la table subscription_history

  1. Nouvelle table
    - `subscription_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `children_count` (integer) - Nombre d'enfants
      - `price` (decimal) - Prix mensuel
      - `plan_type` (text) - Type de plan (monthly/yearly)
      - `action_type` (text) - Type d'action (created, updated, cancelled, renewed)
      - `action_date` (timestamptz) - Date de l'action
      - `notes` (text, nullable) - Notes additionnelles
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `subscription_history` table
    - Ajouter des policies pour permettre aux parents de voir leur propre historique
*/

-- Create subscription_history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  children_count integer NOT NULL DEFAULT 1,
  price decimal(10,2) NOT NULL,
  plan_type text NOT NULL DEFAULT 'monthly',
  action_type text NOT NULL CHECK (action_type IN ('created', 'updated', 'cancelled', 'renewed', 'trial_started', 'child_added', 'child_removed')),
  action_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own subscription history
CREATE POLICY "Users can view own subscription history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for system to insert subscription history
CREATE POLICY "System can insert subscription history"
  ON subscription_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_action_date ON subscription_history(action_date DESC);
