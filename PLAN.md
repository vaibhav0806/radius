# Smart Review Responder - Project Plan

A tool for local businesses to monitor Google reviews, draft on-brand AI responses, flag negative reviews, and track sentiment over time.

**Target**: $29-59/mo per location, sold directly to local businesses (restaurants, clinics, salons).

## Architecture

```
+------------------+        +------------------+        +------------------+
|                  |        |                  |        |                  |
|   Next.js App    +------->+   Go API Server  +------->+   PostgreSQL     |
|   (Dashboard)    |        |   (REST API)     |        |                  |
|                  |        |                  |        +------------------+
+------------------+        +--------+---------+
                                     |
                            +--------+---------+
                            |                  |
                            |  Background      |
                            |  Workers (Go)    |
                            |                  |
                            +----+--------+----+
                                 |        |
                    +------------+        +------------+
                    |                                  |
              +-----+------+                   +------+------+
              | Google     |                   | OpenAI API  |
              | Business   |                   | (GPT-4o)    |
              | Profile API|                   |             |
              +------------+                   +-------------+
```

**Hosting**: Railway (API + workers + Postgres), Vercel or Railway for Next.js frontend.

## Core Concepts

### Review Pipeline
1. **Ingest**: Background worker polls Google Business Profile API every 15 min for new reviews per location
2. **Analyze**: Each new review gets sentiment scored (OpenAI) and stored
3. **Draft**: AI generates a response matching the business's configured brand voice
4. **Notify**: Negative reviews (1-2 stars) trigger email/in-app alerts
5. **Approve**: Business owner reviews draft in dashboard, edits if needed, approves
6. **Publish**: Approved response is posted back via Google API

### Brand Voice
Each business configures:
- **Tone**: e.g., "warm and casual", "professional", "friendly with humor"
- **Business context**: what they do, key selling points, owner name
- **Rules**: things to never say, competitor names to avoid, specific phrases they like
- **Example responses**: 3-5 past responses they liked, used as few-shot examples

This gets assembled into a system prompt per business.

## Data Model

```
users
  id, email, password_hash, name, created_at

businesses
  id, owner_user_id, name, type (restaurant/clinic/salon/other)
  brand_voice_config (jsonb)  -- tone, context, rules, examples
  created_at

locations
  id, business_id, name, address
  google_account_id, google_location_id
  poll_enabled (bool), last_polled_at
  created_at

reviews
  id, location_id
  google_review_id (unique)
  author_name, profile_photo_url
  rating (1-5), text
  sentiment_score (float, -1 to 1)
  sentiment_label (positive/neutral/negative)
  review_time, created_at

responses
  id, review_id
  draft_text, final_text
  status (draft/approved/sent/skipped)
  generated_at, approved_at, sent_at
  approved_by_user_id
```

## API Endpoints (Go)

```
Public:
  GET    /api/health                              -- health check
  POST   /api/auth/register                       -- register with email/password/name
  POST   /api/auth/login                          -- login, returns JWT
  GET    /api/google/callback                     -- Google OAuth redirect target

Protected (JWT required):
  GET    /api/businesses                          -- list user's businesses
  POST   /api/businesses                          -- create business
  PUT    /api/businesses/:id/brand-voice          -- update brand voice config

  GET    /api/google/auth?business_id=X           -- get Google OAuth URL
  GET    /api/businesses/:id/locations             -- list locations
  DELETE /api/businesses/:id/locations/:lid        -- delete location

  GET    /api/locations/:id/reviews               -- paginated (limit/offset)

  GET    /api/reviews/:id/response                -- get AI response for review
  PUT    /api/reviews/:id/response                -- edit draft text
  POST   /api/reviews/:id/response/regenerate     -- re-draft with optional instructions
  POST   /api/reviews/:id/response/approve        -- approve + publish to Google
  POST   /api/reviews/:id/response/skip           -- mark as skipped

  GET    /api/locations/:id/reviews/stats          -- per-location analytics + trends
  GET    /api/dashboard/stats                      -- aggregated stats across all user's locations

  POST   /api/billing/checkout                     -- create Stripe checkout session
  GET    /api/billing/status?business_id=X         -- subscription status
  POST   /api/billing/cancel                       -- cancel at period end
  POST   /api/billing/webhook                      -- Stripe webhook (public, signature verified)
```

## Pages (Next.js)

```
/login, /register              -- Auth
/dashboard                     -- Overview: recent reviews, pending responses, sentiment chart
/locations                     -- Manage connected Google locations
/reviews                       -- Review feed with filters (all locations, or per-location)
/reviews/:id                   -- Single review detail + response editor
/settings                      -- Business profile, brand voice config
/settings/brand-voice          -- Dedicated brand voice editor with preview
```

## Google Business Profile Integration

- **API**: Google My Business API v4 (or Business Profile APIs)
- **Auth**: OAuth 2.0 - business owner authorizes access to their Google Business Profile
- **Scopes**: `https://www.googleapis.com/auth/business.manage`
- **Key operations**:
  - List accounts/locations the user manages
  - List reviews for a location (paginated)
  - Reply to a review (create/update reply)
