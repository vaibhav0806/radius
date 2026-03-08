package config

import "os"

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
}

func Load() *Config {
	return &Config{
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
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
