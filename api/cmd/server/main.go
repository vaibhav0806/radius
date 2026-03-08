package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/vaibhav/review-responder/internal/config"
	"github.com/vaibhav/review-responder/internal/db"
	"github.com/vaibhav/review-responder/internal/handler"
	"github.com/vaibhav/review-responder/internal/middleware"
	"github.com/vaibhav/review-responder/internal/worker"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	h := handler.New(pool, cfg)

	pollerCtx, pollerCancel := context.WithCancel(context.Background())
	defer pollerCancel()
	poller := worker.NewPoller(pool, cfg)
	go poller.Start(pollerCtx)

	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.BaseURL},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", h.HealthCheck)

		r.Post("/auth/register", h.Register)
		r.Post("/auth/login", h.Login)

		r.Get("/google/callback", h.GoogleCallback)
		r.Post("/billing/webhook", h.BillingWebhook)

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg.JWTSecret))

			r.Get("/businesses", h.ListBusinesses)
			r.Post("/businesses", h.CreateBusiness)

			r.Get("/google/auth", h.GoogleAuth)
			r.Get("/businesses/{id}/locations", h.ListLocations)
			r.Delete("/businesses/{id}/locations/{lid}", h.DeleteLocation)

			r.Get("/locations/{id}/reviews", h.ListReviews)
			r.Get("/locations/{id}/reviews/stats", h.LocationReviewStats)

			r.Get("/dashboard/stats", h.DashboardStats)

			r.Get("/reviews/{id}/response", h.GetResponse)
			r.Put("/reviews/{id}/response", h.UpdateResponse)
			r.Post("/reviews/{id}/response/regenerate", h.RegenerateResponse)
			r.Post("/reviews/{id}/response/approve", h.ApproveResponse)
			r.Post("/reviews/{id}/response/skip", h.SkipResponse)

			r.Put("/businesses/{id}/brand-voice", h.UpdateBrandVoice)

			r.Post("/billing/checkout", h.BillingCheckout)
			r.Get("/billing/status", h.BillingStatus)
			r.Post("/billing/cancel", h.BillingCancel)
		})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("server starting on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down server...")
	pollerCancel()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}
	log.Println("server stopped")
}
