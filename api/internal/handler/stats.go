package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/vaibhav/review-responder/internal/middleware"
)

type trendPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
	Count int     `json:"count"`
}

type reviewStats struct {
	TotalReviews   int            `json:"total_reviews"`
	AvgRating      float64        `json:"avg_rating"`
	RatingDist     map[int]int    `json:"rating_distribution"`
	SentimentDist  map[string]int `json:"sentiment_distribution"`
	ResponseRate   float64        `json:"response_rate"`
	PendingCount   int            `json:"pending_count"`
	SentimentTrend []trendPoint   `json:"sentiment_trend"`
	RatingTrend    []trendPoint   `json:"rating_trend"`
}

func (h *Handler) LocationReviewStats(w http.ResponseWriter, r *http.Request) {
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

	// Query 1: All aggregates in a single query using JSON aggregation
	var stats reviewStats
	var sentCount int
	var ratingDistJSON, sentimentDistJSON []byte
	err := h.DB.QueryRow(r.Context(),
		`SELECT
			COUNT(rv.id) as total_reviews,
			COALESCE(AVG(rv.rating), 0) as avg_rating,
			COALESCE((SELECT json_object_agg(rating, cnt) FROM (SELECT rating, COUNT(*) as cnt FROM reviews WHERE location_id = $1 GROUP BY rating) t), '{}')::text,
			COALESCE((SELECT json_object_agg(sentiment_label, cnt) FROM (SELECT sentiment_label, COUNT(*) as cnt FROM reviews WHERE location_id = $1 AND sentiment_label IS NOT NULL GROUP BY sentiment_label) t), '{}')::text,
			COUNT(resp.id) FILTER (WHERE resp.status = 'sent') as sent_count,
			COUNT(resp.id) FILTER (WHERE resp.status = 'draft') as pending_count
		FROM reviews rv
		LEFT JOIN responses resp ON resp.review_id = rv.id
		WHERE rv.location_id = $1`,
		locationID,
	).Scan(&stats.TotalReviews, &stats.AvgRating, &ratingDistJSON, &sentimentDistJSON, &sentCount, &stats.PendingCount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	stats.RatingDist = map[int]int{}
	_ = json.Unmarshal(ratingDistJSON, &stats.RatingDist)
	stats.SentimentDist = map[string]int{}
	_ = json.Unmarshal(sentimentDistJSON, &stats.SentimentDist)

	if stats.TotalReviews > 0 {
		stats.ResponseRate = float64(sentCount) / float64(stats.TotalReviews) * 100
	}

	// Query 2: Both trends in a single query using UNION ALL
	stats.SentimentTrend = []trendPoint{}
	stats.RatingTrend = []trendPoint{}
	rows, err := h.DB.Query(r.Context(),
		`SELECT 'sentiment' as series, date_trunc('week', review_time)::date::text as week_start, AVG(sentiment_score), COUNT(*)
		FROM reviews WHERE location_id = $1 AND sentiment_score IS NOT NULL AND review_time > now() - interval '12 weeks'
		GROUP BY date_trunc('week', review_time)::date
		UNION ALL
		SELECT 'rating', date_trunc('week', review_time)::date::text, AVG(rating)::float, COUNT(*)
		FROM reviews WHERE location_id = $1 AND review_time > now() - interval '12 weeks'
		GROUP BY date_trunc('week', review_time)::date
		ORDER BY 1, 2`,
		locationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var series string
		var tp trendPoint
		if err := rows.Scan(&series, &tp.Date, &tp.Value, &tp.Count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		if series == "sentiment" {
			stats.SentimentTrend = append(stats.SentimentTrend, tp)
		} else {
			stats.RatingTrend = append(stats.RatingTrend, tp)
		}
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

type dashboardStats struct {
	TotalReviews     int     `json:"total_reviews"`
	AvgRating        float64 `json:"avg_rating"`
	PendingResponses int     `json:"pending_responses"`
	ResponseRate     float64 `json:"response_rate"`
	NegativeCount    int     `json:"negative_count"`
}

func (h *Handler) DashboardStats(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var stats dashboardStats
	err := h.DB.QueryRow(r.Context(),
		`SELECT
			COUNT(rv.id) as total_reviews,
			COALESCE(AVG(rv.rating), 0) as avg_rating,
			COUNT(resp.id) FILTER (WHERE resp.status = 'draft') as pending_responses,
			CASE WHEN COUNT(rv.id) > 0 THEN COUNT(resp.id) FILTER (WHERE resp.status = 'sent')::float / COUNT(rv.id) * 100 ELSE 0 END as response_rate,
			COUNT(rv.id) FILTER (WHERE rv.rating <= 2 AND rv.review_time > now() - interval '7 days') as negative_count
		FROM reviews rv
		JOIN locations l ON l.id = rv.location_id
		JOIN businesses b ON b.id = l.business_id
		LEFT JOIN responses resp ON resp.review_id = rv.id
		WHERE b.owner_user_id = $1`,
		userID,
	).Scan(&stats.TotalReviews, &stats.AvgRating, &stats.PendingResponses, &stats.ResponseRate, &stats.NegativeCount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}
