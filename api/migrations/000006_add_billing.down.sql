ALTER TABLE businesses DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE businesses DROP COLUMN IF EXISTS stripe_subscription_id;
ALTER TABLE businesses DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE businesses DROP COLUMN IF EXISTS subscription_plan;
