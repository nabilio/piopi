/*
  # Rename stripe_payment_intent_id to external_payment_id

  1. Update subscription_payments table to make the payment identifier generic
  2. Preserve existing data by copying values
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'subscription_payments'
      AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE subscription_payments
      RENAME COLUMN stripe_payment_intent_id TO external_payment_id;
  END IF;
END $$;
