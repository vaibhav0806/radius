package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/vaibhav/review-responder/internal/billing"
	"github.com/vaibhav/review-responder/internal/middleware"
)

func (h *Handler) BillingCheckout(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.StripeSecretKey == "" || h.Cfg.StripePriceID == "" {
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

	var stripeCustomerID *string
	err := h.DB.QueryRow(r.Context(),
		"SELECT stripe_customer_id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		req.BusinessID, userID,
	).Scan(&stripeCustomerID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	client := billing.NewClient(h.Cfg.StripeSecretKey)

	if stripeCustomerID == nil || *stripeCustomerID == "" {
		var email, name string
		err := h.DB.QueryRow(r.Context(),
			"SELECT email, name FROM users WHERE id = $1", userID,
		).Scan(&email, &name)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}

		cust, err := client.CreateCustomer(r.Context(), email, name)
		if err != nil {
			writeError(w, http.StatusBadGateway, "failed to create stripe customer")
			return
		}

		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET stripe_customer_id = $1 WHERE id = $2",
			cust.ID, req.BusinessID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
		stripeCustomerID = &cust.ID
	}

	session, err := client.CreateCheckoutSession(
		r.Context(),
		*stripeCustomerID,
		h.Cfg.StripePriceID,
		h.Cfg.BaseURL+"/settings?billing=success",
		h.Cfg.BaseURL+"/settings?billing=cancel",
	)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to create checkout session")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"url": session.URL})
}

func (h *Handler) BillingStatus(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.StripeSecretKey == "" {
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
	var stripeSubscriptionID *string
	err := h.DB.QueryRow(r.Context(),
		"SELECT subscription_status, stripe_subscription_id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		businessID, userID,
	).Scan(&subscriptionStatus, &stripeSubscriptionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	resp := map[string]any{
		"status":              subscriptionStatus,
		"cancel_at_period_end": false,
	}

	if stripeSubscriptionID != nil && *stripeSubscriptionID != "" {
		client := billing.NewClient(h.Cfg.StripeSecretKey)
		sub, err := client.GetSubscription(r.Context(), *stripeSubscriptionID)
		if err == nil {
			resp["status"] = sub.Status
			resp["current_period_end"] = time.Unix(sub.CurrentPeriodEnd, 0).Format(time.RFC3339)
			resp["cancel_at_period_end"] = sub.CancelAtPeriodEnd
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *Handler) BillingCancel(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.StripeSecretKey == "" {
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

	var stripeSubscriptionID *string
	err := h.DB.QueryRow(r.Context(),
		"SELECT stripe_subscription_id FROM businesses WHERE id = $1 AND owner_user_id = $2",
		req.BusinessID, userID,
	).Scan(&stripeSubscriptionID)
	if err != nil {
		writeError(w, http.StatusNotFound, "business not found")
		return
	}

	if stripeSubscriptionID == nil || *stripeSubscriptionID == "" {
		writeError(w, http.StatusBadRequest, "no active subscription")
		return
	}

	client := billing.NewClient(h.Cfg.StripeSecretKey)
	if err := client.CancelSubscription(r.Context(), *stripeSubscriptionID); err != nil {
		writeError(w, http.StatusBadGateway, "failed to cancel subscription")
		return
	}

	sub, err := client.GetSubscription(r.Context(), *stripeSubscriptionID)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to fetch subscription status")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":              sub.Status,
		"current_period_end":   time.Unix(sub.CurrentPeriodEnd, 0).Format(time.RFC3339),
		"cancel_at_period_end": sub.CancelAtPeriodEnd,
	})
}

func (h *Handler) BillingWebhook(w http.ResponseWriter, r *http.Request) {
	if h.Cfg.StripeWebhookSecret == "" {
		writeError(w, http.StatusServiceUnavailable, "billing webhooks not configured")
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read body")
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	if err := billing.VerifyWebhookSignature(body, sigHeader, h.Cfg.StripeWebhookSecret); err != nil {
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

	var obj struct {
		Object json.RawMessage `json:"object"`
	}
	if err := json.Unmarshal(event.Data, &obj); err != nil {
		writeError(w, http.StatusBadRequest, "invalid event data")
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session struct {
			Customer     string `json:"customer"`
			Subscription string `json:"subscription"`
		}
		if err := json.Unmarshal(obj.Object, &session); err != nil {
			writeError(w, http.StatusBadRequest, "invalid session data")
			return
		}
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET stripe_subscription_id = $1, subscription_status = 'active' WHERE stripe_customer_id = $2",
			session.Subscription, session.Customer,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}

	case "customer.subscription.updated":
		var sub struct {
			ID     string `json:"id"`
			Status string `json:"status"`
		}
		if err := json.Unmarshal(obj.Object, &sub); err != nil {
			writeError(w, http.StatusBadRequest, "invalid subscription data")
			return
		}
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET subscription_status = $1 WHERE stripe_subscription_id = $2",
			sub.Status, sub.ID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}

	case "customer.subscription.deleted":
		var sub struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(obj.Object, &sub); err != nil {
			writeError(w, http.StatusBadRequest, "invalid subscription data")
			return
		}
		_, err = h.DB.Exec(r.Context(),
			"UPDATE businesses SET subscription_status = 'inactive', stripe_subscription_id = NULL WHERE stripe_subscription_id = $1",
			sub.ID,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal server error")
			return
		}
	}

	w.WriteHeader(http.StatusOK)
}