- **Polling**: Cron-based, every 15 min per location. Store `last_polled_at` to avoid re-processing.
- **Rate limits**: ~60 requests/min. With batching, supports ~200 locations comfortably.

## OpenAI Integration

- **Model**: GPT-4o (best price/quality for this use case)
- **Usage**:
  1. **Response drafting**: System prompt with brand voice + review as user message -> draft response
  2. **Sentiment scoring**: Lightweight call (or use a simpler model) to classify sentiment + score
- **Prompt structure** for drafting:
  ```
  System: You are a review response assistant for {business_name}, a {business_type}.
          Tone: {tone_description}
          Context: {business_context}
          Rules: {rules}
          Here are example responses they liked: {examples}

  User: Draft a response to this {rating}-star review:
        "{review_text}"
  ```
- **Cost estimate**: ~$0.01-0.03 per review (draft + sentiment). At 50 reviews/mo per location, ~$1.50/location/mo.

## Phased Delivery

### Phase 1 - Foundation (Week 1-2) -- DONE
- [x] Project scaffolding: Go API (chi router, pgx/v5), Next.js app (App Router, Tailwind, shadcn/ui)
- [x] Database schema + migrations (5 migration files: users, businesses, locations, reviews, responses)
- [x] sqlc config + query definitions
- [x] User auth: register/login with bcrypt + JWT (7-day expiry)
- [x] JWT middleware on protected routes
- [x] Business CRUD (GET/POST /api/businesses)
- [x] Frontend: sidebar nav, dashboard with stat cards, reviews/settings/login pages
- [x] Frontend: auth context, auth guard, login + register pages wired up
- [x] Frontend: logout button in sidebar

### Phase 2 - Google Integration (Week 3) -- DONE
- [x] Google OAuth flow (GET /api/google/auth -> redirect -> GET /api/google/callback)
- [x] Google API client: ListAccounts, ListLocations, ListReviews, ReplyToReview
- [x] Location discovery: auto-imports all locations on OAuth callback
- [x] Location management: GET /api/businesses/:id/locations, DELETE locations
- [x] Review polling worker: 15-min ticker, dedupes by google_review_id, updates last_polled_at
- [x] GET /api/locations/:id/reviews with pagination (limit/offset)
- [x] Frontend: locations page with connect Google button, location cards, polling status
- [x] Frontend: reviews list with star ratings, sentiment badges, rating filter
- [x] Frontend: dashboard with real stats (total reviews, avg rating)
- [x] Frontend: settings page with business creation form

### Phase 3 - AI Responses (Week 4) -- DONE
- [x] OpenAI client (internal/openai/): chat completions wrapper
- [x] Sentiment analysis: GPT-4o-mini scoring (-1 to 1) with fallback for text-less reviews
- [x] Response drafting: GPT-4o with brand voice system prompt
- [x] Poller auto-processes new reviews: sentiment + draft on insert
- [x] Brand voice config: PUT /api/businesses/:id/brand-voice (tone, context, rules, examples)
- [x] Response endpoints: GET, PUT (edit), POST regenerate (with optional instructions), POST approve, POST skip
- [x] Approve flow: publishes to Google via ReplyToReview, sets status to 'sent'
- [x] Frontend: brand voice configuration form with dynamic example responses
- [x] Frontend: review detail page (/reviews/[id]) with response editor
- [x] Frontend: regenerate with instructions, save edits, approve & publish, skip

