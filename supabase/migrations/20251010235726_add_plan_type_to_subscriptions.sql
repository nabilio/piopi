/*
  # Add plan_type column to subscriptions table

  1. Changes
    - Add `plan_type` column to track if subscription is monthly or yearly
    - Set default value to 'monthly'
    - Update existing records to have 'monthly' as plan_type

  2. Notes
    - This field is essential for determining billing cycles
    - Used in registration and upgrade flows
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN plan_type text DEFAULT 'monthly';
    
    UPDATE subscriptions SET plan_type = 'monthly' WHERE plan_type IS NULL;
  END IF;
END $$;
