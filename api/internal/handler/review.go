package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vaibhav/review-responder/internal/middleware"
)

type review struct {
	ID              string     `json:"id"`
	LocationID      string     `json:"location_id"`
	GoogleReviewID  string     `json:"google_review_id"`
	AuthorName      string     `json:"author_name"`
	ProfilePhotoURL *string    `json:"profile_photo_url"`
	Rating          int        `json:"rating"`
	Text            *string    `json:"text"`
	SentimentScore  *float64   `json:"sentiment_score"`
	SentimentLabel  *string    `json:"sentiment_label"`
	ReviewTime      time.Time  `json:"review_time"`
	CreatedAt       time.Time  `json:"created_at"`
}

func (h *Handler) ListReviews(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	locationID := chi.URLParam(r, "id")

	if err := h.verifyLocationOwner(r.Context(), locationID, userID); err != nil {
		if err == errForbidden {
			writeError(w, http.StatusForbidden, "forbidden")
		} else {
			writeError(w, http.StatusNotFound, "location not found")
		}
		return
	}

	limit := 50
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 100 {
		limit = 100
	}

	var offset int
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT id, location_id, google_review_id, author_name, profile_photo_url, rating, text, sentiment_score, sentiment_label, review_time, created_at
		FROM reviews WHERE location_id = $1 ORDER BY review_time DESC LIMIT $2 OFFSET $3`,
		locationID, limit, offset,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()

	reviews := []review{}
	for rows.Next() {
		var rv review
		if err := rows.Scan(&rv.ID, &rv.LocationID, &rv.GoogleReviewID, &rv.AuthorName, &rv.ProfilePhotoURL, &rv.Rating, &rv.Text, &rv.SentimentScore, &rv.SentimentLabel, &rv.ReviewTime, &rv.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		reviews = append(reviews, rv)
	}

	writeJSON(w, http.StatusOK, reviews)
}
