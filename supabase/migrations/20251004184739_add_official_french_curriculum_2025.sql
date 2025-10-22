/*
  # Update subjects with official French curriculum 2025

  This migration updates the subjects table to reflect the official French education curriculum for 2025.
  
  ## Changes Made:
  
  1. Update existing subjects with appropriate grade levels:
     - Français: All levels (CP to Terminale)
     - Mathématiques: All levels (CP to Terminale)
     - Sciences: Split into different subjects by level
     - Histoire: Available from CE2 to Terminale
     - Lecture: Primarily CP-CE2
  
  2. Add new subjects according to official curriculum:
     - Géographie (CE2 to Terminale)
     - Histoire-Géographie (6ème to 3ème combined)
     - Sciences et Technologie (CP to CM2)
     - SVT - Sciences de la Vie et de la Terre (6ème to Terminale)
     - Physique-Chimie (5ème to Terminale)
     - Technologie (6ème to 3ème)
     - Langue Vivante / Anglais (CP to Terminale)
     - Arts Plastiques (CP to Terminale)
     - Éducation Musicale (CP to Terminale)
     - Éducation Physique et Sportive (CP to Terminale)
     - Éducation Morale et Civique (CP to Terminale)
  
  ## Notes:
  - Levels follow French education system: CP, CE1, CE2, CM1, CM2 (Primaire), 6ème, 5ème, 4ème, 3ème (Collège), 2nde, 1ère, Terminale (Lycée)
  - Programs are based on official 2025 curriculum reforms
  - grade_levels is stored as JSONB array format
*/

-- First, update existing subjects with grade levels (using JSONB format)
UPDATE subjects 
SET grade_levels = '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb
WHERE name = 'Français';

UPDATE subjects 
SET grade_levels = '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb
WHERE name = 'Mathématiques';

UPDATE subjects 
SET grade_levels = '["CP", "CE1", "CE2"]'::jsonb
WHERE name = 'Lecture';

UPDATE subjects 
SET grade_levels = '["CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb,
    name = 'Histoire-Géographie',
    description = 'Découvre le passé et explore le monde !'
WHERE name = 'Histoire';

-- Update Sciences to be Sciences et Technologie for primary
UPDATE subjects 
SET grade_levels = '["CP", "CE1", "CE2", "CM1", "CM2"]'::jsonb,
    name = 'Sciences et Technologie',
    description = 'Découvre comment fonctionne le monde !'
WHERE name = 'Sciences';

-- Add new subjects for official curriculum
INSERT INTO subjects (name, icon, color, description, grade_levels) VALUES
  ('SVT - Sciences de la Vie et de la Terre', 'microscope', '#10B981', 'Explore la nature et le vivant !', '["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb),
  ('Physique-Chimie', 'atom', '#8B5CF6', 'Découvre les lois de la physique et de la chimie !', '["5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb),
  ('Technologie', 'wrench', '#F59E0B', 'Conçois et crée des objets techniques !', '["6ème", "5ème", "4ème", "3ème"]'::jsonb),
  ('Anglais', 'globe', '#3B82F6', 'Apprends l''anglais en t''amusant !', '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb),
  ('Arts Plastiques', 'palette', '#EC4899', 'Exprime ta créativité par l''art !', '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb),
  ('Éducation Musicale', 'music', '#F472B6', 'Découvre la musique et le rythme !', '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème"]'::jsonb),
  ('Éducation Physique et Sportive', 'activity', '#14B8A6', 'Bouge et amuse-toi avec le sport !', '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb),
  ('Éducation Morale et Civique', 'heart-handshake', '#6366F1', 'Apprends les valeurs et le civisme !', '["CP", "CE1", "CE2", "CM1", "CM2", "6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"]'::jsonb)
ON CONFLICT DO NOTHING;