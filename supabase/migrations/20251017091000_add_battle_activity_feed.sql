/*
  # Ajouter les battles au fil d'actualité

  1. Modifications
    - Ajouter les types d'activités pour les battles:
      - battle_started: Quand un utilisateur lance un battle
      - battle_won: Quand un utilisateur gagne un battle
      - battle_lost: Quand un utilisateur perd un battle
      - battle_draw: Match nul

  2. Triggers
    - Créer un post automatiquement quand un battle commence (status → 'active')
    - Créer un post automatiquement quand un battle se termine (status → 'completed')
*/

-- Drop existing constraint
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_activity_type_check;

-- Add new constraint with battle activity types
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_activity_type_check
  CHECK (activity_type IN (
    'completed_quiz',
    'completed_activity',
    'achievement_unlocked',
    'level_up',
    'friend_added',
    'record_broken',
    'mystery_unlocked',
    'battle_started',
    'battle_won',
    'battle_lost',
    'battle_draw'
  ));

-- Function to create activity feed post when battle starts
CREATE OR REPLACE FUNCTION create_battle_started_post()
RETURNS TRIGGER AS $$
DECLARE
  v_opponent_name text;
  v_subjects text;
BEGIN
  -- Only trigger when status changes to 'active' and creator hasn't started yet
  IF NEW.status = 'active' AND OLD.status = 'pending' THEN
    -- Get opponent name
    SELECT COALESCE(username, full_name, 'Adversaire') INTO v_opponent_name
    FROM profiles
    WHERE id = NEW.opponent_id;

    -- Get subjects list
    SELECT string_agg(subject_name, ', ')
    INTO v_subjects
    FROM jsonb_to_recordset(NEW.battle_subjects) AS x(subject_name text);

    -- Create activity feed post for creator
    INSERT INTO activity_feed (
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.creator_id,
      'battle_started',
      'Battle lancé!',
      'J''ai défié ' || v_opponent_name || ' en ' || COALESCE(v_subjects, 'plusieurs matières') || '!',
      jsonb_build_object(
        'battle_id', NEW.id,
        'opponent_id', NEW.opponent_id,
        'opponent_name', v_opponent_name,
        'subjects', v_subjects,
        'difficulty', NEW.difficulty,
        'total_quizzes', NEW.total_quizzes
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create activity feed post when battle ends
CREATE OR REPLACE FUNCTION create_battle_completed_post()
RETURNS TRIGGER AS $$
DECLARE
  v_opponent_name text;
  v_creator_name text;
  v_subjects text;
  v_activity_type text;
  v_title text;
  v_description text;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get names
    SELECT COALESCE(username, full_name, 'Adversaire') INTO v_opponent_name
    FROM profiles
    WHERE id = NEW.opponent_id;

    SELECT COALESCE(username, full_name, 'Joueur') INTO v_creator_name
    FROM profiles
    WHERE id = NEW.creator_id;

    -- Get subjects list
    SELECT string_agg(subject_name, ', ')
    INTO v_subjects
    FROM jsonb_to_recordset(NEW.battle_subjects) AS x(subject_name text);

    -- Determine activity type and message based on outcome
    IF NEW.is_solo_victory THEN
      v_activity_type := 'battle_won';
      v_title := 'Victoire en solo!';
      v_description := 'J''ai remporté le battle contre ' || v_opponent_name || ' (forfait)';
    ELSIF NEW.winner_id = NEW.creator_id THEN
      v_activity_type := 'battle_won';
      v_title := 'Victoire!';
      v_description := 'J''ai battu ' || v_opponent_name || ' avec ' || NEW.creator_score || ' points contre ' || NEW.opponent_score || '!';
    ELSIF NEW.winner_id = NEW.opponent_id THEN
      v_activity_type := 'battle_lost';
      v_title := 'Battle terminé';
      v_description := 'J''ai perdu contre ' || v_opponent_name || ' (' || NEW.creator_score || ' vs ' || NEW.opponent_score || ')';
    ELSE
      v_activity_type := 'battle_draw';
      v_title := 'Match nul!';
      v_description := 'Égalité avec ' || v_opponent_name || ' (' || NEW.creator_score || ' points chacun)';
    END IF;

    -- Create activity feed post for creator
    INSERT INTO activity_feed (
      user_id,
      activity_type,
      title,
      description,
      metadata
    ) VALUES (
      NEW.creator_id,
      v_activity_type,
      v_title,
      v_description,
      jsonb_build_object(
        'battle_id', NEW.id,
        'opponent_id', NEW.opponent_id,
        'opponent_name', v_opponent_name,
        'subjects', v_subjects,
        'creator_score', NEW.creator_score,
        'opponent_score', NEW.opponent_score,
        'is_victory', NEW.winner_id = NEW.creator_id,
        'is_solo_victory', NEW.is_solo_victory
      )
    );

    -- Create post for opponent (if they participated)
    IF NOT NEW.is_solo_victory THEN
      IF NEW.winner_id = NEW.opponent_id THEN
        v_activity_type := 'battle_won';
        v_title := 'Victoire!';
        v_description := 'J''ai battu ' || v_creator_name || ' avec ' || NEW.opponent_score || ' points contre ' || NEW.creator_score || '!';
      ELSIF NEW.winner_id = NEW.creator_id THEN
        v_activity_type := 'battle_lost';
        v_title := 'Battle terminé';
        v_description := 'J''ai perdu contre ' || v_creator_name || ' (' || NEW.opponent_score || ' vs ' || NEW.creator_score || ')';
      ELSE
        v_activity_type := 'battle_draw';
        v_title := 'Match nul!';
        v_description := 'Égalité avec ' || v_creator_name || ' (' || NEW.opponent_score || ' points chacun)';
      END IF;

      INSERT INTO activity_feed (
        user_id,
        activity_type,
        title,
        description,
        metadata
      ) VALUES (
        NEW.opponent_id,
        v_activity_type,
        v_title,
        v_description,
        jsonb_build_object(
          'battle_id', NEW.id,
          'opponent_id', NEW.creator_id,
          'opponent_name', v_creator_name,
          'subjects', v_subjects,
          'creator_score', NEW.opponent_score,
          'opponent_score', NEW.creator_score,
          'is_victory', NEW.winner_id = NEW.opponent_id,
          'is_solo_victory', false
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_battle_started_feed ON battles;
CREATE TRIGGER trigger_battle_started_feed
  AFTER UPDATE ON battles
  FOR EACH ROW
  EXECUTE FUNCTION create_battle_started_post();

DROP TRIGGER IF EXISTS trigger_battle_completed_feed ON battles;
CREATE TRIGGER trigger_battle_completed_feed
  AFTER UPDATE ON battles
  FOR EACH ROW
  EXECUTE FUNCTION create_battle_completed_post();
