# Tasks: Credit System & Billing

**Input**: Design documents from `/specs/006-credit-billing/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — Constitution Principle II (Test-First) is NON-NEGOTIABLE.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and TypeScript/Fastify scaffolding

- [x] T001 Initialize TypeScript project with package.json, tsconfig.json, and Fastify + postgres.js + stripe + vitest dependencies
- [x] T002 [P] Configure ESLint and Prettier for TypeScript in .eslintrc.js and .prettierrc
- [x] T003 [P] Create database connection module with postgres.js in src/lib/db.ts
- [x] T004 [P] Create Stripe client module in src/lib/stripe.ts with signature verification helper
- [x] T005 [P] Create structured error response utility in src/lib/errors.ts (code + message + context format per constitution)
- [x] T006 Create Fastify server entry point with plugin registration in src/server.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core infrastructure that MUST be complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create database migration for credit_balances table with CHECK constraints (available_credits >= 0, reserved_credits >= 0) and UNIQUE on builder_id in src/migrations/001-credit-balances.sql
- [x] T008 [P] Create database migration for transactions table with immutability trigger (reject UPDATE/DELETE), partial unique indexes on stripe_session_id and idempotency_key, and composite indexes for query patterns in src/migrations/002-transactions.sql
- [x] T009 [P] Create database migration for credit_packs table with UNIQUE on stripe_price_id in src/migrations/003-credit-packs.sql
- [x] T010 [P] Create database migration for credit_rate_config table in src/migrations/004-credit-rate-config.sql
- [x] T011 [P] Create database migration for regional_rates table with CHECK constraint (base_pay_cents BETWEEN min_base_cents AND max_base_cents) in src/migrations/005-regional-rates.sql
- [x] T012 [P] Create database migration for tester_payout_records table with status enum constraint and indexes in src/migrations/006-tester-payout-records.sql
- [x] T013 [P] Create database migration to add stripe_customer_id column (UNIQUE, nullable) to builders table in src/migrations/007-builder-stripe-customer.sql
- [x] T014 Create seed data script for credit packs, credit rate config, and regional rates in src/migrations/seed.sql

**Checkpoint**: Foundation ready — all tables exist with constraints, triggers, and indexes. User story implementation can now begin.

---

## Phase 3: User Story 1 — Builder Purchases Credits and Credits Are Consumed Per Test (Priority: P1) MVP

**Goal**: Builders purchase fixed credit packs via Stripe Checkout, credits are reserved at test creation, deducted on completion, and refunded on cancellation. This is the core revenue loop.

**Independent Test**: A builder signs up, purchases a credit pack via Stripe Checkout, creates a test case (credits reserved), test completes (credits deducted), and balance updates correctly throughout. A second builder with insufficient credits is rejected.

### Tests for User Story 1

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T015 [P] [US1] Unit test for credit cost formula (base_cost + steps x cost_per_step) in tests/unit/credit-cost.test.ts
- [x] T016 [P] [US1] Integration test for credit reserve/deduct/refund atomicity with concurrent test creation in tests/integration/credit-operations.test.ts
- [x] T017 [P] [US1] Integration test for Stripe webhook processing and idempotency (duplicate webhook, unmatched builder) in tests/integration/stripe-webhook.test.ts
- [x] T018 [P] [US1] Integration test for topup flow including concurrent purchase prevention (409 Conflict) in tests/integration/topup-flow.test.ts
- [x] T019 [P] [US1] Contract test for GET /api/v1/credits/balance response shape in tests/contract/credits-balance.test.ts
- [x] T020 [P] [US1] Contract test for POST /api/v1/credits/topup request/response and error shapes in tests/contract/credits-topup.test.ts
- [x] T021 [P] [US1] Contract test for GET /api/v1/credits/packs response shape in tests/contract/credits-packs.test.ts

### Implementation for User Story 1

- [x] T022 [P] [US1] Create CreditBalance model with SELECT FOR UPDATE query, reserve, deduct, refund, and topup operations in src/models/credit-balance.ts
- [x] T023 [P] [US1] Create Transaction model with insert (respecting immutability), query by builder with keyset pagination, and stripe_session_id lookup in src/models/transaction.ts
- [x] T024 [P] [US1] Create CreditPack model with list active packs and find by ID in src/models/credit-pack.ts
- [x] T025 [P] [US1] Create CreditRateConfig model with get current rate query in src/models/credit-rate-config.ts
- [x] T026 [US1] Implement CreditService with reserve, deduct, refund methods using SELECT FOR UPDATE and atomic transactions (single DB transaction for balance update + ledger insert) in src/services/credit.service.ts
- [x] T027 [US1] Implement StripeService with createCheckoutSession (lazy Stripe customer creation, pending purchase record, pack metadata), and processWebhook (signature verification, idempotent credit grant, unmatched builder logging) in src/services/stripe.service.ts
- [x] T028 [US1] Implement GET /api/v1/credits/balance endpoint returning available, reserved, total used, and per-credit rate in src/api/credits.routes.ts
- [x] T029 [US1] Implement POST /api/v1/credits/topup endpoint with pack_id validation, 409 on pending purchase, returns Stripe Checkout URL in src/api/credits.routes.ts
- [x] T030 [US1] Implement GET /api/v1/credits/packs endpoint returning active credit packs in src/api/credits.routes.ts
- [x] T031 [US1] Implement POST /webhooks/stripe endpoint with raw body preservation, signature verification, and event routing in src/api/stripe-webhook.routes.ts
- [x] T032 [US1] Wire credit reservation into test creation flow — reject with insufficient credits error (FR-005) and reserve credits atomically on success in src/services/credit.service.ts

**Checkpoint**: Builder can purchase credits via Stripe, credits appear in balance, test creation reserves credits, completion deducts, cancellation refunds. Concurrent operations and duplicate webhooks handled safely.

---

## Phase 4: User Story 2 — Tester Earnings Tracking and Payout Recording (Priority: P2)

**Goal**: When a test completes, the tester earns a payout based on admin-configured regional rate, platform commission is captured, and earnings are aggregated for weekly payout processing.

**Independent Test**: Complete a test as a tester in the Egypt pool, verify earnings match the admin-configured base + step bonus, confirm 3 transaction records are created (charge + payout + commission), and verify weekly payout aggregation marks earnings as pending.

### Tests for User Story 2

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T033 [P] [US2] Unit test for payout calculation (admin_configured_base + steps x admin_configured_step_rate) per region in tests/unit/payout-rate.test.ts
- [x] T034 [P] [US2] Unit test for commission calculation (builder currency charge - tester payout) in tests/unit/commission.test.ts
- [x] T035 [P] [US2] Integration test for test completion producing exactly 3 transactions (charge + payout + commission) atomically in tests/integration/test-completion.test.ts
- [x] T036 [P] [US2] Integration test for weekly payout cycle aggregation (unpaid → pending) in tests/integration/payout-cycle.test.ts
- [x] T037 [P] [US2] Integration test for rate locking at test assignment time (rate change after assignment does not affect payout) in tests/integration/rate-locking.test.ts

### Implementation for User Story 2

- [x] T038 [P] [US2] Create RegionalRate model with get rate by region and get rate by ID in src/models/regional-rate.ts
- [x] T039 [P] [US2] Create TesterPayoutRecord model with create, aggregate unpaid by tester, and update status in src/models/tester-payout.ts
- [x] T040 [US2] Implement PayoutService with calculatePayout (base + steps x rate using locked-in rate from assignment) in src/services/payout.service.ts
- [x] T041 [US2] Implement CommissionService with calculateCommission (builder credit charge in currency - tester payout) in src/services/commission.service.ts
- [x] T042 [US2] Implement test completion handler that atomically creates 3 transactions (charge, payout, commission) with deterministic lock ordering, deducts reserved credits, and records tester earnings in src/services/credit.service.ts
- [x] T043 [US2] Implement weekly payout aggregation job using pg-boss — aggregates unpaid payout transactions per tester into TesterPayoutRecord with status 'pending' in src/services/payout.service.ts
- [x] T044 [US2] Register pg-boss scheduled job for weekly payout cycle in src/server.ts

**Checkpoint**: Test completion creates charge + payout + commission atomically. Tester earnings match regional rate locked at assignment. Weekly job aggregates unpaid earnings into payout records.

---

## Phase 5: User Story 3 — Builder Views Credit Balance and Transaction History (Priority: P3)

**Goal**: Builders can view their credit balance and browse their transaction history with type filtering and keyset pagination.

**Independent Test**: A builder queries their balance (sees available, reserved, total used, per-credit rate), views paginated transaction history, filters by type "charge" and sees only charge transactions.

### Tests for User Story 3

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T045 [P] [US3] Contract test for GET /api/v1/credits/transactions with type filter and pagination in tests/contract/credits-transactions.test.ts
- [x] T046 [P] [US3] Integration test for transaction history pagination (keyset cursor, 20 per page) with 50+ transactions in tests/integration/transaction-queries.test.ts
- [x] T047 [P] [US3] Integration test for transaction type filtering (only returns matching type) in tests/integration/transaction-queries.test.ts

### Implementation for User Story 3

- [x] T048 [US3] Implement GET /api/v1/credits/transactions endpoint with type filter validation, keyset pagination (cursor + limit), and structured error for invalid filters in src/api/credits.routes.ts
- [x] T049 [US3] Add transaction query methods to Transaction model — filterByType, keyset pagination with cursor, count by type in src/models/transaction.ts
- [x] T050 [US3] Add RLS enforcement to credits routes — builders can only see their own balance and transactions (verify builder_id matches authenticated user) in src/api/credits.routes.ts

**Checkpoint**: Builder can view balance summary, browse paginated transaction history, and filter by type. All data is scoped to the authenticated builder.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconciliation, security hardening, and validation across all stories

- [x] T051 [P] Implement ledger reconciliation job — verify materialized balance matches SUM of ledger entries, log discrepancies in src/services/reconciliation.service.ts
- [x] T052 [P] Add input validation schemas (JSON Schema) for all credit endpoints in src/api/credits.routes.ts
- [x] T053 [P] Add rate limiting to credit endpoints using Fastify rate-limit plugin (100 req/min per API key from 001-foundation-auth) in src/server.ts
- [x] T054 Run quickstart.md validation — verify end-to-end flow with Stripe test mode, seed data, and all acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 (needs credit deduction from US1 to trigger payout)
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 (needs transactions to exist for querying)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all stories)
    ↓
Phase 3: US1 — Purchase + Reserve/Deduct/Refund (MVP)
    ↓
Phase 4: US2 — Tester Payouts + Commission (depends on US1 deduction)
    ↓ (can start after US1, independent of US2)
Phase 5: US3 — Balance + Transaction History (depends on US1 for data)
    ↓
Phase 6: Polish
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Models before services
3. Services before endpoints/routes
4. Core implementation before integration points
5. Commit after each task or logical group

### Parallel Opportunities

**Phase 1**: T002, T003, T004, T005 can all run in parallel after T001
**Phase 2**: T008–T013 can all run in parallel after T007
**Phase 3 (US1)**: T015–T021 (all tests) in parallel; T022–T025 (all models) in parallel
**Phase 4 (US2)**: T033–T037 (all tests) in parallel; T038–T039 (models) in parallel
**Phase 5 (US3)**: T045–T047 (all tests) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together (write first, must fail):
Task: "T015 Unit test for credit cost formula in tests/unit/credit-cost.test.ts"
Task: "T016 Integration test for credit atomicity in tests/integration/credit-operations.test.ts"
Task: "T017 Integration test for Stripe webhooks in tests/integration/stripe-webhook.test.ts"
Task: "T018 Integration test for topup flow in tests/integration/topup-flow.test.ts"
Task: "T019 Contract test for balance endpoint in tests/contract/credits-balance.test.ts"
Task: "T020 Contract test for topup endpoint in tests/contract/credits-topup.test.ts"
Task: "T021 Contract test for packs endpoint in tests/contract/credits-packs.test.ts"

# Then launch all models for US1 together:
Task: "T022 CreditBalance model in src/models/credit-balance.ts"
Task: "T023 Transaction model in src/models/transaction.ts"
Task: "T024 CreditPack model in src/models/credit-pack.ts"
Task: "T025 CreditRateConfig model in src/models/credit-rate-config.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently — builder can purchase credits, create a test (reserve), complete (deduct), cancel (refund), and view balance
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (adds tester payouts)
4. Add User Story 3 → Test independently → Deploy/Demo (adds transaction browsing)
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable (after its dependencies)
- Tests are written FIRST and must FAIL before implementation (Constitution Principle II)
- Mocks are only used for Stripe API (third-party); integration tests hit real PostgreSQL
- Commit after each task or logical group
- All credit amounts are integers (cents for currency, whole numbers for credits)
- Transaction ledger is append-only — no UPDATE/DELETE in application code
