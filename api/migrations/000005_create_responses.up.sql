CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID UNIQUE NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    draft_text TEXT NOT NULL,
    final_text TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'skipped')),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    approved_by_user_id UUID REFERENCES users(id)
);

CREATE INDEX idx_responses_status ON responses(status);
CREATE INDEX idx_responses_review ON responses(review_id);
