# ReviewFlow

AI-powered review management for local businesses. Monitor Google reviews, get instant on-brand response drafts, track sentiment, and publish replies -- all from one dashboard.

## How It Works

1. **Connect** your Google Business Profile
2. **Configure** your brand voice (tone, context, rules, example responses)
3. **Reviews auto-sync** every 15 minutes with sentiment scoring
4. **AI drafts responses** matching your brand voice
5. **Review, edit, and publish** responses back to Google

Negative reviews (1-2 stars) trigger instant email alerts.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router, TypeScript, Tailwind, shadcn/ui) |
| Backend | Go (chi router) |
| Database | PostgreSQL (pgx/v5) |
| AI | OpenAI API (GPT-4o for drafting, GPT-4o-mini for sentiment) |
| Reviews | Google Business Profile API |
| Email | Resend |
| Payments | Dodo Payments |

## Prerequisites

- Go 1.22+
- Node.js 18+
- PostgreSQL 15+
- OpenAI API key
- Google Cloud project with Business Profile API enabled
- (Optional) Resend API key for email alerts
- (Optional) Dodo Payments API key for billing

## Setup

### 1. Clone and install dependencies

```bash
git clone git@github.com:vaibhav0806/local-review-responder.git
cd local-review-responder

# Backend
cd api
go mod download

# Frontend
cd ../web
npm install
```

### 2. Set up the database

```bash
createdb review_responder

# Run migrations (install golang-migrate if needed: brew install golang-migrate)
cd api
migrate -path migrations -database "postgres://localhost:5432/review_responder?sslmode=disable" up
```

### 3. Configure environment variables

```bash
# Backend
cp api/.env.example api/.env
```

Edit `api/.env`:

```
DATABASE_URL=postgres://localhost:5432/review_responder?sslmode=disable
OPENAI_API_KEY=sk-...
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/google/callback
BASE_URL=http://localhost:3000
JWT_SECRET=change-this-to-a-random-string
PORT=8080

# Optional
RESEND_API_KEY=re_...
NOTIFICATION_FROM_EMAIL=notifications@yourdomain.com
DODO_PAYMENTS_API_KEY=...
DODO_PAYMENTS_WEBHOOK_SECRET=whsec_...
DODO_PAYMENTS_PRODUCT_ID=pdt_...
```

For the frontend, create `web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 4. Google Cloud setup

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Google My Business API**, **My Business Account Management API**, and **My Business Business Information API**
3. Create OAuth 2.0 credentials (Web application type)
4. Add `http://localhost:8080/api/google/callback` as an authorized redirect URI
5. Copy the Client ID and Client Secret to your `.env`

### 5. Run

```bash
# Terminal 1: Backend
cd api
source .env && go run cmd/server/main.go

# Terminal 2: Frontend
cd web
npm run dev
```

The app will be available at `http://localhost:3000` and the API at `http://localhost:8080`.

## Project Structure

```
api/                              Go backend
  cmd/server/main.go              Entrypoint, router, worker startup
  internal/
    auth/                         JWT utilities
    billing/                      Dodo Payments API client + webhook verification
    config/                       Environment config
    db/                           PostgreSQL connection pool
    email/                        Resend client + email templates
    google/                       Google Business Profile API client
    handler/                      HTTP handlers (auth, business, billing, google, location, review, response, stats)
    middleware/                    JWT auth middleware
    openai/                       OpenAI client (sentiment, drafting)
    worker/                       Review polling background worker
  migrations/                     SQL migration files (6 pairs)
  queries/                        sqlc query definitions

web/                              Next.js frontend
  src/app/
    page.tsx                      Landing page
    (auth)/login, register        Auth pages
    (app)/dashboard               Analytics dashboard with charts
    (app)/locations               Google location management
    (app)/reviews                 Review feed + detail/response editor
    (app)/settings                Business config, brand voice, billing
    (app)/onboarding              3-step setup wizard
  src/components/                 Sidebar, auth guard, shadcn/ui
  src/lib/                        API client, auth context
```

## API Overview

### Public
```
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
GET    /api/google/callback
POST   /api/billing/webhook
```

### Protected (JWT)
```
GET    /api/businesses
POST   /api/businesses
PUT    /api/businesses/:id/brand-voice

GET    /api/google/auth?business_id=X
GET    /api/businesses/:id/locations
DELETE /api/businesses/:id/locations/:lid

GET    /api/locations/:id/reviews
GET    /api/locations/:id/reviews/stats
GET    /api/dashboard/stats

GET    /api/reviews/:id/response
PUT    /api/reviews/:id/response
POST   /api/reviews/:id/response/regenerate
POST   /api/reviews/:id/response/approve
POST   /api/reviews/:id/response/skip

POST   /api/billing/checkout
GET    /api/billing/status?business_id=X
POST   /api/billing/cancel
```

## Deployment (Railway)

### Backend

1. Create a new Railway service pointing to the `api/` directory
2. Add a PostgreSQL database
3. Set all environment variables from `.env.example`
4. Set `GOOGLE_REDIRECT_URL` and `BASE_URL` to your production URLs
5. Railway auto-detects Go and builds from `cmd/server/main.go`

### Frontend

1. Create a new Railway (or Vercel) service pointing to `web/`
2. Set `NEXT_PUBLIC_API_URL` to your backend URL
3. Build command: `npm run build`, start command: `npm start`

### Dodo Payments Webhooks

In the Dodo Payments dashboard, create a webhook pointing to `https://your-api-domain.com/api/billing/webhook` and subscribe to:
- `subscription.active`
- `subscription.cancelled`
- `subscription.failed`
- `subscription.expired`
- `payment.succeeded`

## License

MIT
