package handler

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/vaibhav/review-responder/internal/google"
	"github.com/vaibhav/review-responder/internal/middleware"
)

func (h *Handler) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	businessID := r.URL.Query().Get("business_id")
	if businessID == "" {
		writeError(w, http.StatusBadRequest, "business_id is required")
		return
	}

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

	cfg := google.OAuthConfig(h.Cfg.GoogleClientID, h.Cfg.GoogleClientSecret, h.Cfg.GoogleRedirectURL)
	state := base64.URLEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", userID, businessID)))
	url := cfg.AuthCodeURL(state)

	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	stateParam := r.URL.Query().Get("state")
	if code == "" || stateParam == "" {
		writeError(w, http.StatusBadRequest, "missing code or state")
		return
	}

	stateBytes, err := base64.URLEncoding.DecodeString(stateParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid state")
		return
	}
	parts := strings.SplitN(string(stateBytes), ":", 2)
	if len(parts) != 2 {
		writeError(w, http.StatusBadRequest, "invalid state")
		return
	}
	userID, businessID := parts[0], parts[1]

	var ownerID string
	err = h.DB.QueryRow(r.Context(), "SELECT owner_user_id FROM businesses WHERE id = $1", businessID).Scan(&ownerID)
	if err != nil || ownerID != userID {
		writeError(w, http.StatusBadRequest, "invalid state")
		return
	}

	oauthCfg := google.OAuthConfig(h.Cfg.GoogleClientID, h.Cfg.GoogleClientSecret, h.Cfg.GoogleRedirectURL)
	token, err := google.ExchangeCode(r.Context(), oauthCfg, code)
	if err != nil {
		log.Printf("failed to exchange code: %v", err)
		writeError(w, http.StatusBadGateway, "failed to exchange authorization code")
		return
	}

	client := google.NewClient(r.Context(), oauthCfg, token.RefreshToken)

	accounts, err := client.ListAccounts(r.Context())
	if err != nil {
		log.Printf("failed to list accounts: %v", err)
		writeError(w, http.StatusBadGateway, "failed to fetch Google Business accounts")
		return
	}

	for _, account := range accounts {
		locations, err := client.ListLocations(r.Context(), account.Name)
		if err != nil {
			log.Printf("failed to list locations for %s: %v", account.Name, err)
			continue
		}

		for _, loc := range locations {
			address := formatAddress(loc.StorefrontAddress)
			_, err := h.DB.Exec(r.Context(),
				`INSERT INTO locations (business_id, name, address, google_account_id, google_location_id, google_refresh_token, poll_enabled)
				VALUES ($1, $2, $3, $4, $5, $6, true)
				ON CONFLICT (google_location_id) DO UPDATE SET google_refresh_token = $6, poll_enabled = true`,
				businessID, loc.Title, address, account.Name, loc.Name, token.RefreshToken,
			)
			if err != nil {
				log.Printf("failed to upsert location %s: %v", loc.Name, err)
			}
		}
	}

	http.Redirect(w, r, h.Cfg.BaseURL+"/settings?connected=true", http.StatusFound)
}

func formatAddress(addr *google.Address) string {
	if addr == nil {
		return ""
	}
	parts := append(addr.AddressLines, addr.Locality)
	var nonEmpty []string
	for _, p := range parts {
		if p != "" {
			nonEmpty = append(nonEmpty, p)
		}
	}
	return strings.Join(nonEmpty, ", ")
}
