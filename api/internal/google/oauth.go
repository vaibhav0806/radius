package google

import (
	"context"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func OAuthConfig(clientID, clientSecret, redirectURL string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes:       []string{"https://www.googleapis.com/auth/business.manage"},
		Endpoint:     google.Endpoint,
	}
}

func ExchangeCode(ctx context.Context, cfg *oauth2.Config, code string) (*oauth2.Token, error) {
	return cfg.Exchange(ctx, code)
}
