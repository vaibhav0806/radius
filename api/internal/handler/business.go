package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vaibhav/review-responder/internal/middleware"
)

type business struct {
	ID               string     `json:"id"`
	OwnerUserID      string     `json:"owner_user_id"`
	Name             string     `json:"name"`
	Type             string     `json:"type"`
	BrandVoiceConfig *string    `json:"brand_voice_config"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

type createBusinessRequest struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

func (h *Handler) ListBusinesses(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	rows, err := h.DB.Query(r.Context(),
		"SELECT id, owner_user_id, name, type, brand_voice_config, created_at, updated_at FROM businesses WHERE owner_user_id = $1 ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()

	businesses := []business{}
	for rows.Next() {
		var b business
		if err := rows.Scan(&b.ID, &b.OwnerUserID, &b.Name, &b.Type, &b.BrandVoiceConfig, &b.CreatedAt, &b.UpdatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		businesses = append(businesses, b)
	}

	writeJSON(w, http.StatusOK, businesses)
}

func (h *Handler) CreateBusiness(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	var req createBusinessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Type == "" {
		req.Type = "other"
	}

	var b business
	err := h.DB.QueryRow(r.Context(),
		"INSERT INTO businesses (owner_user_id, name, type) VALUES ($1, $2, $3) RETURNING id, owner_user_id, name, type, brand_voice_config, created_at, updated_at",
		userID, req.Name, req.Type,
	).Scan(&b.ID, &b.OwnerUserID, &b.Name, &b.Type, &b.BrandVoiceConfig, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusCreated, b)
}

func (h *Handler) UpdateBrandVoice(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	businessID := chi.URLParam(r, "id")

	var body struct {
		Tone            string   `json:"tone"`
		BusinessContext string   `json:"business_context"`
		Rules           string   `json:"rules"`
		Examples        []string `json:"examples"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	brandVoiceJSON, err := json.Marshal(body)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	var b business
	err = h.DB.QueryRow(r.Context(),
		"UPDATE businesses SET brand_voice_config = $1, updated_at = now() WHERE id = $2 AND owner_user_id = $3 RETURNING id, owner_user_id, name, type, brand_voice_config, created_at, updated_at",
		brandVoiceJSON, businessID, userID,
	).Scan(&b.ID, &b.OwnerUserID, &b.Name, &b.Type, &b.BrandVoiceConfig, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	writeJSON(w, http.StatusOK, b)
}
