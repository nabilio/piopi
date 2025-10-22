/*
  # Create Social Features Schema

  ## 1. New Tables
  
  ### `friendships`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - User who sent the request
  - `friend_id` (uuid, references profiles) - User who received the request
  - `status` (text) - pending, accepted, rejected
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### `activity_feed`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - User who performed the action
  - `activity_type` (text) - completed_quiz, completed_activity, achievement_unlocked, level_up
  - `content` (jsonb) - Activity details
  - `points_earned` (integer)
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users
  - Users can view their own and friends' activity feeds
  - Users can manage their own friend requests
*/

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create activity_feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('completed_quiz', 'completed_activity', 'achievement_unlocked', 'level_up', 'friend_added')),
  content jsonb NOT NULL DEFAULT '{}',
  points_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their received requests"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Activity feed policies
CREATE POLICY "Users can view their own activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends' activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = activity_feed.user_id)
         OR (friendships.friend_id = auth.uid() AND friendships.user_id = activity_feed.user_id)
      AND friendships.status = 'accepted'
    )
  );

CREATE POLICY "Users can create their own activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for friendships updated_at
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();