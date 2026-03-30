# Data Model: Credit System & Billing

**Feature**: 006-credit-billing | **Date**: 2026-03-30

## Entity Relationship Overview

```
Builder (from 001-foundation-auth)
  ├── 1:1 CreditBalance
  ├── 1:N Transaction (as builder)
  └── 1:0..1 stripe_customer_id (on builder record)

Tester (from 001-foundation-auth)
  ├── 1:N Transaction (as tester, for payouts)
  └── 1:N TesterPayoutRecord

TestCase (from 001-foundation-auth)
  └── 1:N Transaction (as reference)

CreditPack (admin-configured)
  └── references Stripe Price ID

RegionalRate (admin-configured)
  └── referenced at test assignment time
```

## Entities

### CreditBalance

Materialized balance for a builder. The single row per builder serves as the concurrency control point via `SELECT FOR UPDATE`.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| builder_id | UUID | FK → builders(id), UNIQUE, NOT NULL | Owning builder |
| available_credits | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Credits available to spend |
| reserved_credits | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | Credits locked for in-progress tests |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification |

**RLS Policy**: Builders can only read their own balance row.

**Validation Rules**:
- `available_credits` must never go negative (CHECK constraint + SELECT FOR UPDATE)
- `reserved_credits` must never go negative (CHECK constraint)
- One balance row per builder (UNIQUE on builder_id)

### Transaction

Append-only immutable ledger entry. No UPDATE or DELETE operations permitted.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| type | TEXT | NOT NULL, CHECK IN ('topup','charge','payout','commission','refund') | Transaction type enum |
| builder_id | UUID | FK → builders(id), NOT NULL | Builder involved |
| tester_id | UUID | FK → testers(id), NULL | Tester involved (payouts only) |
| test_case_id | UUID | FK → test_cases(id), NULL | Related test case |
| credit_amount | INTEGER | NOT NULL | Credits affected (positive for grants, negative for charges) |
| currency_amount_cents | INTEGER | NOT NULL | USD amount in cents |
| commission_pct | NUMERIC(5,2) | NULL | Commission percentage (commission entries only) |
| commission_amount_cents | INTEGER | NULL | Commission in cents (commission entries only) |
| description | TEXT | NOT NULL | Human-readable description |
| stripe_session_id | TEXT | NULL, UNIQUE (partial: WHERE NOT NULL) | Stripe Checkout Session ID for idempotency |
| reference_id | UUID | NULL | Links related entries (e.g., reserve + deduct for same test) |
| idempotency_key | TEXT | NULL, UNIQUE (partial: WHERE NOT NULL) | Prevents duplicate operations |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Immutable timestamp |

**RLS Policy**: Builders see only transactions where `builder_id` = their ID.

**Immutability**: Database trigger rejects all UPDATE and DELETE operations on this table.

**Indexes**:
1. `(builder_id, created_at DESC)` — History queries with keyset pagination
2. `(builder_id, type, created_at DESC)` — Filtered type queries
3. `(reference_id)` — Lifecycle queries (all entries for a test)
4. `(stripe_session_id)` — Unique partial index for webhook idempotency
5. `(tester_id, created_at DESC) WHERE type = 'payout'` — Tester earnings queries

### CreditPack

Admin-configured credit pack definitions. Maps to Stripe Product/Price objects.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| name | TEXT | NOT NULL | Display name (e.g., "10 Credit Pack") |
| credit_amount | INTEGER | NOT NULL, CHECK > 0 | Number of credits in pack |
| price_cents | INTEGER | NOT NULL, CHECK > 0 | Price in USD cents |
| stripe_price_id | TEXT | NOT NULL, UNIQUE | Stripe Price object ID |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Whether pack is available for purchase |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification |

**Validation Rules**:
- `credit_amount` must be positive
- `stripe_price_id` must be unique and correspond to a valid Stripe Price
- When admin changes per-credit rate, new CreditPack rows are created with new Stripe Prices; old packs are set to `is_active = false`

### CreditRateConfig

