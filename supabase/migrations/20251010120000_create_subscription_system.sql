/*
  # Create Subscription System

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `parent_id` (uuid, references profiles) - Parent user
      - `status` (text) - 'trial', 'active', 'expired', 'cancelled'
      - `trial_start_date` (timestamptz) - When trial started
      - `trial_end_date` (timestamptz) - When trial ends (30 days from start)
      - `subscription_start_date` (timestamptz, nullable) - When paid subscription started
      - `subscription_end_date` (timestamptz, nullable) - When current paid period ends
      - `children_count` (integer) - Number of children at time of billing
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `subscription_payments`
      - `id` (uuid, primary key)
      - `subscription_id` (uuid, references subscriptions)
      - `parent_id` (uuid, references profiles)
      - `amount` (numeric) - Amount paid in euros
      - `children_count` (integer) - Number of children billed for
      - `payment_date` (timestamptz)
      - `payment_method` (text) - 'stripe', 'paypal', etc.
      - `payment_status` (text) - 'pending', 'completed', 'failed'
      - `stripe_payment_intent_id` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Parents can view their own subscriptions
    - Parents can view their own payment history
    - Admins can view all subscriptions and payments

  3. Functions
    - Function to check if parent has active subscription
    - Function to calculate subscription price based on children count
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'trial' NOT NULL,
  trial_start_date timestamptz DEFAULT now() NOT NULL,
  trial_end_date timestamptz DEFAULT (now() + interval '30 days') NOT NULL,
  subscription_start_date timestamptz,
  subscription_end_date timestamptz,
  children_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_subscription_status CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  CONSTRAINT unique_parent_subscription UNIQUE (parent_id)
);

-- Create subscription_payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  children_count integer NOT NULL,
  payment_date timestamptz DEFAULT now() NOT NULL,
  payment_method text NOT NULL,
  payment_status text DEFAULT 'pending' NOT NULL,
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'completed', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_parent ON subscriptions(parent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_parent ON subscription_payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Parents can view own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

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

-- Subscription payments policies
CREATE POLICY "Parents can view own payments"
  ON subscription_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own payments"
  ON subscription_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_id);

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

-- Function to check if parent has active subscription
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
  WHERE parent_id = parent_user_id;

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

-- Function to calculate subscription price (2 euros per child per month)
CREATE OR REPLACE FUNCTION calculate_subscription_price(num_children integer)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN num_children * 2.00;
END;
$$;

-- Trigger to create subscription when parent signs up
CREATE OR REPLACE FUNCTION create_subscription_on_parent_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.role = 'parent' THEN
    INSERT INTO subscriptions (parent_id, status, children_count)
    VALUES (NEW.id, 'trial', 0)
    ON CONFLICT (parent_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_subscription_on_parent_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_on_parent_signup();

-- Trigger to update subscription children count when child is added/removed
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

  -- Update subscription
  UPDATE subscriptions
  SET children_count = child_count,
      updated_at = now()
  WHERE parent_id = parent_user_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trigger_update_subscription_count_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.role = 'child' AND NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION update_subscription_children_count();

CREATE TRIGGER trigger_update_subscription_count_delete
  AFTER DELETE ON profiles
  FOR EACH ROW
  WHEN (OLD.role = 'child' AND OLD.parent_id IS NOT NULL)
  EXECUTE FUNCTION update_subscription_children_count();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;
