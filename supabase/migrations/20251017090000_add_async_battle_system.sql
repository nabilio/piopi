/*
  # Système de Battles Asynchrones

  1. Modifications Table `battles`
    - Ajout `play_mode` (text) - 'live' ou 'async'
    - Ajout `invitation_expires_at` (timestamptz) - Expiration invite à 24h
    - Ajout `creator_started_at` (timestamptz) - Quand le créateur commence
    - Ajout `opponent_started_at` (timestamptz) - Quand l'adversaire commence
    - Ajout `forfeit_reason` (text) - Raison du forfait si applicable
    - Ajout `is_solo_victory` (boolean) - Victoire en solo si adversaire n'accepte pas

  2. Modifications Table `battle_participants`
    - Ajout `forfeit_at` (timestamptz) - Timestamp du forfait
    - Ajout `last_activity_at` (timestamptz) - Dernière activité pour détecter déco

  3. Nouvelle Table `battle_invitation_cooldowns`
    - Tracking des cooldowns pour éviter le spam d'invitations

  4. Règles Implémentées
    - Si adversaire n'accepte pas en 24h → victoire solo créateur
    - Si déco > 2min en live → bascule async (10min pour finir)
    - Si pas terminé après timeout → forfait
    - Cooldown 60s après 3 refus/expirations
*/

-- Add new columns to battles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'play_mode'
  ) THEN
    ALTER TABLE battles ADD COLUMN play_mode text DEFAULT 'live' NOT NULL;
    ALTER TABLE battles ADD CONSTRAINT valid_play_mode CHECK (play_mode IN ('live', 'async'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'invitation_expires_at'
  ) THEN
    ALTER TABLE battles ADD COLUMN invitation_expires_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'creator_started_at'
  ) THEN
    ALTER TABLE battles ADD COLUMN creator_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'opponent_started_at'
  ) THEN
    ALTER TABLE battles ADD COLUMN opponent_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'forfeit_reason'
  ) THEN
    ALTER TABLE battles ADD COLUMN forfeit_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'is_solo_victory'
  ) THEN
    ALTER TABLE battles ADD COLUMN is_solo_victory boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add new columns to battle_participants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_participants' AND column_name = 'forfeit_at'
  ) THEN
    ALTER TABLE battle_participants ADD COLUMN forfeit_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battle_participants' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE battle_participants ADD COLUMN last_activity_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create battle invitation cooldowns table
CREATE TABLE IF NOT EXISTS battle_invitation_cooldowns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cooldown_until timestamptz NOT NULL,
  refusal_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_cooldown UNIQUE (user_id, target_user_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_cooldowns_user ON battle_invitation_cooldowns(user_id);
CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON battle_invitation_cooldowns(cooldown_until);

-- Enable RLS
ALTER TABLE battle_invitation_cooldowns ENABLE ROW LEVEL SECURITY;

-- Cooldowns policies
CREATE POLICY "Users can view their own cooldowns"
  ON battle_invitation_cooldowns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cooldowns"
  ON battle_invitation_cooldowns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cooldowns"
  ON battle_invitation_cooldowns
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to set invitation expiration (24h from creation)
CREATE OR REPLACE FUNCTION set_battle_invitation_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invitation_expires_at IS NULL AND NEW.status = 'pending' THEN
    NEW.invitation_expires_at := NEW.created_at + INTERVAL '24 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set expiration
DROP TRIGGER IF EXISTS trigger_set_battle_invitation_expiration ON battles;
CREATE TRIGGER trigger_set_battle_invitation_expiration
  BEFORE INSERT ON battles
  FOR EACH ROW
  EXECUTE FUNCTION set_battle_invitation_expiration();

-- Function to check and mark expired invitations as solo victories
CREATE OR REPLACE FUNCTION check_expired_battle_invitations()
RETURNS void AS $$
BEGIN
  UPDATE battles
  SET
    status = 'completed',
    is_solo_victory = true,
    winner_id = creator_id,
    completed_at = now(),
    forfeit_reason = 'Adversaire n''a pas accepté dans les 24h'
  WHERE
    status = 'pending'
    AND invitation_expires_at < now()
    AND is_solo_victory = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle battle forfeit
CREATE OR REPLACE FUNCTION handle_battle_forfeit(
  p_battle_id uuid,
  p_user_id uuid,
  p_reason text
)
RETURNS void AS $$
DECLARE
  v_battle record;
BEGIN
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  -- Mark participant as forfeited
  UPDATE battle_participants
  SET
    forfeit_at = now(),
    status = 'declined'
  WHERE battle_id = p_battle_id AND child_id = p_user_id;

  -- Determine winner (the one who didn't forfeit)
  UPDATE battles
  SET
    status = 'completed',
    winner_id = CASE
      WHEN p_user_id = creator_id THEN opponent_id
      ELSE creator_id
    END,
    completed_at = now(),
    forfeit_reason = p_reason
  WHERE id = p_battle_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