### Phase 4 - Alerts & Analytics (Week 5) -- DONE
- [x] Email notifications: Resend client (internal/email/) sends alerts on 1-2 star reviews
- [x] Negative review email: includes review text, author, rating, and link to dashboard
- [x] Poller auto-sends notification emails to business owner on negative reviews
- [x] Stats endpoints: GET /api/locations/:id/reviews/stats (per-location analytics)
- [x] Dashboard stats endpoint: GET /api/dashboard/stats (aggregated across all user's locations)
- [x] Analytics: total reviews, avg rating, pending responses, response rate, negative count (7 days)
- [x] Analytics: 12-week sentiment trend, rating trend, rating distribution, sentiment distribution
- [x] Frontend: analytics dashboard with 5 stat cards + 4 recharts charts
- [x] Frontend: sentiment trend line chart, rating trend line chart, rating distribution bar chart, sentiment pie chart

### Phase 5 - Polish & Launch (Week 6) -- DONE
- [x] Landing page: hero, features, how-it-works, pricing ($29/$59), footer
- [x] Landing page: dynamic CTA (logged in -> "Go to Dashboard", logged out -> "Get Started Free")
- [x] ~Stripe billing~ -> Replaced with Dodo Payments
- [x] Dodo Payments: checkout sessions (POST /checkouts), subscription management (GET/PATCH /subscriptions)
- [x] Dodo webhook: Standard Webhooks signature verification (HMAC SHA256)
- [x] Billing endpoints: POST /api/billing/checkout, GET /api/billing/status, POST /api/billing/cancel, POST /api/billing/webhook
- [x] Migration 000006: adds dodo_customer_id, dodo_subscription_id, subscription_status, subscription_plan to businesses
- [x] Onboarding flow: 3-step (create business -> connect Google -> brand voice) with progress bar
- [x] Register redirects to /onboarding
- [x] Settings page: billing card with upgrade/cancel, handles ?billing=success and ?billing=cancel
- [ ] Railway deployment setup (config, Dockerfile, etc.)
- [ ] README.md with setup instructions

## Tech Stack Summary

| Layer        | Choice                           |
|-------------|----------------------------------|
| Frontend    | Next.js 14+ (App Router, TypeScript) |
| UI          | Tailwind CSS + shadcn/ui         |
| Backend     | Go (chi router)                  |
| DB          | PostgreSQL (via sqlc)            |
| Migrations  | golang-migrate                   |
| Auth        | JWT (access + refresh tokens)    |
| AI          | OpenAI API (GPT-4o)             |
| Reviews     | Google Business Profile API      |
| Email       | Resend                           |
| Payments    | Dodo Payments                    |
| Hosting     | Railway (API + DB), Vercel or Railway (frontend) |

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Google API access requires verification for sensitive scopes | Apply early; use test accounts during dev. Business Profile API requires Google Cloud project verification. |
| Yelp/other platforms have no reply API | V1 is Google-only. For Yelp, could draft responses and let user copy-paste. Not a V1 concern. |
| AI generates inappropriate responses | Always require human approval before publishing. Add guardrails in system prompt. |
| Low review volume makes product feel stale | Add proactive features: weekly digest email, review request link generator. Phase 5+. |
| Polling at scale (many locations) | 15-min intervals with jitter. Can move to webhooks if Google adds push support. Current API handles 200+ locations fine. |

## File Structure (current)

```
/
  /api                              -- Go backend
    /cmd/server/main.go             -- Entrypoint, router, poller startup
    /internal/
      /auth/jwt.go                  -- JWT generate/validate
      /config/config.go             -- Env var config
      /db/db.go                     -- pgxpool connection
      /google/
        oauth.go                    -- OAuth2 config + code exchange
        client.go                   -- HTTP client with refresh tokens
        locations.go                -- ListAccounts, ListLocations
        reviews.go                  -- ListReviews, ReplyToReview
      /handler/
        handler.go                  -- Handler struct (DB + Config)
        json.go                     -- writeJSON / writeError helpers
        auth.go                     -- Register, Login
        business.go                 -- ListBusinesses, CreateBusiness, UpdateBrandVoice
        google.go                   -- GoogleAuth, GoogleCallback
        location.go                 -- ListLocations, DeleteLocation
        review.go                   -- ListReviews
        response.go                 -- GetResponse, UpdateResponse, RegenerateResponse, ApproveResponse, SkipResponse
        stats.go                    -- LocationReviewStats, DashboardStats
        billing.go                  -- BillingCheckout, BillingStatus, BillingCancel, BillingWebhook
        health.go                   -- HealthCheck
      /middleware/auth.go           -- JWT auth middleware + GetUserID
      /openai/
        client.go                   -- Chat completions wrapper
        sentiment.go                -- AnalyzeSentiment (GPT-4o-mini)
        draft.go                    -- DraftResponse (GPT-4o)
      /email/
        resend.go                   -- Resend API client
        templates.go                -- Email templates (negative review alert)
      /billing/
        dodo.go                     -- Dodo Payments API client (checkout, subscriptions)
        webhook.go                  -- Standard Webhooks signature verification
      /worker/poller.go             -- Review polling + auto sentiment/draft + email alerts
    /migrations/                    -- 6 up/down SQL migration pairs
    /queries/queries.sql            -- sqlc query definitions
    sqlc.yaml                       -- sqlc config
    .env.example
    go.mod

  /web                              -- Next.js frontend
    /src/
      /app/
        layout.tsx                  -- Root layout with AuthProvider
        page.tsx                    -- Redirect to /dashboard
        /(auth)/login/page.tsx      -- Login form
        /(auth)/register/page.tsx   -- Register form
        /(app)/layout.tsx           -- App layout with Sidebar + AuthGuard
        /(app)/dashboard/page.tsx   -- Stats cards (total reviews, avg rating)
        /(app)/locations/page.tsx   -- Location management + Google connect
        /(app)/reviews/page.tsx     -- Review feed with rating filter
        /(app)/reviews/[id]/page.tsx -- Review detail + response editor
        /(app)/settings/page.tsx    -- Business profile + brand voice config + billing
        /(app)/onboarding/page.tsx  -- 3-step onboarding flow
      /components/
        sidebar.tsx                 -- Nav sidebar with logout
        auth-guard.tsx              -- Protected route wrapper
        /ui/                        -- shadcn/ui components
      /lib/
        api.ts                      -- fetchAPI helper
        auth-context.tsx            -- Auth state + login/register/logout
        utils.ts                    -- cn() helper
    package.json

  PLAN.md
```
