# Implementation Plan: Webhook Delivery

**Branch**: `005-webhook-delivery` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-webhook-delivery/spec.md`

## Summary

Implement webhook delivery for BlendedAgents: when a test case completes, assemble structured results (including a machine-generated summary with confidence scoring), sign the payload with HMAC-SHA256, and POST it to the builder's configured webhook URL. Failed deliveries are retried with exponential backoff via pg-boss. Builders can configure their webhook endpoint, send test pings, and view delivery history through REST API endpoints.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 20 LTS)
**Primary Dependencies**: Fastify (web framework), postgres.js (PostgreSQL driver), pg-boss (job queue), vitest (testing)
**Storage**: PostgreSQL 15+ via Supabase (webhook_deliveries table, builder webhook fields already exist)
**Testing**: vitest + Fastify inject() for contract tests, real PostgreSQL for integration tests
**Target Platform**: Linux server (containerized)
**Project Type**: web-service (monolith)
**Performance Goals**: Webhook delivery within 5s of test completion, <200ms p95 for webhook config API
**Constraints**: HMAC-SHA256 signing required, 3 retries max with exponential backoff, no sensitive data in payloads
**Scale/Scope**: Initial launch scale; single PostgreSQL instance, pg-boss for job scheduling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Contract-First | PASS | Webhook payload format and API contracts defined in `/contracts/webhook-api.md` before implementation. |
| II. Test-First | PASS | TDD mandatory. Unit tests for signing + summary, integration tests for delivery flow. |
| III. Structured I/O | PASS | Webhook payload is structured JSON. All API endpoints accept/return JSON with structured errors. |
| IV. Managed Quality | PASS | Platform controls webhook delivery, retry logic, and summary generation. |
| V. Simplicity | PASS | Uses existing pg-boss for retries (no new infrastructure). Node.js crypto for HMAC (no external libs). Single service file for delivery logic. |

**Post-Phase 1 Re-check**: All gates remain PASS. No new abstractions beyond what exists. Reuses existing models and job infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/005-webhook-delivery/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── webhook-api.md   # Webhook payload + config API contracts
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── migrations/
│   └── 013-machine-summary.sql     # ALTER TABLE for machine_summary column
├── lib/
│   └── webhook-signing.ts          # HMAC-SHA256 sign/verify utilities
├── services/
│   ├── summary.service.ts          # Machine summary generator
│   └── webhook.service.ts          # Webhook assembly, delivery, retry
└── api/
    └── webhook.routes.ts           # PUT/POST/GET webhook config endpoints

tests/
├── unit/
│   ├── webhook-signing.test.ts     # HMAC signing determinism + verification
│   └── machine-summary.test.ts     # Confidence scoring edge cases
├── contract/
│   └── webhook.test.ts             # Response shape validation for webhook endpoints
└── integration/
    ├── webhook-delivery.test.ts    # End-to-end delivery + retry flow
    └── machine-summary.test.ts     # Summary generation with various step outcomes
```

**Structure Decision**: Single project structure matching existing codebase layout. New files integrate into existing `src/services/`, `src/lib/`, `src/api/`, and `tests/` directories.
