/*
  # Add Drawings Feature

  1. New Tables
    - `drawings`
      - `id` (uuid, primary key)
      - `child_id` (uuid, foreign key to profiles)
      - `title` (text, optional title for the drawing)
      - `drawing_data` (text, base64 encoded image data)
      - `is_shared` (boolean, whether the drawing is shared to activity feed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `drawings` table
    - Children can create and view their own drawings
    - Parents can view their children's drawings
    - Children can view shared drawings from their friends
    - Public users can view shared drawings in public feed

  3. Activity Feed Integration
    - Shared drawings automatically create activity feed entries
*/

-- Create drawings table
CREATE TABLE IF NOT EXISTS drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT '',
  drawing_data text NOT NULL,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;

-- Children can view their own drawings
CREATE POLICY "Children can view own drawings"
  ON drawings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = child_id);

-- Children can create their own drawings
CREATE POLICY "Children can create own drawings"
  ON drawings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = child_id);

-- Children can update their own drawings
CREATE POLICY "Children can update own drawings"
  ON drawings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = child_id)
  WITH CHECK (auth.uid() = child_id);

-- Children can delete their own drawings
CREATE POLICY "Children can delete own drawings"
  ON drawings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = child_id);

-- Parents can view their children's drawings
CREATE POLICY "Parents can view children drawings"
  ON drawings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles parent_profile
      WHERE parent_profile.id = auth.uid()
      AND parent_profile.role = 'parent'
      AND EXISTS (
        SELECT 1 FROM profiles child_profile
        WHERE child_profile.id = drawings.child_id
        AND child_profile.parent_id = parent_profile.id
      )
    )
  );

-- Friends can view shared drawings
CREATE POLICY "Friends can view shared drawings"
  ON drawings
  FOR SELECT
  TO authenticated
  USING (
    is_shared = true
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE (
        (friendships.user_id = auth.uid() AND friendships.friend_id = drawings.child_id)
        OR (friendships.friend_id = auth.uid() AND friendships.user_id = drawings.child_id)
      )
      AND friendships.status = 'accepted'
    )
  );

-- Anyone can view shared drawings in public feed (for all users browsing)
CREATE POLICY "Users can view all shared drawings"
  ON drawings
  FOR SELECT
  TO authenticated
  USING (is_shared = true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_drawings_child_id ON drawings(child_id);
CREATE INDEX IF NOT EXISTS idx_drawings_shared ON drawings(is_shared) WHERE is_shared = true;
CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON drawings(created_at DESC);

-- Function to auto-create activity feed entry when drawing is shared
CREATE OR REPLACE FUNCTION create_drawing_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create activity if the drawing is newly shared
  IF NEW.is_shared = true AND (OLD IS NULL OR OLD.is_shared = false) THEN
    INSERT INTO activity_feed (user_id, activity_type, metadata, created_at)
    VALUES (
      NEW.child_id,
      'drawing_shared',
      jsonb_build_object(
        'drawing_id', NEW.id,
        'title', NEW.title
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create activity feed entry
DROP TRIGGER IF EXISTS trigger_drawing_activity ON drawings;
CREATE TRIGGER trigger_drawing_activity
  AFTER INSERT OR UPDATE ON drawings
  FOR EACH ROW
  EXECUTE FUNCTION create_drawing_activity();
