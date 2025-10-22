/*
  # Corriger les triggers pour utiliser la colonne content au lieu de title/description

  1. Modifications
    - Recréer les fonctions pour utiliser la colonne 'content' (jsonb)
    - Supprimer les références aux colonnes 'title', 'description', 'metadata' qui n'existent pas
    - Tout mettre dans 'content' qui est la colonne correcte

  2. Structure de content
    - title: titre du battle
    - description: description du résultat
    - battle_id: ID du battle
    - opponent_id: ID de l'adversaire
    - opponent_name: nom de l'adversaire
    - autres métadonnées du battle
*/

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
      content,
      points_earned
    ) VALUES (
      NEW.creator_id,
      'battle_started',
      jsonb_build_object(
        'title', 'Battle lancé!',
        'description', 'J''ai défié ' || v_opponent_name || ' en ' || COALESCE(v_subjects, 'plusieurs matières') || '!',
        'battle_id', NEW.id,
        'opponent_id', NEW.opponent_id,
        'opponent_name', v_opponent_name,
        'subjects', v_subjects,
        'difficulty', NEW.difficulty,
        'total_quizzes', NEW.total_quizzes
      ),
      0
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
  v_points integer;
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

    -- Determine activity type and message based on outcome for creator
    IF NEW.is_solo_victory THEN
      v_activity_type := 'battle_won';
      v_title := 'Victoire en solo!';
      v_description := 'J''ai remporté le battle contre ' || v_opponent_name || ' (forfait)';
      v_points := 10;
    ELSIF NEW.winner_id = NEW.creator_id THEN
      v_activity_type := 'battle_won';
      v_title := 'Victoire!';
      v_description := 'J''ai battu ' || v_opponent_name || ' avec ' || NEW.creator_score || ' points contre ' || NEW.opponent_score || '!';
      v_points := 10;
    ELSIF NEW.winner_id = NEW.opponent_id THEN
      v_activity_type := 'battle_lost';
      v_title := 'Battle terminé';
      v_description := 'J''ai perdu contre ' || v_opponent_name || ' (' || NEW.creator_score || ' vs ' || NEW.opponent_score || ')';
      v_points := 0;
    ELSE
      v_activity_type := 'battle_draw';
      v_title := 'Match nul!';
      v_description := 'Égalité avec ' || v_opponent_name || ' (' || NEW.creator_score || ' points chacun)';
      v_points := 5;
    END IF;

    -- Create activity feed post for creator
    INSERT INTO activity_feed (
      user_id,
      activity_type,
      content,
      points_earned
    ) VALUES (
      NEW.creator_id,
      v_activity_type,
      jsonb_build_object(
        'title', v_title,
        'description', v_description,
        'battle_id', NEW.id,
        'opponent_id', NEW.opponent_id,
        'opponent_name', v_opponent_name,
        'subjects', v_subjects,
        'creator_score', NEW.creator_score,
        'opponent_score', NEW.opponent_score,
        'is_victory', NEW.winner_id = NEW.creator_id,
        'is_solo_victory', NEW.is_solo_victory
      ),
      v_points
    );

    -- Create post for opponent (if they participated)
    IF NOT NEW.is_solo_victory THEN
      IF NEW.winner_id = NEW.opponent_id THEN
        v_activity_type := 'battle_won';
        v_title := 'Victoire!';
        v_description := 'J''ai battu ' || v_creator_name || ' avec ' || NEW.opponent_score || ' points contre ' || NEW.creator_score || '!';
        v_points := 10;
      ELSIF NEW.winner_id = NEW.creator_id THEN
        v_activity_type := 'battle_lost';
        v_title := 'Battle terminé';
        v_description := 'J''ai perdu contre ' || v_creator_name || ' (' || NEW.opponent_score || ' vs ' || NEW.creator_score || ')';
        v_points := 0;
      ELSE
        v_activity_type := 'battle_draw';
        v_title := 'Match nul!';
        v_description := 'Égalité avec ' || v_creator_name || ' (' || NEW.opponent_score || ' points chacun)';
        v_points := 5;
      END IF;

      INSERT INTO activity_feed (
        user_id,
        activity_type,
        content,
        points_earned
      ) VALUES (
        NEW.opponent_id,
        v_activity_type,
        jsonb_build_object(
          'title', v_title,
          'description', v_description,
          'battle_id', NEW.id,
          'opponent_id', NEW.creator_id,
          'opponent_name', v_creator_name,
          'subjects', v_subjects,
          'creator_score', NEW.opponent_score,
          'opponent_score', NEW.creator_score,
          'is_victory', NEW.winner_id = NEW.opponent_id,
          'is_solo_victory', false
        ),
        v_points
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
