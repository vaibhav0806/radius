package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	DatabaseURL        string
	OpenAIAPIKey       string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	BaseURL            string
	JWTSecret          string
	Port                       string
	ResendAPIKey               string
	NotificationFromEmail      string
	DodoPaymentsAPIKey         string
	DodoPaymentsWebhookSecret string
	DodoPaymentsProductID      string
	DodoPaymentsEnvironment    string
	EncryptionKey              string
}

func Load() (*Config, error) {
	cfg := &Config{
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://localhost:5432/review_responder?sslmode=disable"),
		OpenAIAPIKey:       getEnv("OPENAI_API_KEY", ""),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/google/callback"),
		BaseURL:            getEnv("BASE_URL", "http://localhost:3000"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-change-me"),
		Port:                       getEnv("PORT", "8080"),
		ResendAPIKey:               getEnv("RESEND_API_KEY", ""),
		NotificationFromEmail:      getEnv("NOTIFICATION_FROM_EMAIL", "notifications@reviewflow.app"),
		DodoPaymentsAPIKey:         getEnv("DODO_PAYMENTS_API_KEY", ""),
		DodoPaymentsWebhookSecret: getEnv("DODO_PAYMENTS_WEBHOOK_SECRET", ""),
		DodoPaymentsProductID:      getEnv("DODO_PAYMENTS_PRODUCT_ID", ""),
		DodoPaymentsEnvironment:    getEnv("DODO_PAYMENTS_ENVIRONMENT", "test_mode"),
		EncryptionKey:              getEnv("ENCRYPTION_KEY", ""),
	}

	var errs []string
	if cfg.JWTSecret == "dev-secret-change-me" || cfg.JWTSecret == "" {
		errs = append(errs, "JWT_SECRET must be set to a secure value (not the default)")
	}
	if cfg.EncryptionKey == "" {
		errs = append(errs, "ENCRYPTION_KEY must be set (32-byte hex-encoded key for AES-256)")
	}
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
		errs = append(errs, "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
	}
	if cfg.OpenAIAPIKey == "" {
		errs = append(errs, "OPENAI_API_KEY must be set")
	}
	if cfg.DodoPaymentsAPIKey == "" {
		errs = append(errs, "DODO_PAYMENTS_API_KEY must be set")
	}
	if cfg.DodoPaymentsWebhookSecret == "" {
		errs = append(errs, "DODO_PAYMENTS_WEBHOOK_SECRET must be set")
	}
	if len(errs) > 0 {
		return nil, fmt.Errorf("config validation failed:\n  - %s", joinErrors(errs))
	}

	return cfg, nil
}

func joinErrors(errs []string) string {
	return strings.Join(errs, "\n  - ")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
