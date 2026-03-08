package handler

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/vaibhav/review-responder/internal/billing"
	"github.com/vaibhav/review-responder/internal/middleware"
)

func (h *Handler) BillingCheckout(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.DodoPaymentsAPIKey == "" || h.Cfg.DodoPaymentsProductID == "" {
		writeError(w, http.StatusServiceUnavailable, "billing is not configured")
		return
	}

	userID := middleware.GetUserID(r.Context())

	var req struct {
		BusinessID string `json:"business_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.BusinessID == "" {
		writeError(w, http.StatusBadRequest, "business_id is required")
		return
	}

	// Verify business ownership
	var bizID string
	err := h.DB.QueryRow(r.Context(),
		"SELECT id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		req.BusinessID, userID,
	).Scan(&bizID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	// Get user email and name for checkout
	var email, name string
	err = h.DB.QueryRow(r.Context(),
		"SELECT email, name FROM users WHERE id = $1", userID,
	).Scan(&email, &name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	client := billing.NewClient(h.Cfg.DodoPaymentsAPIKey, h.Cfg.DodoPaymentsEnvironment)
	session, err := client.CreateCheckoutSession(r.Context(), &billing.CheckoutRequest{
		ProductCart: []billing.CartItem{
			{ProductID: h.Cfg.DodoPaymentsProductID, Quantity: 1},
		},
		Customer: billing.CustomerInfo{
			Email: email,
			Name:  name,
		},
		ReturnURL: h.Cfg.BaseURL + "/settings?billing=success",
		Metadata: map[string]any{
			"business_id": req.BusinessID,
		},
	})
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to create checkout session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": session.CheckoutURL})
}

func (h *Handler) BillingStatus(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.DodoPaymentsAPIKey == "" {
		writeError(w, http.StatusServiceUnavailable, "billing is not configured")
		return
	}

	userID := middleware.GetUserID(r.Context())
	businessID := r.URL.Query().Get("business_id")
	if businessID == "" {
		writeError(w, http.StatusBadRequest, "business_id is required")
		return
	}

	var subscriptionStatus string
	var dodoSubscriptionID *string
	err := h.DB.QueryRow(r.Context(),
		"SELECT subscription_status, dodo_subscription_id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		businessID, userID,
	).Scan(&subscriptionStatus, &dodoSubscriptionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	resp := map[string]any{
		"status":              subscriptionStatus,
		"cancel_at_period_end": false,
	}

	if dodoSubscriptionID != nil && *dodoSubscriptionID != "" {
		client := billing.NewClient(h.Cfg.DodoPaymentsAPIKey, h.Cfg.DodoPaymentsEnvironment)
		sub, err := client.GetSubscription(r.Context(), *dodoSubscriptionID)
		if err == nil {
			resp["status"] = sub.Status
			resp["next_billing_date"] = sub.NextBillingDate
			resp["cancel_at_period_end"] = sub.CancelAtNextBillingDate
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) BillingCancel(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.DodoPaymentsAPIKey == "" {
		writeError(w, http.StatusServiceUnavailable, "billing is not configured")
		return
	}

	userID := middleware.GetUserID(r.Context())

	var req struct {
		BusinessID string `json:"business_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.BusinessID == "" {
		writeError(w, http.StatusBadRequest, "business_id is required")
		return
	}

	var dodoSubscriptionID *string
	err := h.DB.QueryRow(r.Context(),
		"SELECT dodo_subscription_id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		req.BusinessID, userID,
	).Scan(&dodoSubscriptionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	if dodoSubscriptionID == nil || *dodoSubscriptionID == "" {
		writeError(w, http.StatusBadRequest, "no active subscription")
		return
	}

	client := billing.NewClient(h.Cfg.DodoPaymentsAPIKey, h.Cfg.DodoPaymentsEnvironment)
	if err := client.CancelSubscription(r.Context(), *dodoSubscriptionID); err != nil {
		writeError(w, http.StatusBadGateway, "failed to cancel subscription")
		return
	}

	sub, err := client.GetSubscription(r.Context(), *dodoSubscriptionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch subscription status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":              sub.Status,
		"next_billing_date":   sub.NextBillingDate,
		"cancel_at_period_end": sub.CancelAtNextBillingDate,
	})
}

func (h *Handler) BillingWebhook(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.DodoPaymentsWebhookSecret == "" {
		writeError(w, http.StatusServiceUnavailable, "billing webhooks not configured")
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	if err := billing.VerifyWebhookSignature(
		body,
		r.Header.Get("webhook-id"),
		r.Header.Get("webhook-timestamp"),
		r.Header.Get("webhook-signature"),
		h.Cfg.DodoPaymentsWebhookSecret,
	); err != nil {
		writeError(w, http.StatusBadRequest, "invalid signature")
		return
	}

	var event struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		writeError(w, http.StatusBadRequest, "invalid event payload")
		return
	}

	var payload struct {
		SubscriptionID string         `json:"subscription_id"`
		Status         string         `json:"status"`
		Customer       struct {
			CustomerID string `json:"customer_id"`
		} `json:"customer"`
		Metadata map[string]any `json:"metadata"`
	}
	if err := json.Unmarshal(event.Data, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid event data")
		return
	}

	switch event.Type {
	case "subscription.active":
		businessID, _ := payload.Metadata["business_id"].(string)
		if businessID != "" {
			_, err = h.DB.Exec(r.Context(),
				"UPDATE businesses SET dodo_subscription_id = $1, dodo_customer_id = $2, subscription_status = 'active' WHERE id = $3",
				payload.SubscriptionID, payload.Customer.CustomerID, businessID,
			)
		} else {
			// Fallback: match by dodo_customer_id
			_, err = h.DB.Exec(r.Context(),
				"UPDATE businesses SET dodo_subscription_id = $1, subscription_status = 'active' WHERE dodo_customer_id = $2",
				payload.SubscriptionID, payload.Customer.CustomerID,
			)
		}

	case "subscription.cancelled", "subscription.expired":
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET subscription_status = 'inactive', dodo_subscription_id = NULL WHERE dodo_subscription_id = $1",
			payload.SubscriptionID,
		)

	case "subscription.failed", "subscription.on_hold":
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET subscription_status = $1 WHERE dodo_subscription_id = $2",
			payload.Status, payload.SubscriptionID,
		)

	case "subscription.renewed":
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET subscription_status = 'active' WHERE dodo_subscription_id = $1",
			payload.SubscriptionID,
		)
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusOK)
}
