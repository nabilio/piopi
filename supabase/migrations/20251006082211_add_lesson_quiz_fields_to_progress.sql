/*
  # Add lesson and quiz tracking fields to bulk_generation_progress

  1. Changes
    - Add current_lesson field to track lesson title
    - Add current_lesson_index field to track lesson number
    - Add total_lessons field to track total lessons
    - Add current_quiz_type field to track quiz difficulty (Facile, Moyen, Difficile)
    - Add current_quiz_number field to track quiz number
    - Add total_quizzes field to track total quizzes (15 per lesson)
  
  2. Purpose
    - Allow detailed progress tracking when generating content
    - Persist all progress details so users can see exactly where generation stopped
*/

ALTER TABLE bulk_generation_progress 
ADD COLUMN IF NOT EXISTS current_lesson text,
ADD COLUMN IF NOT EXISTS current_lesson_index integer,
ADD COLUMN IF NOT EXISTS total_lessons integer,
ADD COLUMN IF NOT EXISTS current_quiz_type text,
ADD COLUMN IF NOT EXISTS current_quiz_number integer,
ADD COLUMN IF NOT EXISTS total_quizzes integer;
