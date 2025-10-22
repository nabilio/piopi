/*
  # Ajout du Type de Notification 'rejected_by_parent'

  1. Modifications
    - Ajouter 'rejected_by_parent' aux types de notifications acceptés dans friend_request_notifications
    - Permet aux parents de notifier les enfants quand une demande d'ami est refusée

  2. Notes
    - Cette modification permet une meilleure communication avec les enfants
    - Les enfants seront informés de toutes les décisions de leurs parents
*/

-- Modifier la contrainte CHECK pour ajouter 'rejected_by_parent'
ALTER TABLE friend_request_notifications 
  DROP CONSTRAINT IF EXISTS friend_request_notifications_notification_type_check;

ALTER TABLE friend_request_notifications
  ADD CONSTRAINT friend_request_notifications_notification_type_check 
  CHECK (notification_type IN ('pending_approval', 'accepted_by_parent', 'rejected_by_parent'));
