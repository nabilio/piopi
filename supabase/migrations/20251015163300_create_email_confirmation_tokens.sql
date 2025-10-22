/*
  # Système de confirmation d'email avec Resend

  1. Nouvelle Table
    - `email_confirmation_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence auth.users)
      - `token` (text, unique) : token de confirmation
      - `email` (text) : email à confirmer
      - `expires_at` (timestamptz) : date d'expiration (24h)
      - `confirmed_at` (timestamptz, nullable) : date de confirmation
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur la table
    - Pas de politique SELECT (tokens secrets)
    - Fonction publique pour confirmer le token

  3. Fonction
    - `confirm_email_token(token)` : confirme l'email et met à jour le statut
*/

-- Table pour les tokens de confirmation
CREATE TABLE IF NOT EXISTS email_confirmation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_confirmation_tokens ENABLE ROW LEVEL SECURITY;

-- Pas de politique SELECT : les tokens sont secrets et gérés uniquement par les edge functions

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_token ON email_confirmation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_user_id ON email_confirmation_tokens(user_id);

-- Fonction pour confirmer un token
CREATE OR REPLACE FUNCTION confirm_email_token(confirmation_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_record email_confirmation_tokens;
  result json;
BEGIN
  -- Récupérer le token
  SELECT * INTO token_record
  FROM email_confirmation_tokens
  WHERE token = confirmation_token
    AND confirmed_at IS NULL
    AND expires_at > now();

  -- Vérifier si le token existe et est valide
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Token invalide ou expiré'
    );
  END IF;

  -- Marquer le token comme confirmé
  UPDATE email_confirmation_tokens
  SET confirmed_at = now()
  WHERE token = confirmation_token;

  -- Mettre à jour le statut de l'utilisateur dans auth.users
  -- Note: Cette partie nécessite des permissions SECURITY DEFINER
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = token_record.user_id;

  RETURN json_build_object(
    'success', true,
    'email', token_record.email
  );
END;
$$;
