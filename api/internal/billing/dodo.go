package billing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewClient(apiKey, environment string) *Client {
	baseURL := "https://test.dodopayments.com"
	if environment == "live_mode" {
		baseURL = "https://live.dodopayments.com"
	}
	return &Client{apiKey: apiKey, baseURL: baseURL, httpClient: &http.Client{Timeout: 30 * time.Second}}
}

type CheckoutSession struct {
	SessionID   string `json:"session_id"`
	CheckoutURL string `json:"checkout_url"`
}

type Subscription struct {
	SubscriptionID          string         `json:"subscription_id"`
	Status                  string         `json:"status"`
	NextBillingDate         string         `json:"next_billing_date"`
	CancelAtNextBillingDate bool           `json:"cancel_at_next_billing_date"`
	Customer                map[string]any `json:"customer"`
	Metadata                map[string]any `json:"metadata"`
}

type CheckoutRequest struct {
	ProductCart []CartItem     `json:"product_cart"`
	Customer    CustomerInfo   `json:"customer"`
	ReturnURL   string         `json:"return_url"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type CartItem struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type CustomerInfo struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (c *Client) CreateCheckoutSession(ctx context.Context, req *CheckoutRequest) (*CheckoutSession, error) {
	var session CheckoutSession
	if err := c.do(ctx, http.MethodPost, "/checkouts", req, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func (c *Client) GetSubscription(ctx context.Context, subscriptionID string) (*Subscription, error) {
	var sub Subscription
	if err := c.do(ctx, http.MethodGet, "/subscriptions/"+subscriptionID, nil, &sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (c *Client) CancelSubscription(ctx context.Context, subscriptionID string) error {
	body := map[string]bool{"cancel_at_next_billing_date": true}
	return c.do(ctx, http.MethodPatch, "/subscriptions/"+subscriptionID, body, nil)
}

func (c *Client) do(ctx context.Context, method, path string, payload any, dest any) error {
	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("dodo API returned %d: %s", resp.StatusCode, respBody)
	}

	if dest != nil {
		if err := json.Unmarshal(respBody, dest); err != nil {
			return err
		}
	}
	return nil
}
