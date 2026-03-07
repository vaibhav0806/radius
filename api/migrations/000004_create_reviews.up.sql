CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    google_review_id TEXT UNIQUE NOT NULL,
    author_name TEXT NOT NULL,
    profile_photo_url TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    sentiment_score REAL,
    sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'neutral', 'negative')),
    review_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_location ON reviews(location_id);
CREATE INDEX idx_reviews_rating ON reviews(location_id, rating);
CREATE INDEX idx_reviews_sentiment ON reviews(location_id, sentiment_label);
CREATE INDEX idx_reviews_time ON reviews(location_id, review_time DESC);
