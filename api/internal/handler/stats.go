package handler

import (
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
	locationID := chi.URLParam(r, "id")

	var stats reviewStats
	err := h.DB.QueryRow(r.Context(),
		"SELECT COUNT(*), COALESCE(AVG(rating), 0) FROM reviews WHERE location_id = $1",
		locationID,
	).Scan(&stats.TotalReviews, &stats.AvgRating)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	stats.RatingDist = map[int]int{}
	rows, err := h.DB.Query(r.Context(),
		"SELECT rating, COUNT(*) FROM reviews WHERE location_id = $1 GROUP BY rating",
		locationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var rating, count int
		if err := rows.Scan(&rating, &count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		stats.RatingDist[rating] = count
	}
	rows.Close()

	stats.SentimentDist = map[string]int{}
	rows, err = h.DB.Query(r.Context(),
		"SELECT sentiment_label, COUNT(*) FROM reviews WHERE location_id = $1 AND sentiment_label IS NOT NULL GROUP BY sentiment_label",
		locationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var label string
		var count int
		if err := rows.Scan(&label, &count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		stats.SentimentDist[label] = count
	}
	rows.Close()

	var sentCount, totalWithResponse int
	err = h.DB.QueryRow(r.Context(),
		`SELECT
			COUNT(*) FILTER (WHERE r.status = 'sent') as sent_count,
			COUNT(*) FILTER (WHERE r.status = 'draft') as pending_count,
			COUNT(r.id) as total_with_response
		FROM reviews rv LEFT JOIN responses r ON r.review_id = rv.id WHERE rv.location_id = $1`,
		locationID,
	).Scan(&sentCount, &stats.PendingCount, &totalWithResponse)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	if stats.TotalReviews > 0 {
		stats.ResponseRate = float64(sentCount) / float64(stats.TotalReviews) * 100
	}

	stats.SentimentTrend = []trendPoint{}
	rows, err = h.DB.Query(r.Context(),
		`SELECT date_trunc('week', review_time)::date as week_start, AVG(sentiment_score), COUNT(*)
		FROM reviews WHERE location_id = $1 AND sentiment_score IS NOT NULL AND review_time > now() - interval '12 weeks'
		GROUP BY week_start ORDER BY week_start`,
		locationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var tp trendPoint
		if err := rows.Scan(&tp.Date, &tp.Value, &tp.Count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		stats.SentimentTrend = append(stats.SentimentTrend, tp)
	}
	rows.Close()

	stats.RatingTrend = []trendPoint{}
	rows, err = h.DB.Query(r.Context(),
		`SELECT date_trunc('week', review_time)::date as week_start, AVG(rating)::float, COUNT(*)
		FROM reviews WHERE location_id = $1 AND review_time > now() - interval '12 weeks'
		GROUP BY week_start ORDER BY week_start`,
		locationID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var tp trendPoint
		if err := rows.Scan(&tp.Date, &tp.Value, &tp.Count); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		stats.RatingTrend = append(stats.RatingTrend, tp)
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
