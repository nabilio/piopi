/*
  # Add Battle Response Notification Types

  1. Changes
    - Add 'battle_accepted' and 'battle_declined' notification types to battle_notifications
    - These notifications are sent from the invited player to the battle creator
    - Allow users to see notifications they received about their battle invitations

  2. Notes
    - battle_accepted: When an invited player accepts the battle invitation
    - battle_declined: When an invited player declines the battle invitation
*/

-- The notification_type column in battle_notifications already exists as text,
-- so it can accept any string value including 'battle_accepted' and 'battle_declined'
-- No schema changes needed, just documenting the new notification types
