package billing

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type Client struct {
	secretKey  string
	httpClient *http.Client
}

func NewClient(secretKey string) *Client {
	return &Client{secretKey: secretKey, httpClient: &http.Client{}}
}

type CheckoutSession struct {
	ID  string `json:"id"`
	URL string `json:"url"`
}

type Subscription struct {
	ID                string `json:"id"`
	Status            string `json:"status"`
	CurrentPeriodEnd  int64  `json:"current_period_end"`
	CancelAtPeriodEnd bool   `json:"cancel_at_period_end"`
}

type Customer struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (c *Client) CreateCustomer(ctx context.Context, email, name string) (*Customer, error) {
	data := url.Values{}
	data.Set("email", email)
	data.Set("name", name)

	var cust Customer
	if err := c.do(ctx, http.MethodPost, "https://api.stripe.com/v1/customers", data, &cust); err != nil {
		return nil, err
	}
	return &cust, nil
}

func (c *Client) CreateCheckoutSession(ctx context.Context, customerID, priceID, successURL, cancelURL string) (*CheckoutSession, error) {
	data := url.Values{}
	data.Set("customer", customerID)
	data.Set("mode", "subscription")
	data.Set("line_items[0][price]", priceID)
	data.Set("line_items[0][quantity]", "1")
	data.Set("success_url", successURL)
	data.Set("cancel_url", cancelURL)

	var session CheckoutSession
	if err := c.do(ctx, http.MethodPost, "https://api.stripe.com/v1/checkout/sessions", data, &session); err != nil {
		return nil, err
	}
	return &session, nil
}

func (c *Client) GetSubscription(ctx context.Context, subscriptionID string) (*Subscription, error) {
	var sub Subscription
	if err := c.do(ctx, http.MethodGet, "https://api.stripe.com/v1/subscriptions/"+subscriptionID, nil, &sub); err != nil {
		return nil, err
	}
	return &sub, nil
}

func (c *Client) CancelSubscription(ctx context.Context, subscriptionID string) error {
	data := url.Values{}
	data.Set("cancel_at_period_end", "true")
	return c.do(ctx, http.MethodPost, "https://api.stripe.com/v1/subscriptions/"+subscriptionID, data, nil)
}

func (c *Client) do(ctx context.Context, method, endpoint string, data url.Values, dest any) error {
	var body io.Reader
	if data != nil {
		body = strings.NewReader(data.Encode())
	}

	req, err := http.NewRequestWithContext(ctx, method, endpoint, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.secretKey)
	if data != nil {
		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
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
		return fmt.Errorf("stripe API returned %d: %s", resp.StatusCode, respBody)
	}

	if dest != nil {
		if err := json.Unmarshal(respBody, dest); err != nil {
			return err
		}
	}
	return nil
}
