package handler

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vaibhav/review-responder/internal/middleware"
)

type location struct {
	ID               string     `json:"id"`
	BusinessID       string     `json:"business_id"`
	Name             string     `json:"name"`
	Address          string     `json:"address"`
	GoogleAccountID  string     `json:"google_account_id"`
	GoogleLocationID string     `json:"google_location_id"`
	PollEnabled      bool       `json:"poll_enabled"`
	LastPolledAt     *time.Time `json:"last_polled_at"`
	CreatedAt        time.Time  `json:"created_at"`
}

func (h *Handler) ListLocations(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	businessID := chi.URLParam(r, "id")

	var ownerID string
	err := h.DB.QueryRow(r.Context(), "SELECT owner_user_id FROM businesses WHERE id = $1", businessID).Scan(&ownerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}
	if ownerID != userID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	rows, err := h.DB.Query(r.Context(),
		"SELECT id, business_id, name, address, google_account_id, google_location_id, poll_enabled, last_polled_at, created_at FROM locations WHERE business_id = $1 ORDER BY created_at DESC",
		businessID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	defer rows.Close()

	locations := []location{}
	for rows.Next() {
		var l location
		if err := rows.Scan(&l.ID, &l.BusinessID, &l.Name, &l.Address, &l.GoogleAccountID, &l.GoogleLocationID, &l.PollEnabled, &l.LastPolledAt, &l.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		locations = append(locations, l)
	}

	writeJSON(w, http.StatusOK, locations)
}

func (h *Handler) DeleteLocation(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	businessID := chi.URLParam(r, "id")
	locationID := chi.URLParam(r, "lid")

	var ownerID string
	err := h.DB.QueryRow(r.Context(), "SELECT owner_user_id FROM businesses WHERE id = $1", businessID).Scan(&ownerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}
	if ownerID != userID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	_, err = h.DB.Exec(r.Context(), "DELETE FROM locations WHERE id = $1 AND business_id = $2", locationID, businessID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
