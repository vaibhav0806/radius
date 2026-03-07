package worker

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"

	"github.com/vaibhav/review-responder/internal/config"
	"github.com/vaibhav/review-responder/internal/email"
	"github.com/vaibhav/review-responder/internal/google"
	"github.com/vaibhav/review-responder/internal/openai"
)

type Poller struct {
	db     *pgxpool.Pool
	cfg    *config.Config
	openai *openai.Client
	email  *email.Client
}

func NewPoller(db *pgxpool.Pool, cfg *config.Config) *Poller {
	p := &Poller{db: db, cfg: cfg}
	if cfg.OpenAIAPIKey != "" {
		p.openai = openai.NewClient(cfg.OpenAIAPIKey)
	} else {
		log.Println("warning: OPENAI_API_KEY not set, sentiment analysis and draft generation disabled")
	}
	p.email = email.NewClient(cfg.ResendAPIKey, cfg.NotificationFromEmail)
	if cfg.ResendAPIKey == "" {
		log.Println("warning: RESEND_API_KEY not set, email notifications disabled")
	}
	return p
}

func (p *Poller) Start(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()

	p.pollAll(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("review poller stopped")
			return
		case <-ticker.C:
			p.pollAll(ctx)
		}
	}
}

type pollableLocation struct {
	ID                 string
	GoogleAccountID    string
	GoogleLocationID   string
	GoogleRefreshToken string
}

func (p *Poller) pollAll(ctx context.Context) {
	rows, err := p.db.Query(ctx,
		"SELECT id, google_account_id, google_location_id, google_refresh_token FROM locations WHERE poll_enabled = true",
	)
	if err != nil {
		log.Printf("poller: failed to query locations: %v", err)
		return
	}
	defer rows.Close()

	var locations []pollableLocation
	for rows.Next() {
		var loc pollableLocation
		if err := rows.Scan(&loc.ID, &loc.GoogleAccountID, &loc.GoogleLocationID, &loc.GoogleRefreshToken); err != nil {
			log.Printf("poller: failed to scan location: %v", err)
			continue
		}
		locations = append(locations, loc)
	}

	var totalNew int
	oauthCfg := google.OAuthConfig(p.cfg.GoogleClientID, p.cfg.GoogleClientSecret, p.cfg.GoogleRedirectURL)

	for _, loc := range locations {
		n, err := p.pollLocation(ctx, oauthCfg, loc)
		if err != nil {
			log.Printf("poller: error polling location %s: %v", loc.ID, err)
			continue
		}
		totalNew += n

		if _, err := p.db.Exec(ctx, "UPDATE locations SET last_polled_at = now() WHERE id = $1", loc.ID); err != nil {
			log.Printf("poller: failed to update last_polled_at for %s: %v", loc.ID, err)
		}
	}

	log.Printf("polled %d locations, found %d new reviews", len(locations), totalNew)
}

func (p *Poller) pollLocation(ctx context.Context, oauthCfg *oauth2.Config, loc pollableLocation) (int, error) {
	client := google.NewClient(ctx, oauthCfg, loc.GoogleRefreshToken)

	locationID := strings.TrimPrefix(loc.GoogleLocationID, "locations/")
	reviews, _, err := client.ListReviews(ctx, loc.GoogleAccountID, locationID, 50, "")
	if err != nil {
		return 0, err
	}

	var newCount int
	for _, rev := range reviews {
		reviewTime, err := time.Parse(time.RFC3339, rev.CreateTime)
		if err != nil {
			log.Printf("poller: failed to parse review time %q: %v", rev.CreateTime, err)
			reviewTime = time.Now()
		}

		rating := google.StarRatingToInt(rev.StarRating)

		var reviewID string
		err = p.db.QueryRow(ctx,
			`INSERT INTO reviews (location_id, google_review_id, author_name, profile_photo_url, rating, text, review_time)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (google_review_id) DO NOTHING
			RETURNING id`,
			loc.ID, rev.ReviewID, rev.Reviewer.DisplayName, rev.Reviewer.ProfilePhotoUrl, rating, rev.Comment, reviewTime,
		).Scan(&reviewID)
		if err != nil {
			continue
		}

		newCount++
		p.processNewReview(ctx, reviewID, loc.ID, rev.Comment, rating, rev.Reviewer.DisplayName)
	}

	return newCount, nil
}

func (p *Poller) processNewReview(ctx context.Context, reviewID, locationID, reviewText string, rating int, authorName string) {
	if p.openai == nil {
		return
	}

	sentiment, err := p.openai.AnalyzeSentiment(ctx, reviewText, rating)
	if err != nil {
		log.Printf("poller: failed to analyze sentiment for review %s: %v", reviewID, err)
	} else {
		if _, err := p.db.Exec(ctx,
			"UPDATE reviews SET sentiment_score = $1, sentiment_label = $2 WHERE id = $3",
			sentiment.Score, sentiment.Label, reviewID,
		); err != nil {
			log.Printf("poller: failed to update sentiment for review %s: %v", reviewID, err)
		}
	}

	var businessName, businessType string
	var brandVoiceJSON []byte
	err = p.db.QueryRow(ctx,
		"SELECT b.name, b.type, b.brand_voice_config FROM businesses b JOIN locations l ON l.business_id = b.id WHERE l.id = $1",
		locationID,
	).Scan(&businessName, &businessType, &brandVoiceJSON)
	if err != nil {
		log.Printf("poller: failed to look up business for location %s: %v", locationID, err)
		return
	}

	var brandVoice openai.BrandVoice
	if len(brandVoiceJSON) > 0 {
		_ = json.Unmarshal(brandVoiceJSON, &brandVoice)
	}

	draftText, err := p.openai.DraftResponse(ctx, openai.DraftRequest{
		BusinessName: businessName,
		BusinessType: businessType,
		BrandVoice:   brandVoice,
		ReviewerName: authorName,
		Rating:       rating,
		ReviewText:   reviewText,
	})
	if err != nil {
		log.Printf("poller: failed to draft response for review %s: %v", reviewID, err)
		return
	}

	if _, err := p.db.Exec(ctx,
		"INSERT INTO responses (review_id, draft_text, status) VALUES ($1, $2, 'draft')",
		reviewID, draftText,
	); err != nil {
		log.Printf("poller: failed to insert draft response for review %s: %v", reviewID, err)
	}

	if rating <= 2 {
		var ownerEmail string
		err = p.db.QueryRow(ctx,
			"SELECT u.email FROM users u JOIN businesses b ON b.owner_user_id = u.id JOIN locations l ON l.business_id = b.id WHERE l.id = $1",
			locationID,
		).Scan(&ownerEmail)
		if err != nil {
			log.Printf("poller: failed to look up owner email for location %s: %v", locationID, err)
			return
		}
		dashboardURL := p.cfg.BaseURL + "/reviews"
		subject, html := email.NegativeReviewEmail(businessName, authorName, reviewText, rating, dashboardURL)
		if err := p.email.Send(ctx, ownerEmail, subject, html); err != nil {
			log.Printf("poller: failed to send negative review email for review %s: %v", reviewID, err)
		}
	}
}
