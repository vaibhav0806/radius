ALTER TABLE businesses ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE businesses ADD COLUMN subscription_plan TEXT;
