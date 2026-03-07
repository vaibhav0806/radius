package google

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type Account struct {
	Name        string `json:"name"`
	AccountName string `json:"accountName"`
	Type        string `json:"type"`
}

type Location struct {
	Name              string   `json:"name"`
	Title             string   `json:"title"`
	StorefrontAddress *Address `json:"storefrontAddress,omitempty"`
}

type Address struct {
	AddressLines []string `json:"addressLines"`
	Locality     string   `json:"locality"`
	RegionCode   string   `json:"regionCode"`
}

type accountsResponse struct {
	Accounts []Account `json:"accounts"`
}

type locationsResponse struct {
	Locations []Location `json:"locations"`
}

func (c *Client) ListAccounts(ctx context.Context) ([]Account, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts", nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching accounts: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google accounts API returned %d: %s", resp.StatusCode, body)
	}

	var result accountsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding accounts response: %w", err)
	}

	return result.Accounts, nil
}

func (c *Client) ListLocations(ctx context.Context, accountName string) ([]Location, error) {
	url := fmt.Sprintf("https://mybusinessbusinessinformation.googleapis.com/v1/%s/locations?readMask=name,title,storefrontAddress", accountName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching locations: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google locations API returned %d: %s", resp.StatusCode, body)
	}

	var result locationsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding locations response: %w", err)
	}

	return result.Locations, nil
}
