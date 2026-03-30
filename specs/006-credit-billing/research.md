# Research: Credit System & Billing

**Feature**: 006-credit-billing | **Date**: 2026-03-30

## 1. Language & Framework Selection

**Decision**: TypeScript 5.x with Fastify on Node.js 20 LTS

**Rationale**:
- Official MCP SDK (`@modelcontextprotocol/sdk`) is TypeScript-first — Go and Rust have no official SDK, eliminating them per the simplicity mandate.
- Stripe's Node.js SDK (v21) is their primary SDK with full TypeScript types for every API object, webhook event, and error. Critical for financial operations where type safety catches `number | undefined` bugs at compile time.
- Fastify provides built-in JSON Schema validation, plugin architecture for modular monolith, and native `inject()` for integration testing without HTTP overhead.
- postgres.js (v3) offers tagged template literals (SQL injection prevention), excellent transaction support (`sql.begin()`), and direct control over RLS queries without ORM abstraction.

**Alternatives considered**:
- Python/FastAPI: Viable second choice. MCP SDK exists. Stripe SDK works. But type enforcement is opt-in (mypy), not enforced at boundaries. Higher risk for financial code.
- Go: No official MCP SDK. Higher boilerplate. Eliminated.
- Rust: No official MCP or Stripe SDK. Slow iteration cycles. Eliminated.

## 2. Stripe Integration Pattern

**Decision**: Stripe Checkout Sessions with `checkout.session.completed` webhook

**Rationale**:
- Checkout Sessions provide a hosted payment page — no custom payment form needed for MVP.
- Handles SCA/3D Secure compliance automatically.
- `checkout.session.completed` fires when payment is captured, contains rich metadata (custom fields, line items, customer info) that maps cleanly to credit grant logic.
- Never grant credits on success_url redirect — only on webhook confirmation.

**Alternatives considered**:
- Payment Intents: Lower-level, requires building client-side confirmation flow. More code for same outcome.
- `payment_intent.succeeded`: Works but loses Checkout Session metadata. Requires correlating back to application context.

## 3. Webhook Idempotency

**Decision**: Use `checkout.session.id` as unique constraint in transaction ledger

**Rationale**:
- Stripe retries webhooks up to ~15 times over 72 hours. Handler must be idempotent.
- `checkout.session.id` (e.g., `cs_live_abc123`) is globally unique and never reused.
- Store as `stripe_session_id` column with UNIQUE constraint on the transaction table.
- INSERT + credit grant happen in same DB transaction. If insert fails (unique violation), return HTTP 200 immediately.

**Alternatives considered**:
- `event.id` uniqueness: Works but session ID is more semantically meaningful and directly ties ledger entry to Stripe object.

## 4. Concurrent Top-Up Prevention

**Decision**: Database partial unique index on `(builder_id, status)` where `status = 'pending'`

**Rationale**:
- Before creating a Checkout Session, insert a row with `status: 'pending'`. Partial unique index enforces at most one pending purchase per builder at the database level.
- Set short Checkout Session expiry (30 minutes) so stale pending records self-resolve.
- No need for distributed locks or Redis — PostgreSQL constraint is simpler and more reliable.

## 5. Credit Balance & Concurrency Control

**Decision**: Materialized balance columns (`available_credits`, `reserved_credits`) on a `credit_balances` table + append-only transaction ledger

**Rationale**:
- Derived balance (`SELECT SUM(amount) FROM transactions`) has linear query cost and cannot enforce non-negative constraint at DB level without table-level locks.
- Materialized balance enables `SELECT FOR UPDATE` row-level locking per account — serializes operations per builder while allowing full parallelism across builders.
- `CHECK (available_credits >= 0)` as defense-in-depth safety net.
- Ledger remains immutable source of truth. Balance is transactionally consistent cache.

**Alternatives considered**:
- Advisory locks (`pg_advisory_xact_lock`): Application-level, harder to debug, easy to forget in a code path.
- `SERIALIZABLE` isolation: Requires retry logic for every transaction, higher overhead. `SELECT FOR UPDATE` under `READ COMMITTED` is simpler.

## 6. Atomic Multi-Entry Completion

**Decision**: Single PostgreSQL transaction with deterministic lock ordering for test completion

**Rationale**:
- Test completion requires 3 ledger entries (charge + payout + commission) touching up to 3 balance rows.
- Single transaction with `SELECT FOR UPDATE` on each balance row guarantees all-or-nothing.
- Lock rows in ascending `account_id` order to prevent deadlocks.
- No distributed transactions, sagas, or eventual consistency needed — everything in one PostgreSQL database.

## 7. Transaction Indexing Strategy

**Decision**: Three composite indexes optimized for query patterns

**Indexes**:
1. `(builder_id, created_at DESC)` — History queries with keyset pagination
2. `(builder_id, type, created_at DESC)` — Filtered queries (e.g., "show me all charges")
3. `(reference_id)` — Lifecycle queries (all entries for a specific test)

**Rationale**:
- Keyset pagination (`WHERE created_at < ? ORDER BY created_at DESC LIMIT 20`) is O(1) per page vs O(N) for OFFSET.
- Three indexes balance read performance against write amplification for an append-heavy table.

## 8. Stripe Product/Price Objects

**Decision**: Create Stripe Products and Prices for each credit pack

**Rationale**:
- One Product ("Platform Credits") with multiple Prices for pack sizes (10, 50, 100 credits).
- Stripe Dashboard shows meaningful analytics ("10 Credit Pack sold 47 times").
- When admin changes per-credit rate: create new Stripe Prices (Prices are immutable), archive old ones, update local `credit_packs` table.
- Store `stripe_price_id` in local credit pack configuration for webhook processing.

## 9. Stripe Customer Mapping

**Decision**: Store `stripe_customer_id` on builder record, created lazily on first purchase

**Rationale**:
- 1:1 relationship — nullable column with UNIQUE constraint on builders table.
- Lazy creation: on first purchase, call `stripe.customers.create()`, store ID, then pass to Checkout Session.
- Include `builder_id` in Stripe Customer metadata for bidirectional linking.

## 10. Weekly Payout Job

**Decision**: pg-boss (PostgreSQL-backed job queue) for weekly payout aggregation

**Rationale**:
- pg-boss uses PostgreSQL as its backing store — no Redis or external queue infrastructure needed.
- Supports scheduled/recurring jobs, retries, and deduplication natively.
- Aligns with simplicity mandate: single dependency (PostgreSQL), no additional infrastructure.
- Payout job aggregates all `unpaid` payout transactions per tester into a single payout record, marks as `pending`.
