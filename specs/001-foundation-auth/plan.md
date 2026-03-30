# Implementation Plan: Foundation & Auth

**Branch**: `001-foundation-auth` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-foundation-auth/spec.md`

## Summary

Scaffold the BlendedAgents platform with all 8 core database tables, row-level security, API key authentication for builders, and social login (Google OAuth2) for testers. This is the foundational feature that every other feature depends on — no API endpoint, test submission, or billing can function without the data layer and auth system.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify, postgres.js, @fastify/oauth2, @fastify/session, @fastify/cookie, @fastify/cors, @fastify/rate-limit, connect-pg-simple, vitest
**Storage**: PostgreSQL 15+ (RLS, UUID, CHECK constraints, JSONB)
**Testing**: vitest + Fastify inject() for integration tests, real PostgreSQL for all DB tests
**Target Platform**: Linux server (containerized)
**Project Type**: web-service (monolith)
**Performance Goals**: <200ms p95 for authenticated API requests, <5s tester social login flow, <10s app startup
**Constraints**: Row-level security enforced at DB level, API keys hashed with SHA-256, sessions stored in PostgreSQL
**Scale/Scope**: Initial launch scale; single PostgreSQL instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Contract-First | PASS | API contracts for auth endpoints defined in `/contracts/` before implementation. |
| II. Test-First | PASS | TDD mandatory. Integration tests hit real PostgreSQL. Mocks only for Google OAuth (third-party). |
| III. Structured I/O | PASS | All endpoints return JSON. All errors use structured format (code + message + context). |
| IV. Managed Quality | PASS | Testers are pre-vetted; only existing testers can authenticate. No self-signup. |
| V. Simplicity | PASS | Single monolith, postgres.js (no ORM), in-memory rate limiting, Google as sole OAuth provider for MVP. |

**Post-Phase 1 Re-check**: All gates remain PASS. Schema uses CHECK constraints (not PostgreSQL ENUMs) for migration safety. JSONB for test case steps (document model, not over-normalized). Server-side sessions in PostgreSQL (no Redis).

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auth-api.md      # Builder auth + tester auth endpoints
│   └── health-api.md    # Health check endpoint
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── builder.ts          # Builder entity & API key lookup
│   ├── tester.ts           # Tester entity & session lookup
│   ├── test-case.ts        # Test case entity (JSONB steps)
│   ├── test-template.ts    # Reusable test template entity
│   ├── step-result.ts      # Per-step test result entity
│   ├── test-result.ts      # Aggregate test result entity
│   ├── transaction.ts      # Financial ledger entity
│   └── webhook-delivery.ts # Webhook audit entity
├── services/
│   ├── auth.service.ts     # API key hashing, verification, builder lookup
│   └── session.service.ts  # Tester session management
├── api/
│   ├── auth.routes.ts      # Google OAuth routes (login, callback)
│   └── health.routes.ts    # Health check endpoint
├── middleware/
│   ├── builder-auth.ts     # preHandler hook for API key auth
│   └── tester-auth.ts      # preHandler hook for session auth
├── lib/
│   ├── db.ts               # postgres.js connection setup
│   ├── errors.ts           # Structured error utility
│   └── api-key.ts          # Key generation & hashing utilities
└── migrations/
    ├── 001-enums.sql        # CHECK constraint type definitions
    ├── 002-builders.sql     # Builders table with API key storage
    ├── 003-testers.sql      # Testers table with profile fields
    ├── 004-test-templates.sql
    ├── 005-test-cases.sql   # Test cases with JSONB steps
    ├── 006-step-results.sql
    ├── 007-test-results.sql
    ├── 008-transactions.sql
    ├── 009-webhook-deliveries.sql
    ├── 010-rls-policies.sql # Row-level security for all tables
    ├── 011-sessions.sql     # Session storage table
    └── seed.sql             # Dev seed data

tests/
├── integration/
│   ├── schema.test.ts          # Table existence, constraints, RLS
│   ├── builder-auth.test.ts    # API key auth flow
│   ├── tester-auth.test.ts     # Social login flow
│   ├── rate-limiting.test.ts   # Rate limit enforcement
│   └── rls.test.ts             # Cross-tenant isolation
├── contract/
│   ├── health.test.ts          # Health endpoint contract
│   └── auth-errors.test.ts     # Error response shapes
└── unit/
    ├── api-key.test.ts         # Key generation & hashing
    └── errors.test.ts          # Error formatting
```

**Structure Decision**: Single-project monolith. All 8 entity models in `src/models/`, auth logic in `src/middleware/` and `src/services/`, routes in `src/api/`. This feature creates the project structure that all subsequent features build on.

## Complexity Tracking

> No constitution violations to justify. All gates pass.
