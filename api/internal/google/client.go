package google

import (
	"context"
	"net/http"

	"golang.org/x/oauth2"
)

type Client struct {
	httpClient *http.Client
}

func NewClient(ctx context.Context, oauthCfg *oauth2.Config, refreshToken string) *Client {
	token := &oauth2.Token{RefreshToken: refreshToken}
	return &Client{
		httpClient: oauthCfg.Client(ctx, token),
	}
}
