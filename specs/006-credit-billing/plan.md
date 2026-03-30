# Implementation Plan: Credit System & Billing

**Branch**: `006-credit-billing` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-credit-billing/spec.md`

## Summary

Implement the core credit billing system for BlendedAgents: builders purchase fixed credit packs via Stripe Checkout, credits are reserved at test creation and deducted on completion, testers earn payouts based on admin-configured regional rates, and platform commission is captured as the difference. Uses a materialized balance with an append-only transaction ledger and PostgreSQL row-level locking for atomic credit operations.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify (web framework), postgres.js (PostgreSQL driver), Stripe SDK, @modelcontextprotocol/sdk, vitest (testing)
**Storage**: PostgreSQL 15+ (RLS, UUID, CHECK constraints, SELECT FOR UPDATE)
**Testing**: vitest + Fastify inject() for integration tests, real PostgreSQL for all DB tests
**Target Platform**: Linux server (containerized)
**Project Type**: web-service (monolith)
**Performance Goals**: <500ms for balance/transaction queries (10k txns), <200ms p95 for authenticated API requests
**Constraints**: Atomic credit operations, append-only ledger, no negative balances under concurrency
**Scale/Scope**: Initial launch scale; single PostgreSQL instance, no sharding required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Contract-First | PASS | API contracts defined in `/contracts/` before implementation. Stripe webhook contract documented. |
| II. Test-First | PASS | TDD mandatory. Integration tests hit real PostgreSQL. Mocks only for Stripe API (third-party). |
| III. Structured I/O | PASS | All endpoints accept/return JSON. Errors use structured format (code + message + context). |
| IV. Managed Quality | PASS | Pricing is platform-controlled, admin-configured. No marketplace dynamics. Tester rates set by admins within boundaries. |
| V. Simplicity | PASS | Single rate (no plans/tiers), fixed credit packs, monolith architecture, postgres.js (no ORM), PostgreSQL for job queue (pg-boss). No Redis, no microservices, no feature flags. |

**Post-Phase 1 Re-check**: All gates remain PASS. Data model uses direct SQL (no ORM abstraction). Single database transaction for multi-entry operations (no distributed sagas).

## Project Structure

### Documentation (this feature)

```text
specs/006-credit-billing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── credits-api.md   # Builder-facing credit endpoints
│   └── stripe-webhooks.md # Stripe webhook handling contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── credit-balance.ts       # Credit balance entity & queries
│   ├── transaction.ts          # Transaction ledger entity & queries
│   ├── credit-pack.ts          # Credit pack configuration entity
│   ├── regional-rate.ts        # Regional rate configuration entity
│   └── tester-payout.ts        # Tester payout record entity
├── services/
│   ├── credit.service.ts       # Reserve, deduct, refund, topup logic
│   ├── stripe.service.ts       # Stripe Checkout session creation
│   ├── payout.service.ts       # Tester payout calculation & aggregation
│   └── commission.service.ts   # Platform commission calculation
├── api/
│   ├── credits.routes.ts       # GET /credits/balance, GET /credits/transactions, POST /credits/topup
│   └── stripe-webhook.routes.ts # POST /webhooks/stripe
└── lib/
    └── db.ts                   # postgres.js connection setup

tests/
├── integration/
│   ├── credit-operations.test.ts  # Reserve/deduct/refund atomicity
│   ├── stripe-webhook.test.ts     # Webhook processing & idempotency
│   ├── payout-cycle.test.ts       # Weekly payout aggregation
│   └── transaction-queries.test.ts # Pagination, filtering
└── unit/
    ├── credit-cost.test.ts        # Cost formula calculation
    ├── commission.test.ts         # Commission calculation
    └── payout-rate.test.ts        # Regional rate payout calculation
```

**Structure Decision**: Single-project monolith (Option 1). All billing logic lives in `src/` with models, services, and API routes. No frontend in this feature — billing is API-only for MVP. Testing follows the constitution: integration tests hit real PostgreSQL, unit tests for pure business logic.

## Complexity Tracking

> No constitution violations to justify. All gates pass.
