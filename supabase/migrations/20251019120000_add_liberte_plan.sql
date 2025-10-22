/*
  # Add Liberté Plan

  1. Changes
    - Update plan_type validation to include 'liberte' option
    - 'liberte' plan allows unlimited children (5+)
    - Pricing: Base 4 children at premium price, +2€ per additional child

  2. Notes
    - 'liberte' plan is for parents who need more than 4 children
    - This is the "Premium Plus" or "Freedom" plan
    - Each additional child beyond 4 costs 2€ extra per month
*/

-- The plan_type column already exists and doesn't have a constraint
-- It accepts any text value, so 'liberte' can be used immediately
-- No schema changes needed, just documentation

-- Optional: Add a comment to document the plan types
COMMENT ON COLUMN subscriptions.plan_type IS 'Plan type: basic (1 child), duo (2 children), family (3 children), premium (4 children), liberte (5+ children, +2€ per child after 4)';
