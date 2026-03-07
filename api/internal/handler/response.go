package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vaibhav/review-responder/internal/google"
	"github.com/vaibhav/review-responder/internal/middleware"
	"github.com/vaibhav/review-responder/internal/openai"
)

type responseObj struct {
	ID               string     `json:"id"`
	ReviewID         string     `json:"review_id"`
	DraftText        string     `json:"draft_text"`
	FinalText        *string    `json:"final_text"`
	Status           string     `json:"status"`
	GeneratedAt      time.Time  `json:"generated_at"`
	ApprovedAt       *time.Time `json:"approved_at"`
	SentAt           *time.Time `json:"sent_at"`
	ApprovedByUserID *string    `json:"approved_by_user_id"`
}

func (h *Handler) GetResponse(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")

	var resp responseObj
	err := h.DB.QueryRow(r.Context(),
		"SELECT id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id FROM responses WHERE review_id = $1",
		reviewID,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "response not found")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) RegenerateResponse(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")

	var body struct {
		Instructions string `json:"instructions"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&body)
	}

	var authorName, reviewText string
	var rating int
	var locationID string
	err := h.DB.QueryRow(r.Context(),
		"SELECT author_name, COALESCE(text, ''), rating, location_id FROM reviews WHERE id = $1",
		reviewID,
	).Scan(&authorName, &reviewText, &rating, &locationID)
	if err != nil {
		writeError(w, http.StatusNotFound, "review not found")
		return
	}

	var businessName, businessType string
	var brandVoiceJSON []byte
	err = h.DB.QueryRow(r.Context(),
		"SELECT b.name, b.type, b.brand_voice_config FROM businesses b JOIN locations l ON l.business_id = b.id WHERE l.id = $1",
		locationID,
	).Scan(&businessName, &businessType, &brandVoiceJSON)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	var brandVoice openai.BrandVoice
	if len(brandVoiceJSON) > 0 {
		_ = json.Unmarshal(brandVoiceJSON, &brandVoice)
	}

	client := openai.NewClient(h.Cfg.OpenAIAPIKey)
	draftText, err := client.DraftResponse(r.Context(), openai.DraftRequest{
		BusinessName: businessName,
		BusinessType: businessType,
		BrandVoice:   brandVoice,
		ReviewerName: authorName,
		Rating:       rating,
		ReviewText:   reviewText,
		Instructions: body.Instructions,
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to generate response")
		return
	}

	var resp responseObj
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO responses (review_id, draft_text, status)
		VALUES ($1, $2, 'draft')
		ON CONFLICT (review_id) DO UPDATE SET draft_text = $2, status = 'draft', generated_at = now()
		RETURNING id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id`,
		reviewID, draftText,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) UpdateResponse(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")

	var body struct {
		DraftText string `json:"draft_text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var resp responseObj
	err := h.DB.QueryRow(r.Context(),
		`UPDATE responses SET draft_text = $1 WHERE review_id = $2
		RETURNING id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id`,
		body.DraftText, reviewID,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "response not found")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) ApproveResponse(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())

	var resp responseObj
	err := h.DB.QueryRow(r.Context(),
		`UPDATE responses SET status = 'approved', final_text = draft_text, approved_at = now(), approved_by_user_id = $1
		WHERE review_id = $2
		RETURNING id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id`,
		userID, reviewID,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "response not found")
		return
	}

	var googleReviewID, googleAccountID, googleLocationID, googleRefreshToken string
	err = h.DB.QueryRow(r.Context(),
		`SELECT r.google_review_id, l.google_account_id, l.google_location_id, l.google_refresh_token
		FROM reviews r JOIN locations l ON l.id = r.location_id
		WHERE r.id = $1`,
		reviewID,
	).Scan(&googleReviewID, &googleAccountID, &googleLocationID, &googleRefreshToken)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	reviewName := googleAccountID + "/" + googleLocationID + "/reviews/" + googleReviewID
	oauthCfg := google.OAuthConfig(h.Cfg.GoogleClientID, h.Cfg.GoogleClientSecret, h.Cfg.GoogleRedirectURL)
	gClient := google.NewClient(r.Context(), oauthCfg, googleRefreshToken)

	if err := gClient.ReplyToReview(r.Context(), reviewName, *resp.FinalText); err != nil {
		writeJSON(w, http.StatusOK, resp)
		return
	}

	err = h.DB.QueryRow(r.Context(),
		`UPDATE responses SET status = 'sent', sent_at = now() WHERE id = $1
		RETURNING id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id`,
		resp.ID,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) SkipResponse(w http.ResponseWriter, r *http.Request) {
	reviewID := chi.URLParam(r, "id")

	var resp responseObj
	err := h.DB.QueryRow(r.Context(),
		`UPDATE responses SET status = 'skipped' WHERE review_id = $1
		RETURNING id, review_id, draft_text, final_text, status, generated_at, approved_at, sent_at, approved_by_user_id`,
		reviewID,
	).Scan(&resp.ID, &resp.ReviewID, &resp.DraftText, &resp.FinalText, &resp.Status, &resp.GeneratedAt, &resp.ApprovedAt, &resp.SentAt, &resp.ApprovedByUserID)
	if err != nil {
		writeError(w, http.StatusNotFound, "response not found")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
