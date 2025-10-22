/*
  # Update Battle System for Multi-Subject Support

  1. Changes to `battles` table
    - Add `battle_subjects` JSONB array to store multiple subjects and lessons
      Format: [{ subject_id, subject_name, lesson_id, lesson_title }]
    
  2. New Tables
    - `battle_participants` - Track battle invitations and acceptances
      - `id` (uuid, primary key)
      - `battle_id` (uuid, foreign key to battles)
      - `child_id` (uuid, foreign key to profiles)
      - `status` (text: 'pending', 'accepted', 'declined')
      - `invited_at` (timestamptz)
      - `responded_at` (timestamptz, nullable)
      
  3. Security
    - Enable RLS on `battle_participants` table
    - Allow users to view participants of their own battles
    - Allow users to update their own participation status
    - Allow battle creators to view all participants
    
  4. Important Notes
    - Existing battles will have empty battle_subjects array (safe migration)
    - New battles must use battle_subjects array format
    - Battle starts only when all participants have accepted
*/

-- Add battle_subjects column to battles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battles' AND column_name = 'battle_subjects'
  ) THEN
    ALTER TABLE battles ADD COLUMN battle_subjects JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create battle_participants table
CREATE TABLE IF NOT EXISTS battle_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(battle_id, child_id)
);

-- Enable RLS on battle_participants
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view participants of battles they're part of
CREATE POLICY "Users can view battle participants they're involved with"
  ON battle_participants FOR SELECT
  TO authenticated
  USING (
    child_id = auth.uid() 
    OR child_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
    OR battle_id IN (
      SELECT id FROM battles 
      WHERE creator_id = auth.uid() 
      OR opponent_id = auth.uid()
      OR creator_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
      OR opponent_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
    )
  );

-- Policy: Users can update their own participation status
CREATE POLICY "Users can update own participation status"
  ON battle_participants FOR UPDATE
  TO authenticated
  USING (
    child_id = auth.uid()
    OR child_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
  )
  WITH CHECK (
    child_id = auth.uid()
    OR child_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
  );

-- Policy: Battle creators can insert participants
CREATE POLICY "Battle creators can add participants"
  ON battle_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    battle_id IN (
      SELECT id FROM battles 
      WHERE creator_id = auth.uid()
      OR creator_id IN (SELECT id FROM profiles WHERE parent_id = auth.uid())
    )
  );

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_child_id ON battle_participants(child_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_status ON battle_participants(status);