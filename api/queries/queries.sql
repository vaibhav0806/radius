-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, created_at, updated_at
FROM users
WHERE email = $1;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, name)
VALUES ($1, $2, $3)
RETURNING id, email, password_hash, name, created_at, updated_at;

-- name: GetBusinessesByOwner :many
SELECT id, owner_user_id, name, type, brand_voice_config, created_at, updated_at
FROM businesses
WHERE owner_user_id = $1
ORDER BY created_at DESC;

-- name: CreateBusiness :one
INSERT INTO businesses (owner_user_id, name, type, brand_voice_config)
VALUES ($1, $2, $3, $4)
RETURNING id, owner_user_id, name, type, brand_voice_config, created_at, updated_at;

-- name: GetLocationsByBusiness :many
SELECT id, business_id, name, address, google_account_id, google_location_id,
       google_refresh_token, poll_enabled, last_polled_at, created_at, updated_at
FROM locations
WHERE business_id = $1
ORDER BY created_at DESC;

-- name: CreateLocation :one
INSERT INTO locations (business_id, name, address, google_account_id, google_location_id, google_refresh_token, poll_enabled)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, business_id, name, address, google_account_id, google_location_id,
          google_refresh_token, poll_enabled, last_polled_at, created_at, updated_at;

-- name: GetReviewsByLocation :many
SELECT id, location_id, google_review_id, author_name, profile_photo_url,
       rating, text, sentiment_score, sentiment_label, review_time, created_at
FROM reviews
WHERE location_id = $1
ORDER BY review_time DESC
LIMIT $2 OFFSET $3;

-- name: CreateReview :one
INSERT INTO reviews (location_id, google_review_id, author_name, profile_photo_url,
                     rating, text, sentiment_score, sentiment_label, review_time)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, location_id, google_review_id, author_name, profile_photo_url,
          rating, text, sentiment_score, sentiment_label, review_time, created_at;

-- name: GetResponseByReviewID :one
SELECT id, review_id, draft_text, final_text, status, generated_at,
       approved_at, sent_at, approved_by_user_id
FROM responses
WHERE review_id = $1;

-- name: CreateResponse :one
INSERT INTO responses (review_id, draft_text, status)
VALUES ($1, $2, $3)
RETURNING id, review_id, draft_text, final_text, status, generated_at,
          approved_at, sent_at, approved_by_user_id;

-- name: UpdateResponseStatus :one
UPDATE responses
SET status = $2,
    final_text = $3,
    approved_at = $4,
    sent_at = $5,
    approved_by_user_id = $6
WHERE id = $1
RETURNING id, review_id, draft_text, final_text, status, generated_at,
          approved_at, sent_at, approved_by_user_id;
