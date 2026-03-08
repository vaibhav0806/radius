package handler

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vaibhav/review-responder/internal/config"
)

var (
	errNotFound  = errors.New("not found")
	errForbidden = errors.New("forbidden")
)

type Handler struct {
	DB  *pgxpool.Pool
	Cfg *config.Config
}

func New(db *pgxpool.Pool, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
}

func (h *Handler) verifyLocationOwner(ctx context.Context, locationID, userID string) error {
	var ownerID string
	err := h.DB.QueryRow(ctx,
		"SELECT b.owner_user_id FROM businesses b JOIN locations l ON l.business_id = b.id WHERE l.id = $1",
		locationID,
	).Scan(&ownerID)
	if err != nil {
		return errNotFound
	}
	if ownerID != userID {
		return errForbidden
	}
	return nil
}

func (h *Handler) verifyReviewOwner(ctx context.Context, reviewID, userID string) error {
	var ownerID string
	err := h.DB.QueryRow(ctx,
		"SELECT b.owner_user_id FROM businesses b JOIN locations l ON l.business_id = b.id JOIN reviews r ON r.location_id = l.id WHERE r.id = $1",
		reviewID,
	).Scan(&ownerID)
	if err != nil {
		return errNotFound
	}
	if ownerID != userID {
		return errForbidden
	}
	return nil
}
