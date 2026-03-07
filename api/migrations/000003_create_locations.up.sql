CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    google_account_id TEXT,
    google_location_id TEXT,
    google_refresh_token TEXT,
    poll_enabled BOOLEAN NOT NULL DEFAULT false,
    last_polled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_business ON locations(business_id);
CREATE UNIQUE INDEX idx_locations_google ON locations(google_location_id) WHERE google_location_id IS NOT NULL;
