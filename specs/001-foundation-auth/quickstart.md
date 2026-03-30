# Quickstart: Foundation & Auth

**Feature**: 001-foundation-auth | **No dependencies** (this is the foundation)

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- Google Cloud Console project with OAuth2 credentials

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/blendedagents
PORT=3000
HOST=0.0.0.0

# Google OAuth2 (for tester login)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Session
SESSION_SECRET=your-session-secret-min-32-chars

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# App URL (for redirects)
APP_URL=http://localhost:3000
```

## Database Setup

1. Create the database: `createdb blendedagents`
2. Apply migrations in order (001 through 011)
3. Run seed.sql for dev data (creates test builders and testers with API keys)

## Google OAuth2 Setup

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Secret to env vars

## Running

```bash
npm run dev        # Start development server
npm test           # Run all tests
npm run build      # TypeScript compilation
```

## Testing Authentication

### Builder API Key Auth
```bash
# Use the test API key from seed data
curl -H "Authorization: Bearer ba_sk_test_key_here" \
  http://localhost:3000/api/v1/credits/balance
```

### Tester Social Login
1. Visit `http://localhost:3000/auth/google` in a browser
2. Authenticate with a Google account that matches a seeded tester email
3. You'll be redirected to the dashboard with an active session

### Health Check
```bash
curl http://localhost:3000/health
# {"status":"ok","database":"connected","uptime_seconds":5}
```

## Seed Data

The seed.sql creates:
- 2 test builders with pre-generated API keys
- 3 test testers (one per region: egypt, mena, southeast_asia)
- 1 test template
- API key values are printed to stdout during seeding

## Key Implementation Notes

- **API keys are hashed with SHA-256** — the raw key is only shown once at creation time
- **RLS is enforced at the DB level** — `SET LOCAL app.current_builder_id` per transaction
- **Sessions are stored in PostgreSQL** — survives server restarts
- **`is_active` is checked on every tester request** — deactivation takes effect immediately
- **CORS is configured via env var** — no hardcoded origins
- **All errors use structured format** — `{ error: { code, message, context } }`
