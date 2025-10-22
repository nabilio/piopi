/*
  # Rename parent_id to user_id in subscriptions table

  1. Changes
    - Rename parent_id column to user_id in subscriptions table for consistency
    - Rename parent_id column to user_id in subscription_payments table for consistency
    - Update unique constraint to use new column name

  2. Security
    - No changes to RLS policies (they reference by table relationship)
    - All existing data is preserved
*/

-- Rename parent_id to user_id in subscriptions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN parent_id TO user_id;
  END IF;
END $$;

-- Rename parent_id to user_id in subscription_payments table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE subscription_payments RENAME COLUMN parent_id TO user_id;
  END IF;
END $$;

-- Drop old unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions' AND constraint_name = 'unique_parent_subscription'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT unique_parent_subscription;
  END IF;
END $$;

-- Add new unique constraint with updated column name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions' AND constraint_name = 'unique_user_subscription'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);
  END IF;
END $$;

-- Recreate policies with updated column name for subscriptions
DROP POLICY IF EXISTS "Parents can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Parents can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Parents can update own subscription" ON subscriptions;

CREATE POLICY "Parents can view own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can insert own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate policies with updated column name for subscription_payments
DROP POLICY IF EXISTS "Parents can view own payments" ON subscription_payments;

CREATE POLICY "Parents can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
