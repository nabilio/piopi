/*
  # Create Activity Reactions Table

  1. New Tables
    - `activity_reactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles) - User who reacted
      - `activity_id` (uuid, references activity_feed) - Activity being reacted to
      - `reaction_type` (text) - Type of reaction (like, love, celebrate, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `activity_reactions` table
    - Add policies for authenticated users to:
      - View all reactions
      - Add their own reactions
      - Delete their own reactions

  3. Indexes
    - Add index on activity_id for faster queries
    - Add unique constraint on (user_id, activity_id) to prevent duplicate reactions from same user
*/

-- Create activity_reactions table
CREATE TABLE IF NOT EXISTS activity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES activity_feed(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'support', 'applaud')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, activity_id)
);

-- Enable RLS
ALTER TABLE activity_reactions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS activity_reactions_activity_id_idx ON activity_reactions(activity_id);
CREATE INDEX IF NOT EXISTS activity_reactions_user_id_idx ON activity_reactions(user_id);

-- Policies for authenticated users to view all reactions
CREATE POLICY "Users can view all reactions"
  ON activity_reactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for authenticated users to add their own reactions
CREATE POLICY "Users can add their own reactions"
  ON activity_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policies for authenticated users to delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON activity_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);