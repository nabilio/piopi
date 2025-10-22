/*
  # Fix subscription plan_type based on children_count

  This migration fixes subscriptions where plan_type doesn't match children_count.
  It updates plan_type to match the appropriate tier based on the actual children_count.

  Plan mapping:
  - 1 child -> basic
  - 2 children -> duo
  - 3 children -> family
  - 4 children -> premium
*/

-- Update subscriptions where children_count is 4 but plan_type is not 'premium'
UPDATE subscriptions
SET plan_type = 'premium'
WHERE children_count = 4 AND plan_type != 'premium';

-- Update subscriptions where children_count is 3 but plan_type is not 'family'
UPDATE subscriptions
SET plan_type = 'family'
WHERE children_count = 3 AND plan_type != 'family';

-- Update subscriptions where children_count is 2 but plan_type is not 'duo'
UPDATE subscriptions
SET plan_type = 'duo'
WHERE children_count = 2 AND plan_type != 'duo';

-- Update subscriptions where children_count is 1 but plan_type is not 'basic'
UPDATE subscriptions
SET plan_type = 'basic'
WHERE children_count = 1 AND plan_type != 'basic';
