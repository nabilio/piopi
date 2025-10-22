/*
  # Modification du Système de Demande d'Ami

  1. Nouvelles Tables
    - `friend_request_notifications` : Notifications de demandes d'ami
      - `id` (uuid, primary key)
      - `friendship_id` (uuid) : Référence à la demande d'ami
      - `recipient_child_id` (uuid) : Enfant qui reçoit la demande
      - `sender_child_id` (uuid) : Enfant qui envoie la demande
      - `notification_type` (text) : 'pending_approval', 'accepted_by_parent'
      - `is_read` (boolean)
      - `created_at` (timestamptz)

  2. Modifications
    - Ajouter `requires_parent_approval` (boolean) aux friendships
    - Permet de distinguer les demandes en attente de validation parent

  3. Sécurité
    - Les enfants peuvent voir leurs notifications
    - Les parents peuvent voir les notifications de leurs enfants
    - Seuls les parents peuvent accepter/refuser les demandes d'ami
*/

-- Ajouter le champ requires_parent_approval aux friendships
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'friendships' AND column_name = 'requires_parent_approval'
  ) THEN
    ALTER TABLE friendships ADD COLUMN requires_parent_approval boolean DEFAULT true;
  END IF;
END $$;

-- Table des notifications de demande d'ami
CREATE TABLE IF NOT EXISTS friend_request_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  friendship_id uuid NOT NULL REFERENCES friendships(id) ON DELETE CASCADE,
  recipient_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('pending_approval', 'accepted_by_parent')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE friend_request_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Children can view their own friend request notifications"
  ON friend_request_notifications FOR SELECT
  TO authenticated
  USING (
    recipient_child_id = auth.uid()
    OR sender_child_id = auth.uid()
  );

CREATE POLICY "Parents can view friend request notifications for their children"
  ON friend_request_notifications FOR SELECT
  TO authenticated
  USING (
    recipient_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
    OR sender_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY "Children can create friend request notifications"
  ON friend_request_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_child_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'child'
    )
  );

CREATE POLICY "Children and parents can update notifications"
  ON friend_request_notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_child_id = auth.uid()
    OR sender_child_id = auth.uid()
    OR recipient_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
    OR sender_child_id IN (
      SELECT id FROM profiles WHERE parent_id = auth.uid() AND role = 'child'
    )
  );
