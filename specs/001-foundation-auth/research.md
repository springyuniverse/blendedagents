# Research: Foundation & Auth

**Feature**: 001-foundation-auth | **Date**: 2026-03-30

## 1. Social Login (OAuth2) for Testers

**Decision**: @fastify/oauth2 with @fastify/session + connect-pg-simple (PostgreSQL-backed sessions)

**Rationale**:
- @fastify/oauth2 is the first-party Fastify plugin, minimal, handles only OAuth2 token exchange. Built-in Google configuration with PKCE support.
- Server-side sessions (not JWT cookies) because deactivated testers (`is_active=false`) must be rejected immediately — requires server-side session invalidation.
- PostgreSQL session store via connect-pg-simple — no additional infrastructure (already have PostgreSQL).
- Session cookie: httpOnly, secure (production), sameSite=Lax, 7-day maxAge, signed.

**Alternatives considered**:
- @fastify/passport: Beta, carries full Passport abstraction overhead. Rejected.
- grant: Not updated in 4+ years for Fastify. Rejected.
- lucia-auth: Deprecated as of March 2025. Rejected.
- JWT sessions: Cannot revoke without server-side blocklist, defeating purpose. Rejected.

## 2. API Key Authentication for Builders

**Decision**: SHA-256 hashed keys, preHandler hook, in-memory LRU cache

**Rationale**:
- Key generation: `crypto.randomBytes(32).toString('hex')` prefixed with `ba_sk_` (256-bit entropy).
- SHA-256 hash stored in DB (no salt needed — high-entropy keys are immune to dictionary attacks). Much faster than bcrypt/argon2 which are designed for low-entropy passwords.
- Lookup: hash incoming key, query by indexed `key_hash` column, cache in LRU (30s TTL).
- Revocation: `revoked_at` timestamp. Cache TTL provides near-immediate rejection.
- Rate limiting: in-memory fixed-window counter, 100 req/min per key hash. Applied after auth (invalid keys get 401, not 429).

**Alternatives considered**:
- bcrypt/argon2: Too slow for per-request verification. Rejected.
- Separate key ID + secret: Unnecessary complexity for MVP. Rejected.
- Redis for rate limiting: Not needed at initial scale. Rejected.

## 3. Enum Strategy

**Decision**: CHECK constraints on TEXT columns (not PostgreSQL CREATE TYPE ENUM)

**Rationale**:
- Adding/removing values is a simple ALTER TABLE constraint change — fully transactional and rollback-safe.
- PostgreSQL ENUMs cannot remove values and ADD VALUE cannot run in transactions (pre-12). Migration nightmare.
- Same data integrity guarantee at the database level.
- No meaningful performance difference for short string values.

## 4. Test Case Steps Storage

**Decision**: JSONB column on test_cases table (not a normalized test_case_steps table)

**Rationale**:
- Steps are a document — always read/written as a unit, no identity outside their parent.
- JSONB arrays preserve insertion order natively (no sort_order column needed).
- Atomic writes — single UPDATE, single lock.
- Schema flexibility — different step types can have different shapes.
- Step results remain normalized (separate table) because they are independently written by testers.

## 5. Row-Level Security Architecture

**Decision**: Session variables (`SET LOCAL app.current_builder_id`) with per-table RLS policies

**Rationale**:
- `SET LOCAL` scopes to the current transaction — safe with connection pooling.
- Two context variables: `app.current_builder_id` (builders) and `app.current_tester_id` (testers).
- Application connects as non-superuser role (superusers bypass RLS).
- Separate USING (read) and WITH CHECK (write) clauses prevent cross-tenant data insertion.
- `FORCE ROW LEVEL SECURITY` on all tables so even table owners are subject to policies.

## 6. Auto-Managed Timestamps

**Decision**: Shared BEFORE UPDATE trigger function using `now()`

**Rationale**:
- `now()` returns transaction start time — all rows in same transaction get same timestamp (consistent).
- BEFORE UPDATE (not AFTER) — modifies row in-place, single write.
- Single shared function, one trigger per table.
- `created_at` set at INSERT via DEFAULT, never modified.

## 7. Index Strategy

**Decision**: Targeted B-tree indexes for dominant access patterns, partial indexes for skewed distributions

**Key indexes**:
- `test_cases (builder_id)` — dashboard queries + RLS
- `test_cases (builder_id, status)` — filtered dashboard
- `test_cases (status) WHERE status IN ('queued', 'assigned', 'in_progress')` — active tests partial index
- `testers (region, is_available) WHERE is_available = true` — matchmaking
- `testers USING GIN (skills)` — skill containment queries
- `step_results (test_case_id)` — test detail view
- `transactions (builder_id, created_at DESC)` — transaction history
- `api_keys (key_hash)` — UNIQUE, auth lookup

## 8. Session Security

**Decision**: httpOnly + secure + sameSite=Lax + signed cookies with 7-day expiry

**Rationale**:
- httpOnly prevents XSS-based session theft.
- sameSite=Lax (not Strict) because OAuth callback is a cross-origin redirect.
- 7-day maxAge balances convenience vs security for tester sessions.
- preHandler checks `is_active` on every request to handle mid-session deactivation.
