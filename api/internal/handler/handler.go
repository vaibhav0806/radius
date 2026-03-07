package handler

import (
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/vaibhav/review-responder/internal/config"
)

type Handler struct {
	DB  *pgxpool.Pool
	Cfg *config.Config
}

func New(db *pgxpool.Pool, cfg *config.Config) *Handler {
	return &Handler{DB: db, Cfg: cfg}
}
