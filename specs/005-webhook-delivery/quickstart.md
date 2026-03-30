# Quickstart: Webhook Delivery

**Feature**: 005-webhook-delivery | **Date**: 2026-03-30

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (Supabase)
- `DATABASE_URL` environment variable set
- Migrations 001-012 already applied

## Setup

1. Apply the new migration:
   ```bash
   psql $DATABASE_URL -f src/migrations/013-machine-summary.sql
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

## Configure a Webhook

```bash
curl -X PUT http://localhost:3000/api/v1/webhook \
  -H "Authorization: Bearer ba_sk_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook_url": "https://your-app.com/webhook",
    "webhook_secret": "whsec_your_secret_at_least_16_chars"
  }'
```

## Send a Test Ping

```bash
curl -X POST http://localhost:3000/api/v1/webhook/ping \
  -H "Authorization: Bearer ba_sk_your_key"
```

## View Delivery History

```bash
curl http://localhost:3000/api/v1/webhook/history \
  -H "Authorization: Bearer ba_sk_your_key"
```

## How It Works

1. A test case completes (status changes to "completed").
2. The system generates a machine summary with confidence scoring.
3. The webhook payload is assembled from test case, step results, and test result data.
4. The payload is signed with HMAC-SHA256 using the builder's webhook secret.
5. The signed payload is POSTed to the builder's webhook URL.
6. If delivery fails, retries are scheduled: 1 min, 5 min, 30 min (3 retries max).
7. Each attempt is recorded in webhook_deliveries for debugging.

## Verify Webhook Signatures

On your server, verify the signature to ensure the webhook is authentic:

```javascript
const crypto = require('crypto');

function verifyWebhook(rawBody, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}

// In your webhook handler:
const isValid = verifyWebhook(
  req.body, // raw string body
  req.headers['x-blendedagents-signature'],
  'whsec_your_secret'
);
```
