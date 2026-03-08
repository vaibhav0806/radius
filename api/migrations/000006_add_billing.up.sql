ALTER TABLE businesses ADD COLUMN dodo_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN dodo_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE businesses ADD COLUMN subscription_plan TEXT;
