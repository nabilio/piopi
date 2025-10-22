-- ⚠️ IMPORTANT: Copier-coller ce SQL dans Supabase Dashboard > SQL Editor et l'exécuter
-- Cela va corriger l'erreur "column subscriptions.user_id does not exist"

-- First, drop all existing policies that might reference old columns
DROP POLICY IF EXISTS "Parents can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Parents can insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Parents can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Parents can view own payments" ON subscription_payments;
DROP POLICY IF EXISTS "Parents can insert own payments" ON subscription_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON subscription_payments;

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

-- Rename parent_id to user_id in subscriptions table if not already done
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE subscriptions RENAME COLUMN parent_id TO user_id;
  END IF;
END $$;

-- Rename parent_id to user_id in subscription_payments table if not already done
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_payments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE subscription_payments RENAME COLUMN parent_id TO user_id;
  END IF;
END $$;

-- Add new unique constraint with correct column name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions' AND constraint_name = 'unique_user_subscription'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT unique_user_subscription UNIQUE (user_id);
  END IF;
END $$;

-- Recreate policies for subscriptions table
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

CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Recreate policies for subscription_payments table
CREATE POLICY "Parents can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Parents can insert own payments"
  ON subscription_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update has_active_subscription function to use user_id
CREATE OR REPLACE FUNCTION has_active_subscription(parent_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub_record subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE user_id = parent_user_id;

  -- No subscription found
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if in trial period
  IF sub_record.status = 'trial' AND now() <= sub_record.trial_end_date THEN
    RETURN true;
  END IF;

  -- Check if active subscription
  IF sub_record.status = 'active' AND now() <= sub_record.subscription_end_date THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Update create_subscription_on_parent_signup function to use user_id
CREATE OR REPLACE FUNCTION create_subscription_on_parent_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'parent' THEN
    INSERT INTO subscriptions (user_id, status, children_count)
    VALUES (NEW.id, 'trial', 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Update update_subscription_children_count function to use user_id
CREATE OR REPLACE FUNCTION update_subscription_children_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parent_user_id uuid;
  child_count integer;
BEGIN
  -- Get parent_id from the child profile
  IF TG_OP = 'DELETE' THEN
    parent_user_id := OLD.parent_id;
  ELSE
    parent_user_id := NEW.parent_id;
  END IF;

  -- Count children for this parent
  SELECT COUNT(*) INTO child_count
  FROM profiles
  WHERE parent_id = parent_user_id
  AND role = 'child';

  -- Update subscription using user_id column
  UPDATE subscriptions
  SET children_count = child_count,
      updated_at = now()
  WHERE user_id = parent_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Drop and recreate indexes with correct column name
DROP INDEX IF EXISTS idx_subscriptions_parent;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
DROP INDEX IF EXISTS idx_subscription_payments_parent;
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
