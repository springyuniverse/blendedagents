# Quickstart: Credit System & Billing

**Feature**: 006-credit-billing | **Depends on**: 001-foundation-auth

## Prerequisites

- Node.js 20 LTS
- PostgreSQL 15+
- Stripe account (test mode) with API keys
- Feature 001-foundation-auth schema applied

## Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/blendedagents
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Database Setup

1. Apply 001-foundation-auth migrations first (builders, testers, test_cases tables)
2. Apply 006-credit-billing migrations:
   - `credit_balances` table with CHECK constraints
   - `transactions` table with immutability trigger and indexes
   - `credit_packs` table
   - `credit_rate_config` table
   - `regional_rates` table
   - `tester_payout_records` table
   - Add `stripe_customer_id` column to `builders` table

## Stripe Setup (Test Mode)

1. Create a Product in Stripe Dashboard: "Platform Credits"
2. Create Prices for each pack:
   - 10 credits → price based on admin-configured rate
   - 50 credits → price based on admin-configured rate
   - 100 credits → price based on admin-configured rate
3. Copy each `price_id` into the `credit_packs` table
4. Set up webhook endpoint in Stripe Dashboard pointing to `/webhooks/stripe`
5. Subscribe to events: `checkout.session.completed`, `checkout.session.expired`
6. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Seed Data

```sql
-- Set initial per-credit rate (e.g., $0.49/credit)
INSERT INTO credit_rate_config (per_credit_rate_cents, effective_from)
VALUES (49, now());

-- Configure credit packs
INSERT INTO credit_packs (name, credit_amount, price_cents, stripe_price_id, is_active) VALUES
  ('10 Credit Pack', 10, 490, 'price_xxx_10', true),
  ('50 Credit Pack', 50, 2450, 'price_xxx_50', true),
  ('100 Credit Pack', 100, 4900, 'price_xxx_100', true);

-- Configure regional tester rates
INSERT INTO regional_rates (region, base_pay_cents, per_step_rate_cents, min_base_cents, max_base_cents) VALUES
  ('egypt', 150, 15, 100, 200),
  ('mena', 225, 20, 150, 300),
  ('southeast_asia', 300, 25, 200, 400);

-- Create credit balance for existing builders
INSERT INTO credit_balances (builder_id, available_credits, reserved_credits)
SELECT id, 0, 0 FROM builders;
```

## Testing Locally

### Run Tests
```bash
npm test                          # All tests
npm test -- --grep "credit"       # Credit-related tests only
```

### Test Stripe Webhooks Locally
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger a test event
stripe trigger checkout.session.completed
```

### Manual Testing Flow
1. Start the server: `npm run dev`
2. Get available packs: `GET /api/v1/credits/packs`
3. Initiate purchase: `POST /api/v1/credits/topup` with `{ "pack_id": "..." }`
4. Open the returned `checkout_url` in browser, complete with Stripe test card `4242 4242 4242 4242`
5. Webhook processes → check balance: `GET /api/v1/credits/balance`
6. View transactions: `GET /api/v1/credits/transactions`

## Key Implementation Notes

- **Credit cost formula**: `base_cost(2) + steps_count × cost_per_step(1)` — all integers
- **Atomicity**: All credit operations use `SELECT FOR UPDATE` on `credit_balances` row within a transaction
- **Immutability**: Transaction table has a DB trigger rejecting UPDATE/DELETE
- **Idempotency**: Stripe webhook handler uses UNIQUE constraint on `stripe_session_id`
- **Concurrency**: Partial unique index prevents multiple pending purchases per builder
- **Payout rate locking**: Regional rate is captured at test assignment, not completion
