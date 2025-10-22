/*
  # Enable Realtime on Avatars Table

  1. Changes
    - Enable Realtime subscriptions on the avatars table
    - This allows AvatarDisplay components to receive live updates when avatars are modified

  2. Details
    - When a user updates their avatar, all instances of AvatarDisplay showing that avatar will update immediately
    - Improves user experience by eliminating the need to refresh the page
*/

ALTER PUBLICATION supabase_realtime ADD TABLE avatars;