Admin-configured per-credit rate. Single active rate at any time.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| per_credit_rate_cents | INTEGER | NOT NULL, CHECK > 0 | USD cents per credit |
| effective_from | TIMESTAMPTZ | NOT NULL | When this rate takes effect |
| created_by | UUID | FK → builders(id), NULL | Admin who set the rate |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation |

**Query pattern**: `SELECT * FROM credit_rate_config WHERE effective_from <= now() ORDER BY effective_from DESC LIMIT 1`

### RegionalRate

Admin-configured tester compensation rates per region.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| region | TEXT | NOT NULL, UNIQUE | Region identifier (e.g., 'egypt', 'mena', 'southeast_asia') |
| base_pay_cents | INTEGER | NOT NULL | Admin-set base pay in USD cents |
| per_step_rate_cents | INTEGER | NOT NULL | Admin-set per-step bonus in USD cents |
| min_base_cents | INTEGER | NOT NULL | Allowed minimum base pay |
| max_base_cents | INTEGER | NOT NULL | Allowed maximum base pay |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Whether region is active |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification |

**Validation Rules**:
- `base_pay_cents` must be between `min_base_cents` and `max_base_cents` (CHECK constraint)
- `per_step_rate_cents` must be positive
- One active rate per region (UNIQUE on region)

**Boundaries** (from spec):
- Egypt: $1.00–$2.00 base (100–200 cents), $0.15/step (15 cents)
- MENA: $1.50–$3.00 base (150–300 cents), $0.20/step (20 cents)
- Southeast Asia: $2.00–$4.00 base (200–400 cents), $0.25/step (25 cents)

### TesterPayoutRecord

Aggregates tester earnings for weekly payout processing.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| tester_id | UUID | FK → testers(id), NOT NULL | Tester being paid |
| period_start | DATE | NOT NULL | Start of payout period |
| period_end | DATE | NOT NULL | End of payout period |
| total_earnings_cents | INTEGER | NOT NULL, CHECK >= 0 | Total earnings for the period |
| transaction_count | INTEGER | NOT NULL, CHECK >= 0 | Number of completed tests in period |
| status | TEXT | NOT NULL, CHECK IN ('unpaid','pending','completed'), DEFAULT 'unpaid' | Payout status |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Last modification |

**Indexes**:
1. `(tester_id, period_start DESC)` — Tester's payout history
2. `(status) WHERE status = 'unpaid'` — Find payouts ready for aggregation

**State Transitions**:
```
unpaid → pending (weekly payout job aggregates earnings)
pending → completed (admin marks as transferred)
```

## Modifications to Existing Entities (from 001-foundation-auth)

### Builder (add column)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| stripe_customer_id | TEXT | NULL, UNIQUE | Stripe Customer ID, lazily created on first purchase |

**Note**: The `credits_balance` and `plan_tier` columns from 001-foundation-auth spec are superseded by the `credit_balances` table and the single-rate MVP model respectively. These columns should be deprecated or removed.

## State Machine: Credit Lifecycle for a Test

```
Test Created (builder has sufficient credits)
  └── RESERVE: available -= N, reserved += N
       ├── Test Completed Successfully
       │    └── DEDUCT: reserved -= N
       │         ├── CHARGE transaction (builder)
       │         ├── PAYOUT transaction (tester)
       │         └── COMMISSION transaction (platform)
       └── Test Cancelled / Expired
            └── REFUND: reserved -= N, available += N
                 └── REFUND transaction (builder)
```

## Reconciliation

A periodic job verifies ledger consistency:
```sql
-- For each builder, sum of all transaction credit_amounts should equal available + reserved
SELECT b.id,
       cb.available_credits + cb.reserved_credits AS materialized_total,
       COALESCE(SUM(t.credit_amount), 0) AS ledger_total
FROM builders b
JOIN credit_balances cb ON cb.builder_id = b.id
LEFT JOIN transactions t ON t.builder_id = b.id
GROUP BY b.id, cb.available_credits, cb.reserved_credits
HAVING cb.available_credits + cb.reserved_credits != COALESCE(SUM(t.credit_amount), 0);
```
Any rows returned indicate a discrepancy requiring investigation.
