package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	apiKey     string
	fromEmail  string
	httpClient *http.Client
}

func NewClient(apiKey, fromEmail string) *Client {
	return &Client{apiKey: apiKey, fromEmail: fromEmail, httpClient: &http.Client{Timeout: 10 * time.Second}}
}

type sendRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
}

func (c *Client) Send(ctx context.Context, to, subject, html string) error {
	if c.apiKey == "" {
		return nil
	}

	reqBody := sendRequest{
		From:    c.fromEmail,
		To:      []string{to},
		Subject: subject,
		Html:    html,
	}

	body, _ := json.Marshal(reqBody)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend API returned %d", resp.StatusCode)
	}
	return nil
}
