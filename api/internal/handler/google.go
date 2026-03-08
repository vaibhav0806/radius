package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"strings"

	"golang.org/x/oauth2"

	"github.com/vaibhav/review-responder/internal/crypto"
	"github.com/vaibhav/review-responder/internal/google"
	"github.com/vaibhav/review-responder/internal/middleware"
)

func (h *Handler) signState(payload string) string {
	mac := hmac.New(sha256.New, []byte(h.Cfg.JWTSecret))
	mac.Write([]byte(payload))
	sig := base64.URLEncoding.EncodeToString(mac.Sum(nil))
	encoded := base64.URLEncoding.EncodeToString([]byte(payload))
	return encoded + "." + sig
}

func (h *Handler) verifyState(state string) (string, string, error) {
	parts := strings.SplitN(state, ".", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid state format")
	}

	payload, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return "", "", fmt.Errorf("invalid state encoding")
	}

	mac := hmac.New(sha256.New, []byte(h.Cfg.JWTSecret))
	mac.Write(payload)
	expectedSig := base64.URLEncoding.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
		return "", "", fmt.Errorf("invalid state signature")
	}

	idParts := strings.SplitN(string(payload), ":", 2)
	if len(idParts) != 2 {
		return "", "", fmt.Errorf("invalid state payload")
	}

	return idParts[0], idParts[1], nil
}

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
	state := h.signState(fmt.Sprintf("%s:%s", userID, businessID))
	url := cfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))

	writeJSON(w, http.StatusOK, map[string]string{"url": url})
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	stateParam := r.URL.Query().Get("state")
	if code == "" || stateParam == "" {
		writeError(w, http.StatusBadRequest, "missing code or state")
		return
	}

	userID, businessID, err := h.verifyState(stateParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid state")
		return
	}

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

	encryptedToken, err := crypto.Encrypt(token.RefreshToken, h.Cfg.EncryptionKey)
	if err != nil {
		log.Printf("failed to encrypt refresh token: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
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
				businessID, loc.Title, address, account.Name, loc.Name, encryptedToken,
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
