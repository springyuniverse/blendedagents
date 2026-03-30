# 007 — Builder Dashboard: Plan

## Architecture

- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- **State management**: @tanstack/react-query v5 for server state
- **Port**: 4002 (separate from tester dashboard on 4001)
- **Design**: Clean, minimal, Linear/Notion-inspired

## Authentication

- Builder enters API key on `/login` page
- Next.js API route (`/api/auth`) verifies key against `GET /api/v1/me`, stores in httpOnly cookie
- Middleware redirects unauthenticated requests to `/login`
- All `/api/v1/*` requests proxied to backend via Next.js rewrites

## Backend Integration

No new backend endpoints needed. The dashboard consumes:
- Test case CRUD: `GET/POST /api/v1/test-cases`, `GET/DELETE /api/v1/test-cases/:id`
- Results: `GET /api/v1/test-cases/:id/results`
- Templates: `GET/POST /api/v1/templates`, `GET/PUT/DELETE /api/v1/templates/:id`, `POST /api/v1/templates/:id/use`
- Credits: `GET /api/v1/credits/balance`, `GET /api/v1/credits/packs`, `POST /api/v1/credits/topup`, `GET /api/v1/credits/transactions`
- Webhooks: `PUT /api/v1/webhook`, `POST /api/v1/webhook/ping`, `GET /api/v1/webhook/history`
- Auth: `GET /api/v1/me`

## Page Structure

```
/login              — API key login
/                   — Dashboard overview (balance, recent tests, stats)
/test-cases         — Test case list with filters
/test-cases/new     — Create test case form
/test-cases/[id]    — Test case detail + results
/templates          — Template list
/templates/[id]     — Template detail/edit
/credits            — Balance, purchase packs, transaction history
/settings           — Profile, webhooks, API keys
```

## Key Components

- `StatusBadge` — color-coded status pills
- `CreditBalance` — credit display widget
- `StepEditor` — dynamic step list editor
- `TransactionHistory` — paginated transaction table
- `TestResultView` — test result display with verdict and per-step results
